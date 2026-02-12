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
    photo_url: str
    drops_per_min: int

class MealRequestCreate(BaseModel):
    admission_id: str
    request_type: str # GENERAL, SOFT, NPO

class DocumentRequest(BaseModel):
    id: Optional[int] = None
    admission_id: str
    request_items: list[str] # RECEIPT, DETAIL, CERT, DIAGNOSIS
    status: str = "PENDING"

class DocumentRequestCreate(BaseModel):
    admission_id: str
    request_items: list[str]
