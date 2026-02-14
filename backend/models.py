from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# DB Models
class Admission(BaseModel):
    id: Optional[str] = None
    patient_name_masked: str
    room_number: str
    status: str = "IN_PROGRESS"
    check_in_at: Optional[datetime] = None
    discharged_at: Optional[datetime] = None
    access_token: Optional[str] = None # Added for QR generation

class VitalSign(BaseModel):
    id: Optional[int] = None
    admission_id: str
    temperature: float
    has_medication: bool = False
    medication_type: Optional[str] = None # 'A' or 'I'
    recorded_at: Optional[datetime] = None

class IVRecord(BaseModel):
    id: Optional[int] = None
    admission_id: str
    photo_url: Optional[str] = None
    infusion_rate: Optional[int] = None
    created_at: Optional[datetime] = None

class MealRequest(BaseModel):
    id: Optional[int] = None
    admission_id: str
    request_type: str
    pediatric_meal_type: Optional[str] = None
    guardian_meal_type: Optional[str] = None
    room_note: Optional[str] = None
    status: str = "PENDING"

# DTOs
class AdmissionCreate(BaseModel):
    patient_name: str  # Raw name, will be masked in logic
    room_number: str

class VitalSignCreate(BaseModel):
    admission_id: str
    temperature: float
    has_medication: bool = False
    medication_type: Optional[str] = None

class IVRecordCreate(BaseModel):
    admission_id: str
    photo_url: Optional[str] = None
    infusion_rate: int  # cc/hr

class MealRequestCreate(BaseModel):
    admission_id: str
    request_type: str # OLD: GENERAL, etc. Keeping for backward compat logic if needed
    pediatric_meal_type: Optional[str] = None
    guardian_meal_type: Optional[str] = None
    room_note: Optional[str] = None

class DocumentRequest(BaseModel):
    id: Optional[int] = None
    admission_id: str
    request_items: list[str] # RECEIPT, DETAIL, CERT, DIAGNOSIS
    status: str = "PENDING"

class DocumentRequestCreate(BaseModel):
    admission_id: str
    request_items: list[str]

class ExamSchedule(BaseModel):
    id: Optional[int] = None
    admission_id: str
    scheduled_at: datetime
    name: str
    note: Optional[str] = ""

class ExamScheduleCreate(BaseModel):
    admission_id: str
    scheduled_at: datetime
    name: str
    note: Optional[str] = ""

class TransferRequest(BaseModel):
    target_room: str
