from supabase._async.client import AsyncClient
import asyncio
import json
from postgrest.exceptions import APIError
from httpx import HTTPStatusError
from logger import logger

def mask_name(name: str) -> str:
    if len(name) <= 1:
        return name
    return name[0] + "*" + name[2:] if len(name) > 2 else name[0] + "*"

async def create_audit_log(db: AsyncClient, actor_type: str, action: str, target_id: str, ip_address: str = "0.0.0.0"):
    if db:
        try:
            await db.table("audit_logs").insert({
                "actor_type": actor_type,
                "action": action,
                "target_id": target_id,
                "ip_address": ip_address
            }).execute()
        except Exception as e:
            logger.warning(f"Audit log failed: {str(e)}")
            pass # Audit logs should not crash the main flow

async def execute_with_retry_async(query_builder):
    """
    Executes a Supabase (Postgrest) async query with a retry policy.

    Retry Policy:
    - Max Retries: 3
    - Retryable Errors:
        - 5xx Server Errors (HTTP and APIError codes)
        - 429 Too Many Requests
        - Network/Connection errors
    - Non-retryable Errors:
        - 4xx Client Errors (except 429)
    - Backoff: Exponential wait (0.5s * attempt)
    """
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            return await query_builder.execute()
        except Exception as e:
            # Check for non-retryable errors first
            if isinstance(e, APIError):
                # APIError.code could be a string status (e.g., "503") or a Postgres error code (e.g., "23505")
                is_retryable = False
                try:
                    code_int = int(e.code)
                    # Retry on 5xx Server Errors and 429 Too Many Requests
                    if (500 <= code_int < 600) or (code_int == 429):
                        is_retryable = True
                except (ValueError, TypeError):
                    pass

                if not is_retryable:
                    logger.error(f"DB API Error (Non-retryable): {str(e)}")
                    raise e
                else:
                    logger.warning(f"DB API Error (Retryable): {str(e)}. Retrying...")

            if isinstance(e, HTTPStatusError):
                status = e.response.status_code
                # Fail on 4xx Client Errors, except 429 (Too Many Requests)
                if 400 <= status < 500 and status != 429:
                    logger.error(f"DB HTTP Client Error (Non-retryable): {str(e)}")
                    raise e

            # Retryable errors (5xx, Network, etc.)
            if attempt == max_retries - 1:
                logger.critical(f"DB Async Execute failed after {max_retries} attempts: {str(e)}")
                raise e
            logger.warning(f"DB async execute attempt {attempt+1} failed: {str(e)}. Retrying...")
            await asyncio.sleep(0.5 * (attempt + 1))

async def broadcast_to_station_and_patient(manager, message_dict: dict, token: str = None):
    """
    Helper to broadcast a message to both the STATION and a specific patient token.
    Ensures consistent string casting for tokens and JSON serialization.
    """
    try:
        msg_str = json.dumps(message_dict)
        # 1. Broadcast to STATION
        await manager.broadcast(msg_str, "STATION")
        # 2. Broadcast to specific Patient (if token exists)
        if token:
            await manager.broadcast(msg_str, str(token))
    except Exception as e:
        logger.error(f"Broadcast helper failed: {e}")

def is_pgrst204_error(e: Exception) -> bool:
    """
    Checks if the exception is a Postgrest PGRST204 error (missing column or schema cache issue).
    Useful for handling environments with stale schema caches.
    """
    if isinstance(e, APIError):
        # Check both the code and the message for robustness
        if (hasattr(e, 'code') and e.code == 'PGRST204') or "schema cache" in str(e).lower():
            return True
    return False
