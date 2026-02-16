from fastapi import APIRouter, Depends, HTTPException, Query
from supabase._async.client import AsyncClient
from postgrest.exceptions import APIError
from typing import List
from datetime import date
import json
from websocket_manager import manager
from logger import get_logger
from models import MealRequest, MealRequestCreate

from dependencies import get_supabase
from utils import execute_with_retry_async, broadcast_to_station_and_patient, is_pgrst204_error
from schemas import CommonMealPlan, PatientMealOverride, PatientMealOverrideCreate

router = APIRouter()

# 1. Common Meal Plans (Hospital Menu)

@router.get("/plans", response_model=List[CommonMealPlan])
async def get_meal_plans(
    start_date: date,
    end_date: date,
    db: AsyncClient = Depends(get_supabase)
):
    res = await execute_with_retry_async(
        db.table("common_meal_plans")
        .select("*")
        .gte("date", start_date.isoformat())
        .lte("date", end_date.isoformat())
        .order("date")
    )
    return res.data or []

@router.post("/plans", status_code=204)
async def upsert_meal_plans(
    plans: List[CommonMealPlan],
    db: AsyncClient = Depends(get_supabase)
):
    if not plans:
        return
    
    # Bulk upsert
    data = [plan.model_dump(mode='json') for plan in plans]
    await execute_with_retry_async(
        db.table("common_meal_plans").upsert(data)
    )
    return

# 2. Patient Meal Overrides (Exceptions)

@router.get("/overrides/{admission_id}", response_model=List[PatientMealOverride])
async def get_patient_overrides(
    admission_id: str,
    db: AsyncClient = Depends(get_supabase)
):
    res = await execute_with_retry_async(
        db.table("patient_meal_overrides")
        .select("*")
        .eq("admission_id", admission_id)
        .order("date")
    )
    return res.data or []

@router.post("/overrides", status_code=204)
async def upsert_patient_override(
    override: PatientMealOverrideCreate,
    db: AsyncClient = Depends(get_supabase)
):
    data = override.model_dump(mode='json')
    # Upsert based on unique constraint (admission_id, date, meal_time)
    await execute_with_retry_async(
        db.table("patient_meal_overrides").upsert(data, on_conflict="admission_id,date,meal_time")
    )
    return

# 3. Station Meal Requests (Spreadsheet)

@router.post("/requests", status_code=204)
async def upsert_meal_request(
    req: MealRequestCreate,
    db: AsyncClient = Depends(get_supabase)
):
    # Fetch current record to preserve existing plan if needed
    current_res = await execute_with_retry_async(
        db.table("meal_requests")
        .select("*")
        .eq("admission_id", req.admission_id)
        .eq("meal_date", req.meal_date.isoformat())
        .eq("meal_time", req.meal_time.value)
    )
    current_data = current_res.data[0] if current_res and current_res.data else None

    # Sync fields based on request_type
    data = req.model_dump(mode='json')
    
    if req.request_type == 'STATION_UPDATE':
        # Nurse is directly updating the plan
        data['status'] = 'APPROVED'
        data['requested_pediatric_meal_type'] = None
        data['requested_guardian_meal_type'] = None
    else:
        # Patient is requesting - keep current plan as is
        if current_data:
            data['pediatric_meal_type'] = current_data.get('pediatric_meal_type')
            data['guardian_meal_type'] = current_data.get('guardian_meal_type')
        else:
            data['pediatric_meal_type'] = None
            data['guardian_meal_type'] = None
        
        data['requested_pediatric_meal_type'] = req.pediatric_meal_type
        data['requested_guardian_meal_type'] = req.guardian_meal_type
        data['status'] = 'PENDING'

    # Upsert with the updated logic
    try:
        await execute_with_retry_async(
            db.table("meal_requests").upsert(data, on_conflict="admission_id,meal_date,meal_time")
        )
    except Exception as e:
        # Fallback for missing schema migration (PGRST204)
        if is_pgrst204_error(e):
            get_logger().warning("Schema mismatch detected: 'requested_*_meal_type' columns missing. Retrying upsert without them. Please apply migration 004.")

            # Remove problematic fields
            data.pop('requested_pediatric_meal_type', None)
            data.pop('requested_guardian_meal_type', None)

            # Retry
            await execute_with_retry_async(
                db.table("meal_requests").upsert(data, on_conflict="admission_id,meal_date,meal_time")
            )
        else:
            raise e

    # 3. Targeted Broadcast with Hardening
    async def prepare_and_broadcast():
        try:
            # Fetch details for targeted broadcast
            adm_res = await execute_with_retry_async(
                db.table("admissions")
                .select("access_token, room_number")
                .eq("id", req.admission_id)
                .single()
            )
            admission_data = adm_res.data if adm_res and adm_res.data else None
            
            if admission_data:
                msg = {
                    "type": "NEW_MEAL_REQUEST",
                    "data": {
                        "room": admission_data.get("room_number"),
                        "admission_id": req.admission_id,
                        "request_type": req.request_type,
                        "meal_date": str(req.meal_date),
                        "meal_time": req.meal_time.value,
                        "pediatric_meal_type": req.pediatric_meal_type,
                        "guardian_meal_type": req.guardian_meal_type
                    }
                }
                token = admission_data.get("access_token")
                await broadcast_to_station_and_patient(manager, msg, token)
        except Exception as e:
            from logger import get_logger
            get_logger().error(f"Failed to broadcast meal request: {e}")

    await prepare_and_broadcast()
    
    return

@router.get("/matrix", response_model=List[MealRequest])
async def get_meal_matrix(
    target_date: date,
    db: AsyncClient = Depends(get_supabase)
):
    # Fetch all meal requests for the given date
    res = await execute_with_retry_async(
        db.table("meal_requests")
        .select("*")
        .eq("meal_date", target_date.isoformat())
    )
    return res.data or []
