import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import HTTPException
from supabase._async.client import AsyncClient
from websocket_manager import manager

from utils import execute_with_retry_async, mask_name, create_audit_log, broadcast_to_station_and_patient
from models import AdmissionCreate, TransferRequest

async def transfer_patient(db: AsyncClient, admission_id: str, req: TransferRequest):
    # 1. Check target room availability
    res = await execute_with_retry_async(
        db.table("admissions")
        .select("id")
        .eq("room_number", req.target_room)
        .in_("status", ["IN_PROGRESS", "OBSERVATION"])
    )
    if res.data:
        raise HTTPException(status_code=400, detail=f"Room {req.target_room} is currently occupied.")

    # 2. Get current room (OLD)
    current_res = await execute_with_retry_async(db.table("admissions").select("room_number, access_token").eq("id", admission_id).single())
    if not current_res.data:
        raise HTTPException(status_code=404, detail="Admission not found")
        
    old_room = current_res.data['room_number']
    token = current_res.data['access_token']

    # 3. Update room
    await execute_with_retry_async(
        db.table("admissions")
        .update({"room_number": req.target_room})
        .eq("id", admission_id)
    )
    
    # 4. Audit & Broadcast
    msg = {
        "type": "ADMISSION_TRANSFERRED",
        "data": {
            "admission_id": admission_id,
            "old_room": old_room,
            "new_room": req.target_room
        }
    }
    await asyncio.gather(
        create_audit_log(db, "NURSE", "TRANSFER", admission_id, f"From {old_room} To {req.target_room}"),
        broadcast_to_station_and_patient(manager, msg, token)
    )
    return {"message": "Transferred successfully"}

async def discharge_patient(db: AsyncClient, admission_id: str):
    now = datetime.now().isoformat()
    
    await execute_with_retry_async(
        db.table("admissions")
        .update({"status": "DISCHARGED", "discharged_at": now})
        .eq("id", admission_id)
    )
    
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
        await asyncio.gather(
            create_audit_log(db, "NURSE", "DISCHARGE", admission_id),
            broadcast_to_station_and_patient(manager, msg, token)
        )
    else:
        await create_audit_log(db, "NURSE", "DISCHARGE", admission_id)
    return {"message": "Discharged successfully"}

async def create_admission(db: AsyncClient, admission: AdmissionCreate):
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

async def list_active_admissions_enriched(db: AsyncClient):
    res = await execute_with_retry_async(db.table("admissions").select("*").in_("status", ["IN_PROGRESS", "OBSERVATION"]))
    admissions = res.data or []
    
    admissions.sort(key=lambda x: x.get('check_in_at') or x.get('created_at') or '', reverse=True)
    
    unique_map = {}
    for adm in admissions:
        room = adm['room_number']
        if room not in unique_map:
            unique_map[room] = adm
    
    unique_admissions = list(unique_map.values())
    admission_ids = [adm['id'] for adm in unique_admissions]
    
    if not admission_ids:
        return []

    now_utc = datetime.now(timezone.utc)
    cutoff_vitals = (now_utc - timedelta(days=5)).isoformat()
    cutoff_meals = (now_utc - timedelta(days=3)).isoformat()
    cutoff_iv = (now_utc - timedelta(days=7)).isoformat()

    async def fetch_iv():
        res = await execute_with_retry_async(
            db.table("iv_records")
            .select("admission_id, infusion_rate, photo_url, created_at")
            .in_("admission_id", admission_ids)
            .gte("created_at", cutoff_iv)
            .order("created_at", desc=True)
        )
        return res.data or []

    async def fetch_vitals():
        res = await execute_with_retry_async(
            db.table("vital_signs")
            .select("admission_id, temperature, recorded_at")
            .in_("admission_id", admission_ids)
            .gte("recorded_at", cutoff_vitals)
            .order("recorded_at", desc=True)
        )
        return res.data or []

    async def fetch_meals():
        res = await execute_with_retry_async(
            db.table("meal_requests")
            .select("admission_id, request_type, pediatric_meal_type, guardian_meal_type, room_note, created_at")
            .in_("admission_id", admission_ids)
            .gte("created_at", cutoff_meals)
            .order("id", desc=True)
        )
        return res.data or []

    all_ivs, all_vitals, all_meals = await asyncio.gather(fetch_iv(), fetch_vitals(), fetch_meals())

    iv_map = {}
    for iv in all_ivs:
        aid = iv['admission_id']
        if aid not in iv_map:
            iv_map[aid] = iv
    
    # Process Vitals with fever check
    vital_map = {}
    six_hours_ago = now_utc - timedelta(hours=6)
    for v in all_vitals:
        aid = v['admission_id']
        if aid not in vital_map:
            vital_map[aid] = {'latest_temp': v['temperature'], 'last_vital_at': v['recorded_at'], 'had_fever_in_6h': False}
        if not vital_map[aid]['had_fever_in_6h'] and v['temperature'] >= 38.0:
            try:
                rec_at_dt = datetime.fromisoformat(v['recorded_at'].replace('Z', '+00:00'))
                if rec_at_dt.tzinfo is None: rec_at_dt = rec_at_dt.replace(tzinfo=timezone.utc)
                if rec_at_dt >= six_hours_ago: vital_map[aid]['had_fever_in_6h'] = True
            except: pass

    meal_map = {m['admission_id']: m for m in all_meals}

    for adm in unique_admissions:
        aid = adm['id']
        adm['latest_iv'] = iv_map.get(aid)
        adm['display_name'] = adm.get('patient_name_masked', '')
        v_data = vital_map.get(aid)
        if v_data:
            adm['latest_temp'] = v_data['latest_temp']
            adm['last_vital_at'] = v_data['last_vital_at']
            adm['had_fever_in_6h'] = v_data['had_fever_in_6h']
        else:
            adm['latest_temp'] = adm['last_vital_at'] = None
            adm['had_fever_in_6h'] = False
        adm['latest_meal'] = meal_map.get(aid)

    return unique_admissions
