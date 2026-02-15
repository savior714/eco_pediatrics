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

        # 2. Broadcast to Station/Patient
        # We need token and room to broadcast correctly
        adm_response = await execute_with_retry_async(db.table("admissions").select("access_token, room_number").eq("id", iv.admission_id).single())
        
        token = None
        room = None
        
        if adm_response.data:
            token = adm_response.data.get('access_token')
            room = adm_response.data.get('room_number')
        
        # Construct message
        message_data = {
            "id": new_iv.get('id'),
            "infusion_rate": new_iv.get('infusion_rate'),
            "photo_url": new_iv.get('photo_url'),
            "created_at": str(new_iv.get('created_at')) if new_iv.get('created_at') else None,
            "admission_id": iv.admission_id,
            "room": room 
        }
        
        message_to_send = {
            "type": "NEW_IV",
            "data": message_data
        }

        # Broadcast
        json_msg = json.dumps(message_to_send)
        await manager.broadcast(json_msg, "STATION")
        if token:
            await manager.broadcast(json_msg, token)
        
        return new_iv
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in record_iv: {str(e)}")
        # Only raise 500 for truly unexpected errors, but don't mask generic HTTPErrors if they were raised deeper
        raise HTTPException(status_code=500, detail=f"Internal Error: {str(e)}")

@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), token: str = None, db: AsyncClient = Depends(get_supabase)):
    """
    모바일에서 사진 업로드 -> 서버 저장 -> 해당 토큰의 스테이션(웹소켓)으로 URL 전송
    """
    if not token:
        raise HTTPException(status_code=400, detail="Token required")

    # 1. Validation
    if file.content_type not in ["image/jpeg", "image/png", "image/gif", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only images are allowed")
    
    # Check size (10MB limit)
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    
    if size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (Max 10MB)")

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
        
        # Log the upload
        await create_audit_log(db, "MOBILE_USER", "UPLOAD_PHOTO", adm['id'])

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
