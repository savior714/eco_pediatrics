from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, status, File, UploadFile, Request
from supabase._async.client import AsyncClient
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
from datetime import datetime
import json
import os
import shutil

from contextlib import asynccontextmanager
import database
from database import init_supabase
from models import Admission, VitalSign, IVRecord, MealRequest, DocumentRequest, ExamSchedule, ExamScheduleCreate, AdmissionCreate, VitalSignCreate, IVRecordCreate, MealRequestCreate, DocumentRequestCreate
from websocket_manager import manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Supabase and store in app.state
    client = await init_supabase()
    app.state.supabase = client
    print("[INIT] Supabase AsyncClient initialized and stored in app.state")
    yield
    # Cleanup: Close connections to prevent resource leaks
    if app.state.supabase:
        try:
            # Supabase-py uses internal httpx clients. Closing them explicitly if possible.
            if hasattr(app.state.supabase.auth, "aclose"): # Some versions
                await app.state.supabase.auth.aclose()
            elif hasattr(app.state.supabase.auth, "_client") and hasattr(app.state.supabase.auth._client, "aclose"):
                await app.state.supabase.auth._client.aclose()
            
            if hasattr(app.state.supabase.postgrest, "aclose"):
                await app.state.supabase.postgrest.aclose()
                
            print("[CLEANUP] Supabase AsyncClient connections closed.")
        except Exception as e:
            print(f"[CLEANUP] Warning: Error during client cleanup: {e}")

app = FastAPI(lifespan=lifespan)

# --- Dependency ---
async def get_supabase(request: Request):
    """
    Dependency to provide the Supabase client from app.state
    """
    client = getattr(request.app.state, "supabase", None)
    if not client:
        # Fallback for safety during initialization or edge cases
        from database import supabase as global_supabase
        client = global_supabase
    
    if not client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    return client

# Mount Static Files
os.makedirs("uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="uploads"), name="static")

# CORS Configuration
# origins = ["*"]  # Invalid with allow_credentials=True

app.add_middleware(
    CORSMiddleware,
    # allow_origins=origins,
    allow_origin_regex="https?://.*", # Allow all http/https origins with credentials
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helpers ---
def mask_name(name: str) -> str:
    if len(name) <= 1:
        return name
    return name[0] + "*" + name[2:] if len(name) > 2 else name[0] + "*"

async def create_audit_log(db: AsyncClient, actor_type: str, action: str, target_id: str, ip_address: str = "0.0.0.0"):
    if db:
        try:
            await db.table("audit_logs").insert({
                "actor_type": actor_type,
                "action": action,
                "target_id": target_id,
                "ip_address": ip_address
            }).execute()
        except Exception as e:
            print(f"[WARN] Audit log failed: {str(e)}")
            pass # Audit logs should not crash the main flow

async def execute_with_retry_async(query_builder):
    """
    Supabase (Async) 쿼리 실행 시 재시도 로직 적용
    """
    import asyncio
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            return await query_builder.execute()
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"[CRITICAL] DB Async Execute failed after {max_retries} attempts: {str(e)}")
                raise e
            print(f"[RETRY] DB async execute attempt {attempt+1} failed: {str(e)}. Retrying...")
            await asyncio.sleep(0.5 * (attempt + 1))

# Removed old safe_db_call and synchronous execute_with_retry

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"message": "PID Backend is running"}

# 개발용: 스테이션 30병상에 맞는 입원 더미 생성 (한 번 호출 후 검사 일정 추가·연동 테스트 가능)
STATION_ROOM_NUMBERS = [
    "301", "302", "303", "304", "305", "306", "307", "308", "309",
    "310-1", "310-2", "311-1", "311-2", "311-3", "311-4",
    "312", "313", "314", "315-1", "315-2", "315-3", "315-4",
    "401-1", "401-2", "401-3", "401-4", "402-1", "402-2", "402-3", "402-4",
]

