from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# DB Models
class Admission(BaseModel):
    id: Optional[str] = None
    patient_name_masked: str
<<<<<<< HEAD
    room_number: str
=======
    room_number: int
>>>>>>> 2d3395dda678d838a441952b6c81dee17824df1e
    status: str = "IN_PROGRESS"
    check_in_at: Optional[datetime] = None
    discharged_at: Optional[datetime] = None

class VitalSign(BaseModel):
    id: Optional[int] = None
    admission_id: str
    temperature: float
    has_medication: bool = False
<<<<<<< HEAD
    medication_type: Optional[str] = None # 'A' or 'I'
=======
>>>>>>> 2d3395dda678d838a441952b6c81dee17824df1e
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
<<<<<<< HEAD
    room_number: str
=======
    room_number: int
>>>>>>> 2d3395dda678d838a441952b6c81dee17824df1e

class VitalSignCreate(BaseModel):
    admission_id: str
    temperature: float
    has_medication: bool = False
<<<<<<< HEAD
    medication_type: Optional[str] = None
=======
>>>>>>> 2d3395dda678d838a441952b6c81dee17824df1e

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
