from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from uuid import UUID
from enum import Enum
from models import VitalSign, IVRecord, MealRequest, ExamSchedule, DocumentRequest, GenderEnum

class MealTime(str, Enum):
    BREAKFAST = "BREAKFAST"
    LUNCH = "LUNCH"
    DINNER = "DINNER"
    SNACK = "SNACK"

class MealStatus(str, Enum):
    NORMAL = "NORMAL"
    SOFT = "SOFT"
    FASTING = "FASTING"
    ALLERGY = "ALLERGY"

class CommonMealPlan(BaseModel):
    date: date
    breakfast: Optional[str] = None
    lunch: Optional[str] = None
    dinner: Optional[str] = None
    snack: Optional[str] = None

class PatientMealOverride(BaseModel):
    id: UUID
    admission_id: UUID
    date: date
    meal_time: MealTime
    status: MealStatus
    memo: Optional[str] = None

class PatientMealOverrideCreate(BaseModel):
    admission_id: str
    date: date
    meal_time: MealTime
    status: MealStatus
    memo: Optional[str] = None

class AdmissionResponse(BaseModel):
    id: str
    patient_name_masked: str
    room_number: str
    discharged_at: Optional[datetime] = None
    access_token: Optional[str] = None
    check_in_at: Optional[datetime] = None
    dob: Optional[date] = None
    gender: Optional[GenderEnum] = None
    attending_physician: Optional[str] = None

class DashboardResponse(BaseModel):
    admission: AdmissionResponse
    vitals: list[VitalSign]
    iv_records: list[IVRecord]
    meals: list[MealRequest]
    exam_schedules: list[ExamSchedule]
    document_requests: list[DocumentRequest]
