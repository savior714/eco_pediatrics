from fastapi import APIRouter, Depends, HTTPException, Query
from supabase._async.client import AsyncClient
from typing import List
from datetime import datetime, date
import json
from websocket_manager import manager
from models import MealRequest, MealRequestCreate

from dependencies import get_supabase
from utils import execute_with_retry_async
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
    # Upsert based on (admission_id, meal_date, meal_time)
    data = req.model_dump(mode='json')
    
    # Using the unique index we created in Migration 003
    await execute_with_retry_async(
        db.table("meal_requests").upsert(data, on_conflict="admission_id,meal_date,meal_time")
    )
    
    # Broadcast update
    # Broadcast update
    msg = json.dumps({
        "type": "NEW_MEAL_REQUEST",
        "data": {
            "request_type": req.request_type,
            "meal_date": str(req.meal_date),
            "meal_time": req.meal_time
        }
    })
    await manager.broadcast_all(msg)
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
