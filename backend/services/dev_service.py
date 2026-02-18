import random
import asyncio
import json
from datetime import datetime, timedelta, timezone
from supabase._async.client import AsyncClient
from websocket_manager import manager
from utils import execute_with_retry_async, broadcast_to_station_and_patient
from logger import logger

async def discharge_all(db: AsyncClient):
    """
    SECURITY DEFINER가 설정된 RPC를 호출하여 RLS를 우회하고 
    모든 활성 환자를 퇴원 처리합니다.
    """
    # RPC 호출 (admissions 테이블 직접 수정 대신 사용)
    res = await db.rpc("discharge_all_transaction", {
        "p_actor_type": "NURSE",
        "p_ip_address": "127.0.0.1"
    }).execute()
    
    # RPC 결과에서 업데이트된 행 수 추출 (Python SDK execute() 결과 대응)
    data = res.data
    updated_count = data.get('count', 0) if data else 0
    
    if updated_count > 0:
        import json
        # 웹소켓을 통해 프론트엔드에 즉시 갱신 신호 전송
        await manager.broadcast_all(json.dumps({
            "type": "ADMISSION_DISCHARGED",
            "data": {"message": f"Total {updated_count} patients discharged."}
        }))
    
    return {"count": updated_count, "message": "All active patients discharged successfully."}

async def seed_patient_data(db: AsyncClient, admission_id: str):
    now = datetime.now(timezone.utc)
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
        
        # 3일치 랜덤 식단 데이터 생성 (오늘 ~ 내레)
        meal_times = ["BREAKFAST", "LUNCH", "DINNER"]
        pediatric_types = ["일반식", "죽1", "죽2", "죽3"]
        guardian_types = ["일반식", "신청 안함"]
        statuses = ["APPROVED", "COMPLETED", "REQUESTED"]
        
        # KST (UTC+9) adjustment to ensure today's date matches Korean hospital context
        start_date = (datetime.now(timezone.utc) + timedelta(hours=9)).date()
        meal_entries = []
        for i in range(3):
            target_date = (start_date + timedelta(days=i)).isoformat()
            for mt in meal_times:
                meal_entries.append({
                    "admission_id": admission_id,
                    "meal_date": target_date,
                    "meal_time": mt,
                    "pediatric_meal_type": random.choice(pediatric_types),
                    "requested_pediatric_meal_type": random.choice(pediatric_types),
                    "guardian_meal_type": random.choice(guardian_types),
                    "requested_guardian_meal_type": random.choice(guardian_types),
                    "status": random.choice(statuses),
                    "request_type": "REGULAR"
                })
        
        await execute_with_retry_async(db.rpc("upsert_meal_requests_admin", {"p_meals": meal_entries}))

        if vitals: await broadcast_to_station_and_patient(manager, {"type": "NEW_VITAL", "data": {**vitals[0], "room": room}}, token)
        if ivs: await broadcast_to_station_and_patient(manager, {"type": "NEW_IV", "data": {**ivs[-1], "room": room}}, token)
        # exam 개별 broadcast 제거: REFRESH_DASHBOARD가 전체 데이터를 갱신하므로 개별 트리거 불필요 (이중 렌더링 방지)
        
        # 전체 데이터 갱신을 지시하는 신호 전송
        await broadcast_to_station_and_patient(manager, {
            "type": "REFRESH_DASHBOARD",
            "data": {"admission_id": admission_id}
        }, token)
    
    return {"message": "Seeded successfully"}

async def seed_all_meals(db: AsyncClient):
    """
    모든 활성 입원 환자(IN_PROGRESS, OBSERVATION)에게 오늘부터 3일간의 식단 데이터를 시딩합니다.
    """
    # KST (UTC+9) 기준 오늘 날짜 계산
    start_date = (datetime.now(timezone.utc) + timedelta(hours=9)).date()
    
    res = await execute_with_retry_async(
        db.table("admissions")
        .select("id")
        .in_("status", ["IN_PROGRESS", "OBSERVATION"])
    )
    admissions = res.data or []
    if not admissions:
        return {"message": "시딩할 활성 입원 세션이 없습니다."}
    
    meal_times = ["BREAKFAST", "LUNCH", "DINNER"]
    pediatric_types = ["일반식", "죽1", "죽2", "죽3"]
    meal_records = []
    
    for idx, adm in enumerate(admissions):
        admission_id = adm['id']
        for d_idx in range(3): # 오늘부터 3일간
            target_date = (start_date + timedelta(days=d_idx)).isoformat()
            for t_idx, mt in enumerate(meal_times):
                # 환자별/날짜별로 다른 메뉴 제공 (순환)
                p_type = pediatric_types[(idx + d_idx + t_idx) % len(pediatric_types)]
                
                meal_records.append({
                    "admission_id": admission_id,
                    "meal_date": target_date,
                    "meal_time": mt,
                    "request_type": "REGULAR",
                    "pediatric_meal_type": p_type,
                    "guardian_meal_type": "일반식" if mt != "BREAKFAST" else "신청 안함",
                    "room_note": "알러지 확인 요망" if idx % 5 == 0 else "",
                    "status": "APPROVED"
                })
                
    if meal_records:
        await execute_with_retry_async(db.rpc("upsert_meal_requests_admin", {"p_meals": meal_records}))
        return {"message": f"성공: {len(admissions)}명의 환자에게 총 {len(meal_records)}개의 식단 데이터가 시딩되었습니다."}
    
    return {"message": "생성된 데이터가 없습니다."}
