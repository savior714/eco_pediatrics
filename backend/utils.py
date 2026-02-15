from supabase._async.client import AsyncClient
import asyncio
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
            # Phase C: Retry Policy Refinement
            # Check for non-retryable client errors (4xx)
            is_client_error = False

            # Check for HTTP status code in response (e.g. httpx.HTTPStatusError)
            if hasattr(e, 'response') and hasattr(e.response, 'status_code'):
                status = e.response.status_code
                # 429 is Too Many Requests (Transient), so we should retry it.
                if 400 <= status < 500 and status != 429:
                    is_client_error = True

            # Check for Postgrest APIError (often deterministic logic errors)
            # If it has a 'code' attribute that looks like a PGRST error or 4xx
            # But exclude 40001 (Serialization Failure) and 40P01 (Deadlock) from client error, as they are retryable
            if hasattr(e, 'code'):
                code_str = str(e.code)
                if (code_str.startswith('PGRST') or code_str.startswith('4')) and code_str not in ['40001', '40P01']:
                    is_client_error = True

            if is_client_error:
                logger.error(f"DB Execute client error (non-retryable): {str(e)}")
                raise e

            if attempt == max_retries - 1:
                logger.critical(f"DB Async Execute failed after {max_retries} attempts: {str(e)}")
                raise e
            logger.warning(f"DB async execute attempt {attempt+1} failed: {str(e)}. Retrying...")
            await asyncio.sleep(0.5 * (attempt + 1))
