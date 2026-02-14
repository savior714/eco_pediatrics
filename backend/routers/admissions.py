from fastapi import APIRouter, Depends, HTTPException
from supabase._async.client import AsyncClient
from typing import List

from dependencies import get_supabase
from utils import execute_with_retry_async, mask_name, create_audit_log
from services.dashboard import fetch_dashboard_data
from models import Admission, AdmissionCreate, TransferRequest
from schemas import DashboardResponse

router = APIRouter()

@router.post("/{admission_id}/transfer")
async def transfer_patient(admission_id: str, req: TransferRequest, db: AsyncClient = Depends(get_supabase)):
    # 1. Check target room availability
    res = await execute_with_retry_async(
        db.table("admissions")
        .select("id")
        .eq("room_number", req.target_room)
        .in_("status", ["IN_PROGRESS", "OBSERVATION"])
    )
    if res.data:
        raise HTTPException(status_code=400, detail=f"Room {req.target_room} is currently occupied.")

    # 2. Update room
    await execute_with_retry_async(
        db.table("admissions")
        .update({"room_number": req.target_room})
        .eq("id", admission_id)
    )
    
    # 3. Audit
    await create_audit_log(db, "NURSE", "TRANSFER", admission_id, f"To {req.target_room}")
    
    return {"message": "Transferred successfully"}

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
    
    # 2. Deduplicate: sort by check_in_at desc (latest first) and keep first per room
    admissions.sort(key=lambda x: x.get('check_in_at') or x.get('created_at') or '', reverse=True)
    
    unique_map = {}
    for adm in admissions:
        room = adm['room_number']
        if room not in unique_map:
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

    # 4. Enrich with Vitals
    from datetime import datetime, timedelta
    
    vital_map = {}
    if admission_ids:
        # Fetch vitals
        vitals_res = await execute_with_retry_async(
            db.table("vital_signs")
            .select("admission_id, temperature, recorded_at")
            .in_("admission_id", admission_ids)
            .order("recorded_at", desc=True)
        )
        all_vitals = vitals_res.data or []
        
        # Simple ISO comparison works because standard ISO format is sortable as string
        six_hours_ago_iso = (datetime.now() - timedelta(hours=6)).isoformat()
    
        for v in all_vitals:
            aid = v['admission_id']
            
            # Initialize with latest (first seen because of desc sort)
            if aid not in vital_map:
                vital_map[aid] = {
                    'latest_temp': v['temperature'],
                    'last_vital_at': v['recorded_at'],
                    'had_fever_in_6h': False
                }
            
            # Check fever (if not already found)
            if not vital_map[aid]['had_fever_in_6h']:
                # Compare string ISO directly
                rec_at = v.get('recorded_at')
                if rec_at and v['temperature'] >= 38.0 and rec_at >= six_hours_ago_iso:
                    vital_map[aid]['had_fever_in_6h'] = True

    # 5. Enrich with Latest Meal Request
    meal_map = {}
    if admission_ids:
        meal_res = await execute_with_retry_async(
            db.table("meal_requests")
            .select("admission_id, request_type, pediatric_meal_type, guardian_meal_type, room_note, created_at")
            .in_("admission_id", admission_ids)
            .order("created_at", desc=True)
        )
        all_meals = meal_res.data or []
        for m in all_meals:
            aid = m['admission_id']
            if aid not in meal_map:
                meal_map[aid] = m

    for adm in unique_admissions:
        adm['latest_iv'] = iv_map.get(adm['id'])
        adm['display_name'] = adm.get('patient_name_masked', '')
        
        v_data = vital_map.get(adm['id'])
        if v_data:
            adm['latest_temp'] = v_data['latest_temp']
            adm['last_vital_at'] = v_data['last_vital_at']
            adm['had_fever_in_6h'] = v_data['had_fever_in_6h']
        else:
            adm['latest_temp'] = None
            adm['last_vital_at'] = None
            adm['had_fever_in_6h'] = False
            
        adm['latest_meal'] = meal_map.get(adm['id'])
            
    return unique_admissions

@router.get("/{admission_id}/dashboard", response_model=DashboardResponse)
async def get_dashboard_data_by_id(admission_id: str, db: AsyncClient = Depends(get_supabase)):
    return await fetch_dashboard_data(db, admission_id)
