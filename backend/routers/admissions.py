from fastapi import APIRouter, Depends, Request, Response
from typing import List, Annotated
from supabase import AsyncClient

from dependencies import get_supabase
from services import admission_service
from services.dashboard import fetch_dashboard_data
from models import AdmissionCreate, TransferRequest
from schemas import DashboardResponse

router = APIRouter()


@router.post("/{admission_id}/transfer", response_model=dict, summary="환자 이실 처리")
async def transfer_patient(
    admission_id: str,
    req: TransferRequest,
    request: Request,
    db: Annotated[AsyncClient, Depends(get_supabase)],
):
    ip_address = request.client.host if request.client else "127.0.0.1"
    return await admission_service.transfer_patient(db, admission_id, req, ip_address)


@router.post("/{admission_id}/discharge", response_model=dict, summary="환자 퇴원 처리")
async def discharge_patient(
    admission_id: str,
    request: Request,
    db: Annotated[AsyncClient, Depends(get_supabase)],
):
    ip_address = request.client.host if request.client else "127.0.0.1"
    return await admission_service.discharge_patient(db, admission_id, ip_address)


@router.post("", response_model=dict, status_code=201, summary="환자 입원 등록")
async def create_admission(
    admission: AdmissionCreate,
    request: Request,
    db: Annotated[AsyncClient, Depends(get_supabase)],
):
    ip_address = request.client.host if request.client else "127.0.0.1"
    return await admission_service.create_admission(db, admission, ip_address)


@router.get("", response_model=List[dict], summary="활성 환자 목록 조회")
async def list_admissions(
    response: Response, db: Annotated[AsyncClient, Depends(get_supabase)]
):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return await admission_service.list_active_admissions_enriched(db)


@router.get(
    "/{admission_id}/dashboard",
    response_model=DashboardResponse,
    summary="환자 대시보드 데이터 조회",
)
async def get_dashboard_data_by_id(
    admission_id: str, db: Annotated[AsyncClient, Depends(get_supabase)]
):
    return await fetch_dashboard_data(db, admission_id)
