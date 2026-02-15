from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from supabase._async.client import AsyncClient
from typing import List
import json

from dependencies import get_supabase
from utils import execute_with_retry_async, create_audit_log
from models import ExamSchedule, ExamScheduleCreate
from websocket_manager import manager

router = APIRouter()

@router.get("/admissions/{admission_id}/exam-schedules", response_model=List[ExamSchedule])
async def list_exam_schedules(admission_id: str, db: AsyncClient = Depends(get_supabase)):
    response = await execute_with_retry_async(db.table("exam_schedules").select("*").eq("admission_id", admission_id).order("scheduled_at"))
    return response.data or []

@router.post("/exam-schedules", response_model=ExamSchedule)
async def create_exam_schedule(schedule: ExamScheduleCreate, db: AsyncClient = Depends(get_supabase)):
    data = jsonable_encoder(schedule)
    response = await execute_with_retry_async(db.table("exam_schedules").insert(data))
    new_schedule = response.data[0]

    # Broadcast to guardian dashboard & station
    adm_response = await execute_with_retry_async(db.table("admissions").select("access_token, room_number").eq("id", schedule.admission_id))
    if adm_response.data:
        token = adm_response.data[0]['access_token']
        room = adm_response.data[0]['room_number']
        
        message = {
            "type": "NEW_EXAM_SCHEDULE",
            "data": {
                **new_schedule,
                "room": room
            }
        }
        await manager.broadcast(json.dumps(message), token)
        await manager.broadcast(json.dumps(message), "STATION")

    return new_schedule

@router.delete("/exam-schedules/{schedule_id}")
async def delete_exam_schedule(schedule_id: int, db: AsyncClient = Depends(get_supabase)):
    # 1. Get schedule info before deleting (to find admission_id for broadcast)
    res = await execute_with_retry_async(db.table("exam_schedules").select("*").eq("id", schedule_id))
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    target = res.data[0]
    admission_id = target['admission_id']
    
    # 2. Delete
    await execute_with_retry_async(db.table("exam_schedules").delete().eq("id", schedule_id))
    
    # 3. Log
    await create_audit_log(db, "NURSE", "DELETE_EXAM", str(schedule_id))

    # 4. Broadcast removal to guardian dashboard & station
    adm_res = await execute_with_retry_async(db.table("admissions").select("access_token, room_number").eq("id", admission_id))
    if adm_res.data:
        token = adm_res.data[0]['access_token']
        room = adm_res.data[0]['room_number']
        message = {
            "type": "DELETE_EXAM_SCHEDULE",
            "data": {
                "id": schedule_id,
                "admission_id": admission_id,
                "room": room
            }
        }
        await manager.broadcast(json.dumps(message), token)
        await manager.broadcast(json.dumps(message), "STATION")
    
    return {"message": "Deleted successfully"}
