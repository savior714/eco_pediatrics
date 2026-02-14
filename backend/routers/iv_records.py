from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from supabase._async.client import AsyncClient
from datetime import datetime
import json
import shutil
import os

from dependencies import get_supabase
from utils import execute_with_retry_async, create_audit_log
from models import IVRecord, IVRecordCreate
from websocket_manager import manager
from logger import logger

router = APIRouter()

@router.post("/iv-records", response_model=IVRecord)
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
        logger.critical(f"Error in record_iv: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), token: str = None, db: AsyncClient = Depends(get_supabase)):
    """
    모바일에서 사진 업로드 -> 서버 저장 -> 해당 토큰의 스테이션(웹소켓)으로 URL 전송
    """
    if not token:
        raise HTTPException(status_code=400, detail="Token required")

    file_ext = file.filename.split(".")[-1]
    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{token[:8]}.{file_ext}"
    file_path = f"uploads/{filename}"
    
    # Ensure uploads directory exists
    os.makedirs("uploads", exist_ok=True)
    
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
        
        # Also broadcast to the specific token channel if needed
        await manager.broadcast(json.dumps(message), token)

    return {"url": image_url}
