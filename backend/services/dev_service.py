import random
import asyncio
from datetime import datetime, timedelta
from supabase._async.client import AsyncClient
from websocket_manager import manager
from utils import execute_with_retry_async, broadcast_to_station_and_patient

async def discharge_all(db: AsyncClient):
    now = datetime.now().isoformat()
    res = await execute_with_retry_async(
        db.table("admissions")
        .update({"status": "DISCHARGED", "discharged_at": now})
        .in_("status", ["IN_PROGRESS", "OBSERVATION"])
        .neq("id", "00000000-0000-0000-0000-000000000000")
    )
    return {"count": len(res.data) if res.data else 0, "message": "All active patients discharged."}

async def seed_patient_data(db: AsyncClient, admission_id: str):
    now = datetime.now()
    start_time = now - timedelta(hours=72)
    
    await execute_with_retry_async(
        db.table("admissions").update({"check_in_at": start_time.isoformat()}).eq("id", admission_id)
    )

    vitals = []
    for i in range(19):
        rec_time = start_time + timedelta(hours=i*4)
        if rec_time > now: continue
        temp = round(random.uniform(36.4, 38.8), 1)
        vitals.append({
            "admission_id": admission_id,
            "temperature": temp,
            "has_medication": temp >= 38.0,
            "medication_type": "A" if temp >= 38.0 else None,
            "recorded_at": rec_time.isoformat()
        })
    await execute_with_retry_async(db.table("vital_signs").insert(vitals))
    
    ivs = [
        {"admission_id": admission_id, "infusion_rate": 40, "photo_url": "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400", "created_at": (start_time + timedelta(hours=1)).isoformat()},
        {"admission_id": admission_id, "infusion_rate": 40, "photo_url": "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400", "created_at": (now - timedelta(minutes=30)).isoformat()}
    ]
    await execute_with_retry_async(db.table("iv_records").insert(ivs))
    
    exams = [
        {"admission_id": admission_id, "scheduled_at": (now + timedelta(hours=2)).isoformat(), "name": "오전 X-ray (Dev)", "note": "가상 데이터"},
        {"admission_id": admission_id, "scheduled_at": (now + timedelta(hours=5)).isoformat(), "name": "오후 혈액검사 (Dev)", "note": "가상 데이터"}
    ]
    await execute_with_retry_async(db.table("exam_schedules").insert(exams))

    adm_res = await execute_with_retry_async(db.table("admissions").select("access_token, room_number").eq("id", admission_id).single())
    if adm_res.data:
        token, room = adm_res.data['access_token'], adm_res.data['room_number']
        if vitals: await broadcast_to_station_and_patient(manager, {"type": "NEW_VITAL", "data": {**vitals[0], "room": room}}, token)
        if ivs: await broadcast_to_station_and_patient(manager, {"type": "NEW_IV", "data": {**ivs[-1], "room": room}}, token)
        await broadcast_to_station_and_patient(manager, {"type": "NEW_EXAM_SCHEDULE", "data": {**exams[0], "room": room}}, token)
    
    return {"message": "Seeded successfully"}

async def seed_all_meals(db: AsyncClient, target_date: str = None):
    if not target_date: target_date = datetime.now().strftime("%Y-%m-%d")
    res = await execute_with_retry_async(db.table("admissions").select("id").in_("status", ["IN_PROGRESS", "OBSERVATION"]))
    admissions = res.data or []
    if not admissions: return {"message": "No active admissions"}
    
    meal_records = []
    for adm in admissions:
        for mt in ["BREAKFAST", "LUNCH", "DINNER"]:
            meal_records.append({
                "admission_id": adm["id"], "meal_date": target_date, "meal_time": mt,
                "request_type": "STATION_UPDATE", "pediatric_meal_type": "일반식",
                "guardian_meal_type": "일반식", "status": "APPROVED"
            })
    await execute_with_retry_async(db.table("meal_requests").upsert(meal_records, on_conflict="admission_id,meal_date,meal_time"))
    return {"message": f"Seeded meals for {len(admissions)} patients"}
