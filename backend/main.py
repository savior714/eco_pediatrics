from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime
import json

from database import supabase
from models import Admission, VitalSign, IVRecord, MealRequest, DocumentRequest, ExamSchedule, ExamScheduleCreate, AdmissionCreate, VitalSignCreate, IVRecordCreate, MealRequestCreate, DocumentRequestCreate
from websocket_manager import manager

app = FastAPI()

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

def create_audit_log(actor_type: str, action: str, target_id: str, ip_address: str = "0.0.0.0"):
    if supabase:
        supabase.table("audit_logs").insert({
            "actor_type": actor_type,
            "action": action,
            "target_id": target_id,
            "ip_address": ip_address
        }).execute()

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"message": "PID Backend is running"}

@app.get("/api/v1/admissions", response_model=List[Admission])
def list_admissions():
    """스테이션용: 전체 입원 목록 (병상·검사 연동용)"""
    if not supabase:
        raise HTTPException(status_code=500, detail="DB not connected")
    response = supabase.table("admissions").select("id, patient_name_masked, room_number, status, check_in_at, access_token").eq("status", "IN_PROGRESS").execute()
    return response.data or []

# 개발용: 스테이션 30병상에 맞는 입원 더미 생성 (한 번 호출 후 검사 일정 추가·연동 테스트 가능)
STATION_ROOM_NUMBERS = [
    "301", "302", "303", "304", "305", "306", "307", "308", "309",
    "310-1", "310-2", "311-1", "311-2", "311-3", "311-4",
    "312", "313", "314", "315-1", "315-2", "315-3", "315-4",
    "401-1", "401-2", "401-3", "401-4", "402-1", "402-2", "402-3", "402-4",
]

