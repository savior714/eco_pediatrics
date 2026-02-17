from fastapi import APIRouter, Depends, Query
from supabase._async.client import AsyncClient
from typing import List
from datetime import date
from models import MealRequest, MealRequestCreate
from dependencies import get_supabase
from services import meal_service
from schemas import CommonMealPlan, PatientMealOverride, PatientMealOverrideCreate

router = APIRouter()

@router.get("/plans", response_model=List[CommonMealPlan])
async def get_meal_plans(start_date: date, end_date: date, db: AsyncClient = Depends(get_supabase)):
    return await meal_service.get_meal_plans(db, start_date, end_date)

@router.post("/plans", status_code=204)
async def upsert_meal_plans(plans: List[CommonMealPlan], db: AsyncClient = Depends(get_supabase)):
    await meal_service.upsert_meal_plans(db, plans)
    return

@router.get("/overrides/{admission_id}", response_model=List[PatientMealOverride])
async def get_patient_overrides(admission_id: str, db: AsyncClient = Depends(get_supabase)):
    return await meal_service.get_patient_overrides(db, admission_id)

@router.post("/overrides", status_code=204)
async def upsert_patient_override(override: PatientMealOverrideCreate, db: AsyncClient = Depends(get_supabase)):
    await meal_service.upsert_patient_override(db, override)
    return

@router.post("/requests", status_code=204)
async def upsert_meal_request(req: MealRequestCreate, db: AsyncClient = Depends(get_supabase)):
    await meal_service.upsert_meal_request(db, req)
    return

@router.get("/matrix", response_model=List[MealRequest])
async def get_meal_matrix(target_date: date, db: AsyncClient = Depends(get_supabase)):
    return await meal_service.get_meal_matrix(db, target_date)
