from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime
import json

from database import supabase
from models import Admission, VitalSign, IVRecord, MealRequest, DocumentRequest, AdmissionCreate, VitalSignCreate, IVRecordCreate, MealRequestCreate, DocumentRequestCreate
from websocket_manager import manager

app = FastAPI()

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

    create_audit_log("GUARDIAN", "VIEW", admission_id)

    return {
        "admission": admission,
        "vitals": vitals.data,
        "iv_records": iv_records.data,
        "meals": meals.data
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
    await manager.connect(websocket, token)
    try:
        while True:
            await websocket.receive_text() # Keep connection alive, or handle client messages
    except WebSocketDisconnect:
        manager.disconnect(websocket, token)
