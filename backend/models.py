from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime, date, timedelta

from enum import Enum

class Status(str, Enum):
    IN_PROGRESS = "IN_PROGRESS"
    OBSERVATION = "OBSERVATION"
    DISCHARGED = "DISCHARGED"

class GenderEnum(str, Enum):
    M = "M"
    F = "F"

class MealTime(str, Enum):
    BREAKFAST = 'BREAKFAST'
    LUNCH = 'LUNCH'
    DINNER = 'DINNER'

# DB Models
class Admission(BaseModel):

    id: Optional[str] = None
    patient_name_masked: str
    room_number: str
    status: Status = Status.IN_PROGRESS
    discharged_at: Optional[datetime] = None
    access_token: Optional[str] = None # Added for QR generation
    dob: Optional[date] = None
    gender: Optional[GenderEnum] = None
    check_in_at: Optional[datetime] = None

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
    requested_pediatric_meal_type: Optional[str] = None
    requested_guardian_meal_type: Optional[str] = None
    room_note: Optional[str] = None
    meal_date: Optional[date] = None
    meal_time: Optional[str] = None
    status: str = "PENDING"
    created_at: Optional[datetime] = None

# DTOs
class AdmissionCreate(BaseModel):
    patient_name: str  # Raw name, will be masked in logic
    room_number: str
    dob: Optional[date] = None
    gender: Optional[GenderEnum] = None
    check_in_at: Optional[datetime] = None

    @field_validator('dob')
    @classmethod
    def validate_dob(cls, v: Optional[date]) -> Optional[date]:
        if v and v > date.today():
             raise ValueError('생년월일은 미래 날짜일 수 없습니다.')
        return v

    @field_validator('check_in_at')
    @classmethod
    def validate_check_in(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v:
            # Allow up to 1 hour in the future to account for clock skew
            now = datetime.now(v.tzinfo) if v.tzinfo else datetime.now()
            if v > now + timedelta(hours=1):
                 raise ValueError('입원 일시는 미래 시점일 수 없습니다.')
        return v

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
    request_type: str = "STATION_UPDATE"
    pediatric_meal_type: Optional[str] = None
    guardian_meal_type: Optional[str] = None
    room_note: Optional[str] = None
    meal_date: date
    meal_time: MealTime

class DocumentRequest(BaseModel):
    id: Optional[int] = None
    admission_id: str
    request_items: list[str] # RECEIPT, DETAIL, CERT, DIAGNOSIS
    status: str = "PENDING"
    created_at: Optional[datetime] = None

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
