from fastapi import APIRouter, Depends
from typing import Annotated
from supabase import AsyncClient
from dependencies import get_supabase
from services import dev_service

router = APIRouter()

@router.post("/discharge-all")
async def discharge_all(db: Annotated[AsyncClient, Depends(get_supabase)]):
    return await dev_service.discharge_all(db)

@router.post("/seed-patient/{admission_id}")
async def seed_patient_data(admission_id: str, db: Annotated[AsyncClient, Depends(get_supabase)]):
    return await dev_service.seed_patient_data(db, admission_id)

@router.post("/seed-meals")
async def seed_all_meals(db: Annotated[AsyncClient, Depends(get_supabase)]):
    return await dev_service.seed_all_meals(db)

@router.post("/seed-single")
async def seed_single_patient(db: Annotated[AsyncClient, Depends(get_supabase)]):
    return await dev_service.seed_single_patient(db)
