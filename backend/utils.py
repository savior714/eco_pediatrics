from supabase._async.client import AsyncClient
import asyncio
import json
import random
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
            await db.rpc("log_audit_activity", {
                "p_actor_type": actor_type,
                "p_action": action,
                "p_target_id": target_id,
                "p_ip_address": ip_address
            }).execute()
        except Exception as e:
            logger.warning(f"Audit log failed: {str(e)}")
            pass # Audit logs should not crash the main flow

async def execute_with_retry_async(query_builder):
    """
    Executes a Supabase (Postgrest) async query with a standardized retry policy.

    Retry Policy:
    - Max Retries: 3
    - Retryable Errors:
        - 5xx Server Errors (HTTP and APIError codes)
        - 429 Too Many Requests
    - Fail-fast Errors:
        - 4xx Client Errors (except 429)
    - Backoff: Exponential with jitter (base 0.5s, cap 3s)
    """
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            return await query_builder.execute()
        except Exception as e:
            # Categorize the error
            is_retryable = False
            error_status = None

            if isinstance(e, APIError):
                try:
                    error_status = int(e.code)
                except (ValueError, TypeError):
                    # For non-numeric codes, only retry if it looks like a server/network error
                    if any(term in str(e).lower() for term in ["network", "timeout", "connection"]):
                        is_retryable = True
            
            elif isinstance(e, HTTPStatusError):
                error_status = e.response.status_code

            # Apply Policy: 429 and 5xx are retryable
            if error_status:
                if (500 <= error_status < 600) or (error_status == 429):
                    is_retryable = True
                elif 400 <= error_status < 500:
                    # Fail-fast on 4xx (Auth, Not Found, etc.)
                    logger.error(f"DB Client Error (Non-retryable {error_status}): {str(e)}")
                    raise e

            # Final check and backoff
            if attempt == max_retries - 1 or not is_retryable:
                if not is_retryable:
                    logger.error(f"DB Error (Fail-fast): {str(e)}")
                else:
                    logger.critical(f"DB failed after {max_retries} attempts: {str(e)}")
                raise e

            # Exponential backoff with small jitter
            wait_time = min(3.0, (0.5 * (2 ** attempt)) + (random.uniform(0, 0.1)))
            logger.warning(f"DB retryable error ({error_status if error_status else 'Network'}). Attempt {attempt+1} failed. Retrying in {wait_time:.1f}s...")
            await asyncio.sleep(wait_time)

async def broadcast_to_station_and_patient(manager, message_dict: dict, token: str = None):
    """
    Helper to broadcast a message to both the STATION and a specific patient token.
    Ensures consistent string casting for tokens and JSON serialization.
    """
    try:
        msg_str = json.dumps(message_dict)
        # Parallel: Broadcast to STATION and Patient
        tasks = [manager.broadcast(msg_str, "STATION")]
        if token:
            tasks.append(manager.broadcast(msg_str, str(token)))
        
        await asyncio.gather(*tasks)
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
