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
                logger.error(f"DB API Error (Non-retryable): {str(e)}")
                raise e
            if isinstance(e, HTTPStatusError) and 400 <= e.response.status_code < 500:
                logger.error(f"DB HTTP Client Error (Non-retryable): {str(e)}")
                raise e

            # Retryable errors (5xx, Network, etc.)
            if attempt == max_retries - 1:
                logger.critical(f"DB Async Execute failed after {max_retries} attempts: {str(e)}")
                raise e
            logger.warning(f"DB async execute attempt {attempt+1} failed: {str(e)}. Retrying...")
            await asyncio.sleep(0.5 * (attempt + 1))
