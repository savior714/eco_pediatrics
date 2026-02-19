import asyncio
from typing import List
from datetime import date
from supabase._async.client import AsyncClient
from websocket_manager import manager
from logger import get_logger
from utils import execute_with_retry_async, broadcast_to_station_and_patient, is_pgrst204_error
from models import MealRequestCreate
from schemas import CommonMealPlan, PatientMealOverrideCreate
from services.station_service import format_meal_notification_data

async def get_meal_plans(db: AsyncClient, start_date: date, end_date: date):
    res = await execute_with_retry_async(
        db.table("common_meal_plans")
        .select("*")
        .gte("date", start_date.isoformat())
        .lte("date", end_date.isoformat())
        .order("date")
    )
    return res.data or []

async def upsert_meal_plans(db: AsyncClient, plans: List[CommonMealPlan]):
    if not plans: return
    data = [plan.model_dump(mode='json') for plan in plans]
    await execute_with_retry_async(db.table("common_meal_plans").upsert(data))

async def get_patient_overrides(db: AsyncClient, admission_id: str):
    res = await execute_with_retry_async(
        db.table("patient_meal_overrides")
        .select("*")
        .eq("admission_id", admission_id)
        .order("date")
    )
    return res.data or []

async def upsert_patient_override(db: AsyncClient, override: PatientMealOverrideCreate):
    data = override.model_dump(mode='json')
    await execute_with_retry_async(
        db.table("patient_meal_overrides").upsert(data, on_conflict="admission_id,date,meal_time")
    )

async def upsert_meal_request(db: AsyncClient, req: MealRequestCreate):
    # logic for preserving existing plan
    current_res = await execute_with_retry_async(
        db.table("meal_requests")
        .select("*")
        .eq("admission_id", req.admission_id)
        .eq("meal_date", req.meal_date.isoformat())
        .eq("meal_time", req.meal_time.value)
    )
    current_data = current_res.data[0] if current_res and current_res.data else None

    data = req.model_dump(mode='json')
    if req.request_type == 'STATION_UPDATE':
        data['status'] = 'APPROVED'
        data['requested_pediatric_meal_type'] = None
        data['requested_guardian_meal_type'] = None
    else:
        if current_data:
            data['pediatric_meal_type'] = current_data.get('pediatric_meal_type')
            data['guardian_meal_type'] = current_data.get('guardian_meal_type')
        else:
            data['pediatric_meal_type'] = data['guardian_meal_type'] = None
        
        data['requested_pediatric_meal_type'] = req.pediatric_meal_type
        data['requested_guardian_meal_type'] = req.guardian_meal_type
        data['status'] = 'PENDING'

    try:
        upsert_res = await execute_with_retry_async(
            db.table("meal_requests").upsert(data, on_conflict="admission_id,meal_date,meal_time")
        )
        new_req_data = upsert_res.data[0] if upsert_res and upsert_res.data else None
    except Exception as e:
        if is_pgrst204_error(e):
            get_logger().warning("Schema mismatch detected. Retrying without requested_* columns.")
            data.pop('requested_pediatric_meal_type', None)
            data.pop('requested_guardian_meal_type', None)
            upsert_res = await execute_with_retry_async(
                db.table("meal_requests").upsert(data, on_conflict="admission_id,meal_date,meal_time")
            )
            new_req_data = upsert_res.data[0] if upsert_res and upsert_res.data else None
        else:
            raise e

    if new_req_data:
        async def broadcast():
            try:
                adm_res = await execute_with_retry_async(
                    db.table("admissions").select("access_token, room_number").eq("id", req.admission_id).single()
                )
                if adm_res.data:
                    msg = {
                        "type": "NEW_MEAL_REQUEST",
                        "data": {
                            "id": new_req_data['id'],
                            "room": adm_res.data.get("room_number"),
                            "admission_id": req.admission_id,
                            "request_type": req.request_type,
                            "meal_date": req.meal_date.isoformat(),
                            "meal_time": req.meal_time.value,
                            "pediatric_meal_type": new_req_data.get('pediatric_meal_type'),
                            "guardian_meal_type": new_req_data.get('guardian_meal_type'),
                            "requested_pediatric_meal_type": new_req_data.get('requested_pediatric_meal_type'),
                            "requested_guardian_meal_type": new_req_data.get('requested_guardian_meal_type'),
                            "content": f"[{format_meal_notification_data(new_req_data)['date_label']} {format_meal_notification_data(new_req_data)['time_label']}] 식단 신청 ({format_meal_notification_data(new_req_data)['meal_desc']})"
                        }
                    }
                    await broadcast_to_station_and_patient(manager, msg, adm_res.data.get("access_token"))
            except Exception as be:
                get_logger().error(f"Failed broadcast: {be}")
        asyncio.create_task(broadcast())

    return new_req_data

async def get_meal_matrix(db: AsyncClient, target_date: date):
    res = await execute_with_retry_async(
        db.table("meal_requests")
        .select("*")
        .eq("meal_date", target_date.isoformat())
    )
    return res.data or []