@app.post("/api/v1/seed/full-test-data")
async def seed_full_test_data(force: bool = True, db: AsyncClient = Depends(get_supabase)):
    """
    [개발용] 통합 데이터 생성기
    force=True이면 기존 입원 정보를 모두 DISCHARGED로 처리하고 새로 생성하여 중복 방지
    """
    if force:
        # 기존 IN_PROGRESS 입원을 모두 DISCHARGED으로 변경 (대청소)
        print("[SEED] Force reset: Marking existing admissions as DISCHARGED")
        await execute_with_retry_async(
            db.table("admissions")
            .update({"status": "DISCHARGED", "discharged_at": datetime.now().isoformat()})
            .eq("status", "IN_PROGRESS")
        )
    
    # 1. Admissions (Optimized)
    res = await execute_with_retry_async(db.table("admissions").select("id, room_number").eq("status", "IN_PROGRESS"))
    admissions_data = res.data or []
    existing_map = {row['room_number']: row['id'] for row in admissions_data}
    
    missing_rooms = [r for r in STATION_ROOM_NUMBERS if r not in existing_map]
    
    import uuid
    import random
    
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
        
        insert_res = await execute_with_retry_async(db.table("admissions").insert(new_admissions))
        inserted_data = insert_res.data or []
        for row in inserted_data:
            existing_map[row['room_number']] = row['id']
            
    admissions_map = existing_map
    created_adms = len(missing_rooms)

    # 2. Vitals (History) - 310-1호(김*아), 302호에 대해 지난 48시간 데이터 생성
    target_rooms = ["310-1", "302", "305"]
    created_vitals = 0
    import random
    from datetime import timedelta

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

@app.post("/api/v1/admissions", response_model=Admission)
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

@app.get("/api/v1/admissions")
async def list_admissions(db: AsyncClient = Depends(get_supabase)):
    # 1. Get active admissions with async retry
    res = await execute_with_retry_async(db.table("admissions").select("*").in_("status", ["IN_PROGRESS", "OBSERVATION"]))
    admissions = res.data or []
    
    # 2. Deduplicate: keep only the latest admission per room_number
    unique_map = {}
    for adm in admissions:
        room = adm['room_number']
        if room not in unique_map:
            unique_map[room] = adm
        else:
            existing = unique_map[room]
            if (adm['status'] == 'IN_PROGRESS' and existing['status'] != 'IN_PROGRESS') or \
               (adm['id'] > existing['id']):
                unique_map[room] = adm
    unique_admissions = list(unique_map.values())
    
    # 3. Enrich with latest IV rate
    for adm in unique_admissions:
        iv_res = await execute_with_retry_async(
            db.table("iv_records")
            .select("infusion_rate, photo_url") # Reverted to original select for photo_url
            .eq("admission_id", adm['id'])
            .order("created_at", desc=True)
            .limit(1)
        )
        if iv_res.data:
            adm['latest_iv'] = iv_res.data[0]
        else:
            adm['latest_iv'] = None
            
    return unique_admissions


@app.get("/api/v1/admissions/{admission_id}/dashboard")
async def get_dashboard_data(admission_id: str, db: AsyncClient = Depends(get_supabase)):
    # 1. Info
    adm_res = await execute_with_retry_async(db.table("admissions").select("*").eq("id", admission_id))
    if not adm_res.data:
        raise HTTPException(status_code=404, detail="Admission not found")
    admission = adm_res.data[0]
    
    # 2. Vitals
    vitals_res = await execute_with_retry_async(db.table("vital_signs").select("*").eq("admission_id", admission_id).order("recorded_at", desc=True).limit(100))
    vitals = vitals_res.data or []
    
    # 3. IV Records
    iv_records_res = await execute_with_retry_async(db.table("iv_records").select("*").eq("admission_id", admission_id).order("created_at", desc=True).limit(50))
    iv_records = iv_records_res.data or []
    
    # 4. Meals
    meals_res = await execute_with_retry_async(db.table("meal_requests").select("*").eq("admission_id", admission_id).order("id", desc=True).limit(5))
    meals = meals_res.data or []

    # 5. Exam Schedules
    exam_schedules_res = await execute_with_retry_async(db.table("exam_schedules").select("*").eq("admission_id", admission_id).order("scheduled_at"))
    exam_schedules = exam_schedules_res.data or []

    await create_audit_log(db, "GUARDIAN", "VIEW", admission_id)

    return {
        "admission": admission,
        "vitals": vitals,
        "iv_records": iv_records,
        "meals": meals,
        "exam_schedules": exam_schedules
    }

