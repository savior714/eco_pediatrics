from fastapi import APIRouter, Depends, HTTPException
from supabase._async.client import AsyncClient
from typing import List
import json
import asyncio
from websocket_manager import manager

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

    # 2. Get current room (OLD) - BEFORE update
    current_res = await execute_with_retry_async(db.table("admissions").select("room_number, access_token").eq("id", admission_id).single())
    if not current_res.data:
        raise HTTPException(status_code=404, detail="Admission not found")
        
    old_room = current_res.data['room_number']
    token = current_res.data['access_token']

    # 3. Update room (NEW)
    await execute_with_retry_async(
        db.table("admissions")
        .update({"room_number": req.target_room})
        .eq("id", admission_id)
    )
    
    # 4. Audit
    await create_audit_log(db, "NURSE", "TRANSFER", admission_id, f"From {old_room} To {req.target_room}")
    
    # 5. Broadcast
    # Send to STATION (nurses need to see change in both rooms) and Patient (token)
    msg = {
        "type": "ADMISSION_TRANSFERRED",
        "data": {
            "admission_id": admission_id,
            "old_room": old_room,
            "new_room": req.target_room
        }
    }
    await manager.broadcast(json.dumps(msg), "STATION")
    if token:
        await manager.broadcast(json.dumps(msg), str(token))

    return {"message": "Transferred successfully"}

@router.post("/{admission_id}/discharge")
async def discharge_patient(admission_id: str, db: AsyncClient = Depends(get_supabase)):
    from datetime import datetime
    now = datetime.now().isoformat()
    
    await execute_with_retry_async(
        db.table("admissions")
        .update({"status": "DISCHARGED", "discharged_at": now})
        .eq("id", admission_id)
    )
    
    await create_audit_log(db, "NURSE", "DISCHARGE", admission_id)
    
    # 4. Broadcast
    adm_res = await execute_with_retry_async(db.table("admissions").select("access_token, room_number").eq("id", admission_id))
    if adm_res.data:
        token = adm_res.data[0]['access_token']
        room = adm_res.data[0]['room_number']
        msg = {
            "type": "ADMISSION_DISCHARGED",
            "data": {
                "admission_id": admission_id,
                "room": room
            }
        }
        await manager.broadcast(json.dumps(msg), "STATION")
        await manager.broadcast(json.dumps(msg), str(token))

    return {"message": "Discharged successfully"}


@router.post("", response_model=Admission)
async def create_admission(admission: AdmissionCreate, db: AsyncClient = Depends(get_supabase)):
    masked_name = mask_name(admission.patient_name)
    data = {
        "patient_name_masked": masked_name,
        "room_number": admission.room_number,
        "status": "IN_PROGRESS",
        "dob": admission.dob.isoformat() if admission.dob else None,
        "gender": admission.gender
    }
    if admission.check_in_at:
        data["check_in_at"] = admission.check_in_at.isoformat()

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
    
    # 3. Enrich in parallel (Phase A)
    admission_ids = [adm['id'] for adm in unique_admissions]
    iv_map = {}
    vital_map = {}
    meal_map = {}

    if admission_ids:
        # Define tasks
        async def fetch_iv():
            res = await execute_with_retry_async(
                db.table("iv_records")
                .select("admission_id, infusion_rate, photo_url, created_at")
                .in_("admission_id", admission_ids)
                .order("created_at", desc=True)
                .order("id", desc=True) # Secondary sort for stability
            )
            return res.data or []

        async def fetch_vitals():
            res = await execute_with_retry_async(
                db.table("vital_signs")
                .select("admission_id, temperature, recorded_at")
                .in_("admission_id", admission_ids)
                .order("recorded_at", desc=True)
            )
            return res.data or []

        async def fetch_meals():
            res = await execute_with_retry_async(
                db.table("meal_requests")
                .select("admission_id, request_type, pediatric_meal_type, guardian_meal_type, room_note, created_at")
                .in_("admission_id", admission_ids)
                .order("id", desc=True)
            )
            return res.data or []

        # Execute in parallel
        all_ivs, all_vitals, all_meals = await asyncio.gather(
            fetch_iv(),
            fetch_vitals(),
            fetch_meals()
        )

        # Process IVs
        for iv in all_ivs:
            aid = iv['admission_id']
            if aid not in iv_map:
                iv_map[aid] = iv

        # Process Vitals
        from datetime import datetime, timedelta
        # Ensure we have local import or use top-level if available, but keeping it local as before to minimize diff scope
        # (Though we might want to move it to top level, but let's stick to simple changes)
        six_hours_ago_iso = (datetime.now() - timedelta(hours=6)).isoformat()

        for v in all_vitals:
            aid = v['admission_id']
            
            # Initialize with latest
            if aid not in vital_map:
                vital_map[aid] = {
                    'latest_temp': v['temperature'],
                    'last_vital_at': v['recorded_at'],
                    'had_fever_in_6h': False
                }
            
            # Check fever
            if not vital_map[aid]['had_fever_in_6h']:
                rec_at = v.get('recorded_at')
                if rec_at and v['temperature'] >= 38.0 and rec_at >= six_hours_ago_iso:
                    vital_map[aid]['had_fever_in_6h'] = True

        # Process Meals
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
