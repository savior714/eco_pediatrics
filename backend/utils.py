from supabase._async.client import AsyncClient
import asyncio
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
    Supabase (Async) 쿼리 실행 시 재시도 로직 적용
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
