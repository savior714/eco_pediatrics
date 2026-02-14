from fastapi import APIRouter, Depends
from supabase._async.client import AsyncClient
from datetime import datetime
import uuid
import random
from datetime import timedelta

from dependencies import get_supabase
from utils import execute_with_retry_async
from logger import logger

router = APIRouter()

STATION_ROOM_NUMBERS = [
    "301", "302", "303", "304", "305", "306", "307", "308", "309",
    "310-1", "310-2", "311-1", "311-2", "311-3", "311-4",
    "312", "313", "314", "315-1", "315-2", "315-3", "315-4",
    "401-1", "401-2", "401-3", "401-4", "402-1", "402-2", "402-3", "402-4",
]

@router.post("/seed/full-test-data")
async def seed_full_test_data(force: bool = True, db: AsyncClient = Depends(get_supabase)):
    """
    [개발용] 통합 데이터 생성기
    force=True이면 기존 입원 정보를 모두 DISCHARGED로 처리하고 새로 생성하여 중복 방지
    """
    if force:
        # 기존 IN_PROGRESS 입원을 모두 DISCHARGED으로 변경 (대청소)
        logger.info("[SEED] Force reset: Marking existing admissions as DISCHARGED")
        try:
            await execute_with_retry_async(
                db.table("admissions")
                .update({"status": "DISCHARGED", "discharged_at": datetime.now().isoformat()})
                .eq("status", "IN_PROGRESS")
            )
            logger.info("[SEED] Force reset complete")
        except Exception as e:
            logger.error(f"[SEED] ERROR during reset: {e}")
            raise e
    
    # 1. Admissions (Optimized)
    logger.info("[SEED] Fetching existing admissions...")
    res = await execute_with_retry_async(db.table("admissions").select("id, room_number").eq("status", "IN_PROGRESS"))
    logger.info(f"[SEED] Fetched {len(res.data or [])} existing admissions")
    admissions_data = res.data or []
    existing_map = {row['room_number']: row['id'] for row in admissions_data}
    
    missing_rooms = [r for r in STATION_ROOM_NUMBERS if r not in existing_map]
    
    if missing_rooms:
        new_admissions = []
        for room in missing_rooms:
            idx = STATION_ROOM_NUMBERS.index(room)
            access_token = str(uuid.uuid4())
            new_admissions.append({
                "patient_name_masked": f"환자{idx + 1}",
                "room_number": room,
                "status": "IN_PROGRESS",
                "check_in_at": datetime.now().isoformat(),
                "access_token": access_token
            })
        
        logger.info(f"[SEED] Inserting {len(new_admissions)} new admissions...")
        insert_res = await (db.table("admissions").insert(new_admissions).execute()) 
        logger.info("[SEED] Insert complete")
        inserted_data = insert_res.data or []
        for row in inserted_data:
            existing_map[row['room_number']] = row['id']
            
    admissions_map = existing_map
    created_adms = len(missing_rooms)

    # 2. Vitals (History) - 310-1호(김*아), 302호에 대해 지난 48시간 데이터 생성
    target_rooms = ["310-1", "302", "305"]
    created_vitals = 0

    base_time = datetime.now()
    
    for room in target_rooms:
        adm_id = admissions_map.get(room)
        if not adm_id: continue
        
        # 이미 데이터가 있는지 확인 (중복 생성 방지)
        check = await execute_with_retry_async(db.table("vital_signs").select("id").eq("admission_id", adm_id).limit(1))
        if check.data: continue

        # 48시간 전부터 4시간 간격으로 생성
        for i in range(12):
            t = base_time - timedelta(hours=48 - (i * 4))
            temp = 36.5 + (random.random() * 1.5) # 36.5 ~ 38.0
            if i == 10: temp = 38.5 # 고열 이벤트
            
            med_type = None
            has_med = False
            if temp >= 38.0:
                has_med = True
                med_type = "A" # 해열제
                
            await execute_with_retry_async(db.table("vital_signs").insert({
                "admission_id": adm_id,
                "temperature": round(temp, 1),
                "has_medication": has_med,
                "medication_type": med_type,
                "recorded_at": t.isoformat()
            }))
            created_vitals += 1

    # 3. Exam Schedules - 내일, 모레 일정
    created_exams = 0
    for room in ["310-1", "302"]:
        adm_id = admissions_map.get(room)
        if not adm_id: continue

        check = await execute_with_retry_async(db.table("exam_schedules").select("id").eq("admission_id", adm_id).limit(1))
        if check.data: continue
        
        # 내일 오전 9시
        tomorrow_9am = (base_time + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
        await execute_with_retry_async(db.table("exam_schedules").insert({
            "admission_id": adm_id,
            "scheduled_at": tomorrow_9am.isoformat(),
            "name": "혈액 검사",
            "note": "공복 유지 필요"
        }))
        
        # 모레 오후 2시
        after_2pm = (base_time + timedelta(days=2)).replace(hour=14, minute=0, second=0, microsecond=0)
        await execute_with_retry_async(db.table("exam_schedules").insert({
            "admission_id": adm_id,
            "scheduled_at": after_2pm.isoformat(),
            "name": "흉부 X-Ray"
        }))
        created_exams += 2

    return {
        "message": "통합 더미 데이터 생성 완료",
        "admissions_created": created_adms,
        "vitals_created": created_vitals,
        "exams_created": created_exams
    }
