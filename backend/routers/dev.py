from fastapi import APIRouter, Depends, HTTPException
from supabase._async.client import AsyncClient
from dependencies import get_supabase
from utils import execute_with_retry_async

router = APIRouter()

@router.post("/discharge-all")
async def discharge_all(db: AsyncClient = Depends(get_supabase)):
    """
    Developer tool: Discharge all active patients.
    Sets status to 'DISCHARGED' and discharged_at to now for all IN_PROGRESS/OBSERVATION.
    """
    from datetime import datetime
    
    now = datetime.now().isoformat()
    
    # 1. Update all functionality
    res = await execute_with_retry_async(
        db.table("admissions")
        .update({"status": "DISCHARGED", "discharged_at": now})
        .in_("status", ["IN_PROGRESS", "OBSERVATION"])
        .neq("id", "00000000-0000-0000-0000-000000000000") # Safety check
    )
    
    return {"count": len(res.data) if res.data else 0, "message": "All active patients discharged."}
