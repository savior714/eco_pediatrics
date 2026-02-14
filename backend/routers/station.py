from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from supabase._async.client import AsyncClient
from datetime import datetime
import json

from dependencies import get_supabase
from utils import execute_with_retry_async
from services.dashboard import fetch_dashboard_data
from websocket_manager import manager
from models import MealRequest, MealRequestCreate, DocumentRequest, DocumentRequestCreate
from schemas import DashboardResponse

router = APIRouter()

@router.get("/dashboard/{token}", response_model=DashboardResponse)
async def get_dashboard_data_by_token(token: str, db: AsyncClient = Depends(get_supabase)):
    """
    Fetch dashboard data using an access_token (Guardian view)
    """
    res = await execute_with_retry_async(
        db.table("admissions")
        .select("id")
        .eq("access_token", token)
        .limit(1)
    )
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Invalid token")

    admission_id = res.data[0]['id']
    return await fetch_dashboard_data(db, admission_id)



@router.post("/documents/requests", response_model=DocumentRequest)
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