@app.post("/api/v1/seed/full-test-data")
def seed_full_test_data():
    """
    [개발용] 통합 데이터 생성기
    1. 30개 병상 입원 생성
    2. 최근 2일치 체온 데이터 생성 (310-1, 302호 등 일부)
    3. 미래 검사 일정 생성
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="DB not connected")
    
    # 1. Admissions
    created_adms = 0
    admissions_map = {} # room -> id
    
    for i, room in enumerate(STATION_ROOM_NUMBERS):
        existing = supabase.table("admissions").select("id").eq("room_number", room).eq("status", "IN_PROGRESS").execute()
        if existing.data and len(existing.data) > 0:
            admissions_map[room] = existing.data[0]['id']
            continue
        
        # 새 입원 생성
        res = supabase.table("admissions").insert({
            "patient_name_masked": f"환자{i + 1}",
            "room_number": room,
            "status": "IN_PROGRESS",
            "check_in_at": datetime.now().isoformat() # 오늘 입원한 것으로 처리
        }).execute()
        admissions_map[room] = res.data[0]['id']
        created_adms += 1

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
        check = supabase.table("vital_signs").select("id").eq("admission_id", adm_id).limit(1).execute()
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

            supabase.table("vital_signs").insert({
                "admission_id": adm_id,
                "temperature": round(temp, 1),
                "has_medication": has_med,
                "medication_type": med_type,
                "recorded_at": t.isoformat()
            }).execute()
            created_vitals += 1

    # 3. Exam Schedules - 내일, 모레 일정
    created_exams = 0
    for room in ["310-1", "302"]:
        adm_id = admissions_map.get(room)
        if not adm_id: continue

        check = supabase.table("exam_schedules").select("id").eq("admission_id", adm_id).limit(1).execute()
        if check.data: continue
        
        # 내일 오전 9시
        tomorrow_9am = (base_time + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
        supabase.table("exam_schedules").insert({
            "admission_id": adm_id,
            "scheduled_at": tomorrow_9am.isoformat(),
            "name": "혈액 검사",
            "note": "공복 유지 필요"
        }).execute()
        
        # 모레 오후 2시
        after_2pm = (base_time + timedelta(days=2)).replace(hour=14, minute=0, second=0, microsecond=0)
        supabase.table("exam_schedules").insert({
            "admission_id": adm_id,
            "scheduled_at": after_2pm.isoformat(),
            "name": "흉부 X-Ray"
        }).execute()
        created_exams += 2

    return {
        "message": "통합 더미 데이터 생성 완료",
        "admissions_created": created_adms,
        "vitals_created": created_vitals,
        "exams_created": created_exams
    }

@app.post("/api/v1/admissions", response_model=Admission)
def create_admission(admission: AdmissionCreate):
    masked_name = mask_name(admission.patient_name)
    data = {
        "patient_name_masked": masked_name,
        "room_number": admission.room_number,
        "status": "IN_PROGRESS"
    }
    if supabase:
        response = supabase.table("admissions").insert(data).execute()
        new_admission = response.data[0]
        create_audit_log("NURSE", "CREATE", new_admission['id'])
        return new_admission
    else:
        raise HTTPException(status_code=500, detail="Database connection logic not implemented fully without supabase key")


@app.get("/api/v1/dashboard/{token}")
def get_dashboard_data(token: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="DB not connected")
    
    # 1. Validate Token & Check Status
    response = supabase.table("admissions").select("*").eq("access_token", token).execute()
    if not response.data:
        raise HTTPException(status_code=403, detail="Invalid token")
    
    admission = response.data[0]
    if admission['status'] == 'DISCHARGED':
        raise HTTPException(status_code=403, detail="Patient discharged")

    # 2. Fetch related data (Vitals, IV, Meals) - Simplified for MVP
    # In a real app, we might parallelize or use join if easy, but separate queries are fine for now
    admission_id = admission['id']
    
    vitals = supabase.table("vital_signs").select("*").eq("admission_id", admission_id).order("recorded_at", desc=True).limit(100).execute()
    iv_records = supabase.table("iv_records").select("*").eq("admission_id", admission_id).order("created_at", desc=True).limit(5).execute()
    meals = supabase.table("meal_requests").select("*").eq("admission_id", admission_id).order("id", desc=True).limit(5).execute()
    exam_schedules = supabase.table("exam_schedules").select("*").eq("admission_id", admission_id).order("scheduled_at").execute()

    create_audit_log("GUARDIAN", "VIEW", admission_id)

    return {
        "admission": admission,
        "vitals": vitals.data,
        "iv_records": iv_records.data,
        "meals": meals.data,
        "exam_schedules": exam_schedules.data or []
    }

@app.post("/api/v1/vitals", response_model=VitalSign)
async def record_vital(vital: VitalSignCreate):
    if not supabase:
        raise HTTPException(status_code=500, detail="DB not connected")

    data = vital.dict()
    response = supabase.table("vital_signs").insert(data).execute()
    new_vital = response.data[0]

    create_audit_log("NURSE", "CREATE_VITAL", str(new_vital['id']))

    # Broadcast to dashboard
    # Need to find the token for this admission to broadcast to the right channel
    # Efficiency: Cache token map? For now, query is safer.
    adm_response = supabase.table("admissions").select("access_token").eq("id", vital.admission_id).execute()
    if adm_response.data:
        token = adm_response.data[0]['access_token']
        message = {
            "type": "NEW_VITAL",
            "data": new_vital
        }
        await manager.broadcast(json.dumps(message), token)

    return new_vital

@app.post("/api/v1/iv-records", response_model=IVRecord)
async def record_iv(iv: IVRecordCreate):
    if not supabase:
        raise HTTPException(status_code=500, detail="DB not connected")
        
    data = iv.dict()
    response = supabase.table("iv_records").insert(data).execute()
    new_iv = response.data[0]

    create_audit_log("NURSE", "CREATE_IV", str(new_iv['id']))

    adm_response = supabase.table("admissions").select("access_token").eq("id", iv.admission_id).execute()
    if adm_response.data:
        token = adm_response.data[0]['access_token']
        message = {
            "type": "NEW_IV",
            "data": new_iv
        }
        await manager.broadcast(json.dumps(message), token)
    
    return new_iv

@app.post("/api/v1/meals/requests", response_model=MealRequest)
async def request_meal(request: MealRequestCreate):
    if not supabase:
        raise HTTPException(status_code=500, detail="DB not connected")

    data = request.dict()
    response = supabase.table("meal_requests").insert(data).execute()
    new_request = response.data[0]
    
    # Broadcast to station
    adm_response = supabase.table("admissions").select("room_number").eq("id", request.admission_id).execute()
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
def list_exam_schedules(admission_id: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="DB not connected")
    response = supabase.table("exam_schedules").select("*").eq("admission_id", admission_id).order("scheduled_at").execute()
    return response.data or []

from fastapi.encoders import jsonable_encoder

@app.post("/api/v1/exam-schedules", response_model=ExamSchedule)
async def create_exam_schedule(schedule: ExamScheduleCreate):
    if not supabase:
        raise HTTPException(status_code=500, detail="DB not connected")
    data = jsonable_encoder(schedule)
    response = supabase.table("exam_schedules").insert(data).execute()
    new_schedule = response.data[0]

    # Broadcast to guardian dashboard
    adm_response = supabase.table("admissions").select("access_token").eq("id", schedule.admission_id).execute()
    if adm_response.data:
        token = adm_response.data[0]['access_token']
        message = {
            "type": "NEW_EXAM_SCHEDULE",
            "data": new_schedule
        }
        await manager.broadcast(json.dumps(message), token)

    return new_schedule

@app.delete("/api/v1/exam-schedules/{schedule_id}")
async def delete_exam_schedule(schedule_id: int):
    print(f"[DEBUG] DELETE request for schedule_id: {schedule_id}")
    if not supabase:
        print("[DEBUG] DB not connected")
        raise HTTPException(status_code=500, detail="DB not connected")
    
    # 1. Get schedule info before deleting (to find admission_id for broadcast)
    res = supabase.table("exam_schedules").select("*").eq("id", schedule_id).execute()
    
    if not res.data:
        print("[DEBUG] Schedule not found in DB")
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    target = res.data[0]
    admission_id = target['admission_id']

    # 2. Delete
    supabase.table("exam_schedules").delete().eq("id", schedule_id).execute()

    # 3. Log
    create_audit_log("NURSE", "DELETE_EXAM", str(schedule_id))

    # 4. Broadcast DELETE event to dashboard
    adm_response = supabase.table("admissions").select("access_token").eq("id", admission_id).execute()
    if adm_response.data:
        token = adm_response.data[0]['access_token']
        message = {
            "type": "DELETE_EXAM_SCHEDULE",
            "data": { "id": schedule_id }
        }
        print(f"[DEBUG] Broadcasting DELETE to token: {token}")
        await manager.broadcast(json.dumps(message), token)

    return {"message": "Deleted successfully"}

@app.post("/api/v1/documents/requests", response_model=DocumentRequest)
async def request_document(request: DocumentRequestCreate):
    if not supabase:
        raise HTTPException(status_code=500, detail="DB not connected")

    data = request.dict()
    response = supabase.table("document_requests").insert(data).execute()
    new_request = response.data[0]
    
    # Broadcast to station
    adm_response = supabase.table("admissions").select("room_number").eq("id", request.admission_id).execute()
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
