from fastapi import APIRouter, Depends
from supabase._async.client import AsyncClient
import json

from dependencies import get_supabase
from utils import execute_with_retry_async, create_audit_log
from models import VitalSign, VitalSignCreate
from websocket_manager import manager

router = APIRouter()

@router.post("", response_model=VitalSign)
async def record_vital(vital: VitalSignCreate, db: AsyncClient = Depends(get_supabase)):
    data = vital.dict()
    response = await execute_with_retry_async(db.table("vital_signs").insert(data))
    new_vital = response.data[0]

    await create_audit_log(db, "NURSE", "CREATE_VITAL", str(new_vital['id']))

    # Broadcast to dashboard
    adm_response = await execute_with_retry_async(db.table("admissions").select("access_token").eq("id", vital.admission_id))
    if adm_response.data:
        token = adm_response.data[0]['access_token']
        message = {
            "type": "NEW_VITAL",
            "data": new_vital
        }
        await manager.broadcast(json.dumps(message), token)

    return new_vital