@app.post("/api/v1/vitals", response_model=VitalSign)
async def record_vital(vital: VitalSignCreate, db: AsyncClient = Depends(get_supabase)):
    data = vital.dict()
    response = await execute_with_retry_async(db.table("vital_signs").insert(data))
    new_vital = response.data[0]

    await create_audit_log(db, "NURSE", "CREATE_VITAL", str(new_vital['id']))

    # Broadcast to dashboard
    adm_response = await execute_with_retry_async(db.table("admissions").select("access_token").eq("id", vital.admission_id))
    if adm_response.data:
        token = adm_response.data[0]['access_token']
        message = {
            "type": "NEW_VITAL",
            "data": new_vital
        }
        await manager.broadcast(json.dumps(message), token)

    return new_vital

@app.post("/api/v1/iv-records", response_model=IVRecord)
async def record_iv(iv: IVRecordCreate, db: AsyncClient = Depends(get_supabase)):
    try:
        data = iv.dict()
        response = await execute_with_retry_async(db.table("iv_records").insert(data))
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save IV record")
            
        new_iv = response.data[0]
        await create_audit_log(db, "NURSE", "CREATE_IV", str(new_iv['id']))

        message_data = {
            "id": new_iv.get('id'),
            "infusion_rate": new_iv.get('infusion_rate'),
            "photo_url": new_iv.get('photo_url'),
            "created_at": str(new_iv.get('created_at')) if new_iv.get('created_at') else None,
            "admission_id": iv.admission_id,
            "room": None
        }
        
        message_to_send = {
            "type": "NEW_IV",
            "data": message_data
        }

        # 1. Broadcast to Token channel (Guardian Dashboard)
        adm_response = await execute_with_retry_async(db.table("admissions").select("access_token, room_number").eq("id", iv.admission_id))
        if adm_response.data:
            adm_info = adm_response.data[0]
            token = adm_info.get('access_token')
            room = adm_info.get('room_number')
            
            message_data["room"] = room
            json_msg = json.dumps(message_to_send)
            
            if token:
                await manager.broadcast(json_msg, token)
            
            # 2. Broadcast to Station channel
            await manager.broadcast(json_msg, "STATION")
        
        return new_iv
    except Exception as e:
        print(f"[CRITICAL] Error in record_iv: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/meals/requests", response_model=MealRequest)
async def request_meal(request: MealRequestCreate, db: AsyncClient = Depends(get_supabase)):
    data = request.dict()
    response = await execute_with_retry_async(db.table("meal_requests").insert(data))
    new_request = response.data[0]
    
    # Broadcast to station
    adm_response = await execute_with_retry_async(db.table("admissions").select("room_number").eq("id", request.admission_id))
    if adm_response.data:
        room = adm_response.data[0]['room_number']
        message = {
            "type": "NEW_MEAL_REQUEST",
            "data": {
                "room": room,
                "request_type": request.request_type,
                "created_at": datetime.now().isoformat()
            }
        }
        await manager.broadcast(json.dumps(message), "STATION")
    
    return new_request

@app.get("/api/v1/admissions/{admission_id}/exam-schedules", response_model=List[ExamSchedule])
async def list_exam_schedules(admission_id: str, db: AsyncClient = Depends(get_supabase)):
    response = await execute_with_retry_async(db.table("exam_schedules").select("*").eq("admission_id", admission_id).order("scheduled_at"))
    return response.data or []

from fastapi.encoders import jsonable_encoder

