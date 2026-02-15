from fastapi import APIRouter, Depends, HTTPException
import random
from datetime import datetime, timedelta
from supabase._async.client import AsyncClient
from dependencies import get_supabase
from utils import execute_with_retry_async

router = APIRouter()

@router.post("/discharge-all")
async def discharge_all(db: AsyncClient = Depends(get_supabase)):
    """
    Developer tool: Discharge all active patients.
    Sets status to 'DISCHARGED' and discharged_at to now for all IN_PROGRESS/OBSERVATION.
    """
    now = datetime.now().isoformat()
    
    # 1. Update all functionality
    res = await execute_with_retry_async(
        db.table("admissions")
        .update({"status": "DISCHARGED", "discharged_at": now})
        .in_("status", ["IN_PROGRESS", "OBSERVATION"])
        .neq("id", "00000000-0000-0000-0000-000000000000") # Safety check
    )
    
    return {"count": len(res.data) if res.data else 0, "message": "All active patients discharged."}

@router.post("/seed-patient/{admission_id}")
async def seed_patient_data(admission_id: str, db: AsyncClient = Depends(get_supabase)):
    """
    Developer tool: Seed 72 hours of virtual data for a specific patient.
    """
    now = datetime.now()

    # 1. Update Admission check_in_at to 72 hours ago
    start_time = now - timedelta(hours=72)
    await execute_with_retry_async(
        db.table("admissions")
        .update({"check_in_at": start_time.isoformat()})
        .eq("id", admission_id)
    )

    # 2. Generate 72h Vitals (every 4 hours, starting from start_time)
    vitals = []
    # 72 hours / 4 hours = 18 intervals
    for i in range(19):
        recorded_at = (start_time + timedelta(hours=i*4)).isoformat()
        # Only add if not in the future
        if (start_time + timedelta(hours=i*4)) > now:
            continue
            
        temp = round(random.uniform(36.4, 38.8), 1)
        vitals.append({
            "admission_id": admission_id,
            "temperature": temp,
            "has_medication": temp >= 38.0,
            "medication_type": "A" if temp >= 38.0 else None,
            "recorded_at": recorded_at
        })
    
    await execute_with_retry_async(db.table("vital_signs").insert(vitals))
    
    # 3. Generate 2 IV Records (starting after admission)
    ivs = [
        {
            "admission_id": admission_id,
            "infusion_rate": 40,
            "photo_url": "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=400",
            "created_at": (start_time + timedelta(hours=1)).isoformat()
        },
        {
            "admission_id": admission_id,
            "infusion_rate": 60,
            "photo_url": "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=400",
            "created_at": (now - timedelta(minutes=30)).isoformat()
        }
    ]
    await execute_with_retry_async(db.table("iv_records").insert(ivs))
    
    # 4. Generate 2 Exam Schedules
    exams = [
        {
            "admission_id": admission_id,
            "scheduled_at": (now + timedelta(hours=2)).isoformat(),
            "name": "오전 X-ray (Dev)",
            "note": "가상 데이터"
        },
        {
            "admission_id": admission_id,
            "scheduled_at": (now + timedelta(hours=5)).isoformat(),
            "name": "오후 혈액검사 (Dev)",
            "note": "가상 데이터"
        }
    ]
    await execute_with_retry_async(db.table("exam_schedules").insert(exams))

    # 4. Notify Station/Patient about update
    from websocket_manager import manager
    import json

    # Fetch admission info for token and room
    adm_res = await execute_with_retry_async(
        db.table("admissions")
        .select("access_token, room_number")
        .eq("id", admission_id)
        .single()
    )
    if adm_res.data:
        token = adm_res.data['access_token']
        room = adm_res.data['room_number']
        
        # Vitals Broadcast (latest)
        if vitals:
            v_msg = {"type": "NEW_VITAL", "data": {**vitals[0], "room": room}}
            await manager.broadcast(json.dumps(v_msg), "STATION")
            await manager.broadcast(json.dumps(v_msg), token)
        
        # IV Broadcast (latest)
        if ivs:
            iv_msg = {"type": "NEW_IV", "data": {**ivs[-1], "room": room}}
            await manager.broadcast(json.dumps(iv_msg), "STATION")
            await manager.broadcast(json.dumps(iv_msg), token)

        # Exams Broadcast (bulk notify via generic type or specific)
        ex_msg = {"type": "NEW_EXAM_SCHEDULE", "data": {**exams[0], "room": room}}
        await manager.broadcast(json.dumps(ex_msg), "STATION")
        await manager.broadcast(json.dumps(ex_msg), token)
    
    return {"message": f"Successfully seeded 72h data for patient {admission_id}"}
