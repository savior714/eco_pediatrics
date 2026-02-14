from fastapi import APIRouter, Depends, HTTPException
from supabase._async.client import AsyncClient
from typing import List

from dependencies import get_supabase
from utils import execute_with_retry_async, mask_name, create_audit_log
from services.dashboard import fetch_dashboard_data
from models import Admission, AdmissionCreate
from schemas import DashboardResponse

router = APIRouter()

@router.post("", response_model=Admission)
async def create_admission(admission: AdmissionCreate, db: AsyncClient = Depends(get_supabase)):
    masked_name = mask_name(admission.patient_name)
    data = {
        "patient_name_masked": masked_name,
        "room_number": admission.room_number,
        "status": "IN_PROGRESS"
    }
    response = await execute_with_retry_async(db.table("admissions").insert(data))
    new_admission = response.data[0]
    await create_audit_log(db, "NURSE", "CREATE", new_admission['id'])
    return new_admission

@router.get("", response_model=List[dict])
async def list_admissions(db: AsyncClient = Depends(get_supabase)):
    # 1. Get active admissions with async retry
    res = await execute_with_retry_async(db.table("admissions").select("*").in_("status", ["IN_PROGRESS", "OBSERVATION"]))
    admissions = res.data or []
    
    # 2. Deduplicate: keep only the latest admission per room_number
    unique_map = {}
    for adm in admissions:
        room = adm['room_number']
        if room not in unique_map:
            unique_map[room] = adm
        else:
            existing = unique_map[room]
            # Prioritize IN_PROGRESS
            if adm['status'] == 'IN_PROGRESS' and existing['status'] != 'IN_PROGRESS':
                unique_map[room] = adm
            elif adm['status'] == existing['status']:
                # Tie-breaker: check_in_at desc (or created_at if check_in_at missing)
                new_time = adm.get('check_in_at') or adm.get('created_at') or ''
                old_time = existing.get('check_in_at') or existing.get('created_at') or ''
                if new_time > old_time:
                    unique_map[room] = adm

    unique_admissions = list(unique_map.values())
    
    # 3. Enrich with latest IV rate (Batch Query)
    admission_ids = [adm['id'] for adm in unique_admissions]
    iv_map = {}
    
    if admission_ids:
        iv_res = await execute_with_retry_async(
            db.table("iv_records")
            .select("admission_id, infusion_rate, photo_url, created_at")
            .in_("admission_id", admission_ids)
            .order("created_at", desc=True)
        )
        all_ivs = iv_res.data or []
        
        # Keep only the first (latest) for each admission_id
        for iv in all_ivs:
            aid = iv['admission_id']
            if aid not in iv_map:
                iv_map[aid] = iv

    for adm in unique_admissions:
        adm['latest_iv'] = iv_map.get(adm['id'])
            
    return unique_admissions

@router.get("/{admission_id}/dashboard", response_model=DashboardResponse)
async def get_dashboard_data_by_id(admission_id: str, db: AsyncClient = Depends(get_supabase)):
    return await fetch_dashboard_data(db, admission_id)
