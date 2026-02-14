from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
from uuid import UUID
from enum import Enum
from models import VitalSign, IVRecord, MealRequest, ExamSchedule, DocumentRequest

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
    display_name: str
    room_number: str
    check_in_at: Optional[datetime]
    discharged_at: Optional[datetime]
    access_token: Optional[str]

class DashboardResponse(BaseModel):
    admission: AdmissionResponse
    vitals: List[VitalSign]
    iv_records: List[IVRecord]
    meals: List[MealRequest]
    exam_schedules: List[ExamSchedule]
    document_requests: List[DocumentRequest]
