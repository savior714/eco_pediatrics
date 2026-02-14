from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from models import VitalSign, IVRecord, MealRequest, ExamSchedule, DocumentRequest

class AdmissionResponse(BaseModel):
    id: str
    patient_name_masked: str
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
