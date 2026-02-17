from fastapi import APIRouter, Depends, File, UploadFile
from supabase._async.client import AsyncClient
from dependencies import get_supabase
from services import iv_service
from models import IVRecord, IVRecordCreate

router = APIRouter()

@router.post("/iv-records", response_model=IVRecord)
async def record_iv(iv: IVRecordCreate, db: AsyncClient = Depends(get_supabase)):
    return await iv_service.record_iv(db, iv)

@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...), token: str = None, db: AsyncClient = Depends(get_supabase)):
    return await iv_service.upload_iv_photo(db, file, token)
