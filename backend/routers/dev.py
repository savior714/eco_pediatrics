from fastapi import APIRouter, Depends
from typing import Annotated
from supabase import AsyncClient
from dependencies import get_supabase
from services import dev_service

router = APIRouter()


@router.post("/discharge-all", response_model=dict, summary="[DEV] 전체 환자 퇴원 처리")
async def discharge_all(db: Annotated[AsyncClient, Depends(get_supabase)]):
    return await dev_service.discharge_all(db)


@router.post(
    "/seed-patient/{admission_id}",
    response_model=dict,
    summary="[DEV] 특정 입원 시드 데이터 생성",
)
async def seed_patient_data(
    admission_id: str, db: Annotated[AsyncClient, Depends(get_supabase)]
):
    return await dev_service.seed_patient_data(db, admission_id)


@router.post(
    "/seed-meals", response_model=dict, summary="[DEV] 전체 식단 시드 데이터 생성"
)
async def seed_all_meals(db: Annotated[AsyncClient, Depends(get_supabase)]):
    return await dev_service.seed_all_meals(db)


@router.post(
    "/seed-single", response_model=dict, summary="[DEV] 단일 환자 시드 데이터 생성"
)
async def seed_single_patient(db: Annotated[AsyncClient, Depends(get_supabase)]):
    return await dev_service.seed_single_patient(db)
