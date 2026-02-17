import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import HTTPException
from supabase._async.client import AsyncClient
from websocket_manager import manager

from utils import execute_with_retry_async, mask_name, create_audit_log, broadcast_to_station_and_patient
from models import AdmissionCreate, TransferRequest

async def transfer_patient(db: AsyncClient, admission_id: str, req: TransferRequest, ip_address: str = "127.0.0.1"):
    # Call RPC for atomic transfer and audit logging
    try:
        res = await db.rpc("transfer_patient_transaction", {
            "p_admission_id": admission_id,
            "p_target_room": req.target_room,
            "p_actor_type": "NURSE",
            "p_ip_address": ip_address
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

async def discharge_patient(db: AsyncClient, admission_id: str, ip_address: str = "127.0.0.1"):
    try:
        res = await db.rpc("discharge_patient_transaction", {
            "p_admission_id": admission_id,
            "p_actor_type": "NURSE",
            "p_ip_address": ip_address
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

async def create_admission(db: AsyncClient, admission: AdmissionCreate, ip_address: str = "127.0.0.1"):
    masked_name = mask_name(admission.patient_name)
    try:
        res = await db.rpc("create_admission_transaction", {
            "p_patient_name_masked": masked_name,
            "p_room_number": admission.room_number,
            "p_dob": admission.dob.isoformat() if admission.dob else None,
            "p_gender": admission.gender,
            "p_check_in_at": admission.check_in_at.isoformat() if admission.check_in_at else None,
            "p_actor_type": "NURSE",
            "p_ip_address": ip_address
        }).execute()
        return res.data
    except Exception as e:
        # APIError(RLS violation 등)인 경우 더 상세한 메시지 제공
        if "row-level security policy" in str(e).lower():
            logger.error(f"RLS Violation during admission creation: {e}")
            raise HTTPException(status_code=403, detail="Database Role Policy Violation. Please check if SQL functions are updated with SECURITY DEFINER.")
        
        logger.error(f"Create admission RPC failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

async def list_active_admissions_enriched(db: AsyncClient):
    # Use SQL View to fetch pre-calculated dashboard state (No N+1)
    # Order is now handled by the SQL View (ORDER BY check_in_at DESC)
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
        
    return enriched
