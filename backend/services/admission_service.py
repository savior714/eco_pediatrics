import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import HTTPException
from supabase._async.client import AsyncClient
from websocket_manager import manager

from utils import execute_with_retry_async, mask_name, create_audit_log, broadcast_to_station_and_patient
from models import AdmissionCreate, TransferRequest

async def transfer_patient(db: AsyncClient, admission_id: str, req: TransferRequest):
    # Call RPC for atomic transfer and audit logging
    # Note: ip_address could be passed from request if available
    try:
        res = await db.rpc("transfer_patient_transaction", {
            "p_admission_id": admission_id,
            "p_target_room": req.target_room,
            "p_actor_type": "NURSE",
            "p_ip_address": "127.0.0.1" 
        }).execute()
        
        data = res.data
        msg = {
            "type": "ADMISSION_TRANSFERRED",
            "data": {
                "admission_id": admission_id,
                "old_room": data['old_room'],
                "new_room": data['new_room']
            }
        }
        await broadcast_to_station_and_patient(manager, msg, data['token'])
        return {"message": "Transferred successfully"}
    except Exception as e:
        logger.error(f"Transfer RPC failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

async def discharge_patient(db: AsyncClient, admission_id: str):
    try:
        res = await db.rpc("discharge_patient_transaction", {
            "p_admission_id": admission_id,
            "p_actor_type": "NURSE",
            "p_ip_address": "127.0.0.1"
        }).execute()
        
        data = res.data
        msg = {
            "type": "ADMISSION_DISCHARGED",
            "data": {
                "admission_id": admission_id,
                "room": data['room']
            }
        }
        await broadcast_to_station_and_patient(manager, msg, data['token'])
        return {"message": "Discharged successfully"}
    except Exception as e:
        logger.error(f"Discharge RPC failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

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
    # Use SQL View to fetch pre-calculated dashboard state (No N+1)
    res = await execute_with_retry_async(db.table("view_station_dashboard").select("*"))
    data = res.data or []
    
    # Process for specific structure if needed (mapping flat view to nested object if UI expects it)
    enriched = []
    for item in data:
        row = {
            "id": item['id'],
            "room_number": item['room_number'],
            "display_name": item['display_name'],
            "access_token": item['access_token'],
            "dob": item['dob'],
            "gender": item['gender'],
            "check_in_at": item['check_in_at'],
            "latest_temp": item['latest_temp'],
            "last_vital_at": item['last_vital_at'],
            "had_fever_in_6h": item['had_fever_in_6h'],
            "latest_iv": {
                "infusion_rate": item['iv_rate'],
                "photo_url": item['iv_photo']
            } if item['iv_rate'] is not None else None,
            "latest_meal": {
                "request_type": item['meal_type'],
                "pediatric_meal_type": item['pediatric_meal_type'],
                "guardian_meal_type": item['guardian_meal_type'],
                "created_at": item['meal_requested_at']
            } if item['meal_type'] is not None else None
        }
        enriched.append(row)
        
    # Sort by check_in_at descending
    enriched.sort(key=lambda x: x.get('check_in_at') or '', reverse=True)
    return enriched
