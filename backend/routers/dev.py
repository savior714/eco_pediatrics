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
    from datetime import datetime
    
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
    Developer tool: Seed 24 hours of virtual data for a specific patient.
    """
    # 1. Generate 24h Vitals (every 4 hours)
    now = datetime.now()
    vitals = []
    for i in range(7): # 0, 4, 8, 12, 16, 20, 24 hours ago
        recorded_at = (now - timedelta(hours=i*4)).isoformat()
        temp = round(random.uniform(36.4, 38.8), 1)
        vitals.append({
            "admission_id": admission_id,
            "temperature": temp,
            "has_medication": temp >= 38.0,
            "medication_type": "A" if temp >= 38.0 else None,
            "recorded_at": recorded_at
        })
    
    await execute_with_retry_async(db.table("vital_signs").insert(vitals))
    
    # 2. Generate 2 IV Records
    ivs = [
        {
            "admission_id": admission_id,
            "infusion_rate": 40,
            "photo_url": "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=400",
            "created_at": (now - timedelta(hours=6)).isoformat()
        },
        {
            "admission_id": admission_id,
            "infusion_rate": 60,
            "photo_url": "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=400",
            "created_at": (now - timedelta(minutes=30)).isoformat()
        }
    ]
    await execute_with_retry_async(db.table("iv_records").insert(ivs))
    
    # 3. Generate 2 Exam Schedules
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

    # 4. Generate 1 Medication Request (Document Request style)
    from websocket_manager import manager
    import json
    
    # Notify Station/Patient about update
    # We'll just trigger a general refresh via WS if possible, or expect client to reload
    
    return {"message": f"Successfully seeded 24h data for patient {admission_id}"}
