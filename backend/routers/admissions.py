from fastapi import APIRouter, Depends, HTTPException, Request
from supabase._async.client import AsyncClient
from typing import List

from dependencies import get_supabase
from services import admission_service
from services.dashboard import fetch_dashboard_data
from models import Admission, AdmissionCreate, TransferRequest
from schemas import DashboardResponse

router = APIRouter()

@router.post("/{admission_id}/transfer")
async def transfer_patient(admission_id: str, req: TransferRequest, request: Request, db: AsyncClient = Depends(get_supabase)):
    ip_address = request.client.host if request.client else "127.0.0.1"
    return await admission_service.transfer_patient(db, admission_id, req, ip_address)

@router.post("/{admission_id}/discharge")
async def discharge_patient(admission_id: str, request: Request, db: AsyncClient = Depends(get_supabase)):
    ip_address = request.client.host if request.client else "127.0.0.1"
    return await admission_service.discharge_patient(db, admission_id, ip_address)

@router.post("", response_model=Admission)
async def create_admission(admission: AdmissionCreate, request: Request, db: AsyncClient = Depends(get_supabase)):
    ip_address = request.client.host if request.client else "127.0.0.1"
    return await admission_service.create_admission(db, admission, ip_address)

@router.get("", response_model=List[dict])
async def list_admissions(db: AsyncClient = Depends(get_supabase)):
    return await admission_service.list_active_admissions_enriched(db)

@router.get("/{admission_id}/dashboard", response_model=DashboardResponse)
async def get_dashboard_data_by_id(admission_id: str, db: AsyncClient = Depends(get_supabase)):
    return await fetch_dashboard_data(db, admission_id)
