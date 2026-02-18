import asyncio
import os
import shutil
from datetime import datetime
from fastapi import HTTPException, UploadFile
from supabase._async.client import AsyncClient
from websocket_manager import manager
from logger import logger
from utils import execute_with_retry_async, create_audit_log, broadcast_to_station_and_patient
from models import IVRecordCreate

async def record_iv(db: AsyncClient, iv: IVRecordCreate):
    from datetime import timezone
    data = iv.dict()
    data['created_at'] = datetime.now(timezone.utc).isoformat()
    response = await execute_with_retry_async(db.table("iv_records").insert(data))
    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to save IV record")
        
    new_iv = response.data[0]
    
    async def post_record():
        adm_res = await execute_with_retry_async(db.table("admissions").select("access_token, room_number").eq("id", iv.admission_id).single())
        token = adm_res.data.get('access_token') if adm_res.data else None
        room = adm_res.data.get('room_number') if adm_res.data else None
        
        msg = {
            "type": "NEW_IV",
            "data": {
                "id": new_iv.get('id'),
                "infusion_rate": new_iv.get('infusion_rate'),
                "photo_url": new_iv.get('photo_url'),
                "created_at": str(new_iv.get('created_at')),
                "admission_id": iv.admission_id,
                "room": room 
            }
        }
        await broadcast_to_station_and_patient(manager, msg, token)

    await asyncio.gather(
        create_audit_log(db, "NURSE", "CREATE_IV", str(new_iv['id'])),
        post_record()
    )
    return new_iv

async def upload_iv_photo(db: AsyncClient, file: UploadFile, token: str):
    if not token:
        raise HTTPException(status_code=400, detail="Token required")
        
    if file.content_type not in ["image/jpeg", "image/png", "image/gif", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only images are allowed")
    
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")

    from datetime import timezone
    file_ext = file.filename.split(".")[-1]
    filename = f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{token[:8]}.{file_ext}"
    file_path = f"uploads/{filename}"
    os.makedirs("uploads", exist_ok=True)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    image_url = f"/static/{filename}"
    
    res = await execute_with_retry_async(db.table("admissions").select("id, room_number").eq("access_token", token))
    if res.data:
        adm = res.data[0]
        await create_audit_log(db, "MOBILE_USER", "UPLOAD_PHOTO", adm['id'])
        msg = {
            "type": "IV_PHOTO_UPLOADED",
            "data": {
                "admission_id": adm['id'],
                "room_number": adm['room_number'],
                "photo_url": image_url
            }
        }
        await broadcast_to_station_and_patient(manager, msg, token)

    return {"url": image_url}
