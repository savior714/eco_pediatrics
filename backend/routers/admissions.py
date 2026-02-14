from fastapi import APIRouter, Depends, HTTPException
from supabase._async.client import AsyncClient
from typing import List

from dependencies import get_supabase
from utils import execute_with_retry_async, mask_name, create_audit_log
from services.dashboard import fetch_dashboard_data
from models import Admission, AdmissionCreate

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
            if (adm['status'] == 'IN_PROGRESS' and existing['status'] != 'IN_PROGRESS') or \
               (adm['id'] > existing['id']):
                unique_map[room] = adm
    unique_admissions = list(unique_map.values())
    
    # 3. Enrich with latest IV rate
    for adm in unique_admissions:
        iv_res = await execute_with_retry_async(
            db.table("iv_records")
            .select("infusion_rate, photo_url")
            .eq("admission_id", adm['id'])
            .order("created_at", desc=True)
            .limit(1)
        )
        if iv_res.data:
            adm['latest_iv'] = iv_res.data[0]
        else:
            adm['latest_iv'] = None
            
    return unique_admissions

@router.get("/{admission_id}/dashboard")
async def get_dashboard_data_by_id(admission_id: str, db: AsyncClient = Depends(get_supabase)):
    return await fetch_dashboard_data(db, admission_id)
