from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import Optional, List
from supabase._async.client import AsyncClient
from datetime import datetime
import json

from dependencies import get_supabase, get_admission_token_optional, verify_admission_token
from utils import execute_with_retry_async
from services.dashboard import fetch_dashboard_data
from services.station_service import fetch_pending_requests
from websocket_manager import manager
from models import MealRequest, MealRequestCreate, DocumentRequest, DocumentRequestCreate
from schemas import DashboardResponse

router = APIRouter()

@router.get("/dashboard/{token}", response_model=DashboardResponse)
async def get_dashboard_data_by_token(
    token: str, 
    db: AsyncClient = Depends(get_supabase),
    header_token: Optional[str] = Depends(get_admission_token_optional)
):
    """
    Fetch dashboard data using an access_token (Guardian view)
    Supports both path parameter (token) and X-Admission-Token header.
    """
    # Use header token if provided and valid, otherwise fallback to path token
    effective_token = header_token if header_token else token

    res = await execute_with_retry_async(
        db.table("admissions")
        .select("id")
        .eq("access_token", effective_token)
        .in_("status", ["IN_PROGRESS", "OBSERVATION"]) # Enforce active status
        .limit(1)
    )
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Invalid or inactive admission token")

    admission_id = res.data[0]['id']
    return await fetch_dashboard_data(db, admission_id)
    
@router.get("/station/pending-requests")
async def get_pending_requests(db: AsyncClient = Depends(get_supabase)):
    """Fetch all pending notifications for the station sidebar"""
    return await fetch_pending_requests(db)



@router.post("/documents/requests", response_model=DocumentRequest)
async def request_document(
    request: DocumentRequestCreate, 
    db: AsyncClient = Depends(get_supabase),
    token: str = Depends(verify_admission_token)
):
    # Verify admission is active AND token matches (Security Boundary)
    adm_res = await execute_with_retry_async(
        db.table("admissions")
        .select("room_number, access_token")
        .eq("id", request.admission_id)
        .in_("status", ["IN_PROGRESS", "OBSERVATION"])
        .single()
    )
    if not adm_res.data:
        raise HTTPException(status_code=403, detail="Invalid admission ID or patient already discharged")
        
    if adm_res.data["access_token"] != token:
        raise HTTPException(status_code=403, detail="Admission token mismatch")

    # Deduplication Check: Check for existing PENDING requests with same items
    # Sort request items to ensure consistent comparison
    request_items_sorted = sorted(request.request_items)
    
    existing_requests = await execute_with_retry_async(
        db.table("document_requests")
        .select("*")
        .eq("admission_id", request.admission_id)
        .eq("status", "PENDING")
    )
    
    if existing_requests.data:
        for existing in existing_requests.data:
            if sorted(existing.get("request_items", [])) == request_items_sorted:
                logger.info(f"Duplicate document request detected for admission {request.admission_id}. Skipping insertion.")
                return existing # Return existing one instead of creating duplicate

    data = request.dict()
    response = await execute_with_retry_async(db.table("document_requests").insert(data))
    new_request = response.data[0]
    
    # Broadcast to station and the specific admission (for real-time update in sub-modal/guardian)
    room = adm_res.data['room_number']
    message = {
        "type": "NEW_DOC_REQUEST",
        "data": {
            "id": new_request['id'],
            "room": room,
            "admission_id": request.admission_id, # Added for context
            "request_items": request.request_items,
            "created_at": datetime.now().isoformat()
        }
    }
    await manager.broadcast(json.dumps(message), "STATION")
    await manager.broadcast(json.dumps(message), token)
    return new_request

@router.patch("/documents/requests/{request_id}", response_model=DocumentRequest)
async def update_document_request_status(
    request_id: int,
    status: str,
    db: AsyncClient = Depends(get_supabase)
):
    """Update document request status (e.g., PENDING -> COMPLETED)"""
    # 1. 상태 업데이트 수행
    await execute_with_retry_async(
        db.table("document_requests")
        .update({"status": status})
        .eq("id", request_id)
    )
    
    # 2. 브로드캐스트 데이터 조회 (join 포함)
    response = await execute_with_retry_async(
        db.table("document_requests")
        .select("*, admissions(room_number, access_token)")
        .eq("id", request_id)
    )
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Request not found")
    
    updated_request = response.data[0]
    
    # 3. STATION 및 해당 환자 채널 브로드캐스트
    admission_data = updated_request.get('admissions', {})
    room_number = admission_data.get('room_number') if isinstance(admission_data, dict) else None
    admission_token = admission_data.get('access_token') if isinstance(admission_data, dict) else None

    message = {
        "type": "DOC_REQUEST_UPDATED",
        "data": {
            "id": updated_request['id'],
            "status": status,
            "room": room_number
        }
    }
    await manager.broadcast(json.dumps(message), "STATION")
    if admission_token:
        await manager.broadcast(json.dumps(message), admission_token)
    
    return updated_request

@router.patch("/meals/requests/{request_id}", response_model=MealRequest)
async def update_meal_request_status(
    request_id: int,
    status: str,
    db: AsyncClient = Depends(get_supabase)
):
    """Update meal request status"""
    response = await execute_with_retry_async(
        db.table("meal_requests")
        .update({"status": status})
        .eq("id", request_id)
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Request not found")
    return response.data[0]