@app.post("/api/v1/exam-schedules", response_model=ExamSchedule)
async def create_exam_schedule(schedule: ExamScheduleCreate, db: AsyncClient = Depends(get_supabase)):
    data = jsonable_encoder(schedule)
    response = await execute_with_retry_async(db.table("exam_schedules").insert(data))
    new_schedule = response.data[0]

    # Broadcast to guardian dashboard
    adm_response = await execute_with_retry_async(db.table("admissions").select("access_token").eq("id", schedule.admission_id))
    if adm_response.data:
        token = adm_response.data[0]['access_token']
        message = {
            "type": "NEW_EXAM_SCHEDULE",
            "data": new_schedule
        }
        await manager.broadcast(json.dumps(message), token)

    return new_schedule

@app.delete("/api/v1/exam-schedules/{schedule_id}")
async def delete_exam_schedule(schedule_id: int, db: AsyncClient = Depends(get_supabase)):
    # 1. Get schedule info before deleting (to find admission_id for broadcast)
    res = await execute_with_retry_async(db.table("exam_schedules").select("*").eq("id", schedule_id))
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    target = res.data[0]
    admission_id = target['admission_id']
    
    # 2. Delete
    await execute_with_retry_async(db.table("exam_schedules").delete().eq("id", schedule_id))
    
    # 3. Log
    await create_audit_log(db, "NURSE", "DELETE_EXAM", str(schedule_id))

    # 4. Broadcast removal to guardian dashboard
    adm_res = await execute_with_retry_async(db.table("admissions").select("access_token").eq("id", admission_id))
    if adm_res.data:
        token = adm_res.data[0]['access_token']
        message = {
            "type": "DELETE_EXAM_SCHEDULE",
            "data": {"id": schedule_id}
        }
        await manager.broadcast(json.dumps(message), token)
    
    return {"message": "Deleted successfully"}

@app.post("/api/v1/documents/requests", response_model=DocumentRequest)
async def request_document(request: DocumentRequestCreate, db: AsyncClient = Depends(get_supabase)):
    data = request.dict()
    response = await execute_with_retry_async(db.table("document_requests").insert(data))
    new_request = response.data[0]
    
    # Broadcast to station
    adm_response = await execute_with_retry_async(db.table("admissions").select("room_number").eq("id", request.admission_id))
    if adm_response.data:
        room = adm_response.data[0]['room_number']
        message = {
            "type": "NEW_DOC_REQUEST",
            "data": {
                "room": room,
                "request_items": request.request_items,
                "created_at": datetime.now().isoformat()
            }
        }
        await manager.broadcast(json.dumps(message), "STATION")
    return new_request

@app.post("/api/v1/upload/image")
async def upload_image(file: UploadFile = File(...), token: str = None, db: AsyncClient = Depends(get_supabase)):
    """
    모바일에서 사진 업로드 -> 서버 저장 -> 해당 토큰의 스테이션(웹소켓)으로 URL 전송
    """
    if not token:
        raise HTTPException(status_code=400, detail="Token required")

    file_ext = file.filename.split(".")[-1]
    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{token[:8]}.{file_ext}"
    file_path = f"uploads/{filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    image_url = f"/static/{filename}" # Relative URL for frontend to use with API_BASE
    
    # Get admission info by token to know which room this is
    res = await execute_with_retry_async(db.table("admissions").select("id, room_number").eq("access_token", token))
    if res.data:
        adm = res.data[0]
        message = {
            "type": "IV_PHOTO_UPLOADED",
            "data": {
                "admission_id": adm['id'],
                "room_number": adm['room_number'],
                "photo_url": image_url
            }
        }
        # Broadcast to STATION channel so nurses see it
        await manager.broadcast(json.dumps(message), "STATION")
        
        # Also broadcast to the specific token channel if needed (e.g. for guardian dashboard confirmation)
        await manager.broadcast(json.dumps(message), token)

    return {"url": image_url}

@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    print(f"[WS] Connection attempt for token: {token}")
    await manager.connect(websocket, token)
    try:
        while True:
            await websocket.receive_text() # Keep connection alive, or handle client messages
    except WebSocketDisconnect:
        print(f"[WS] Disconnected token: {token}")
        manager.disconnect(websocket, token)
