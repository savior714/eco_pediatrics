import asyncio
from fastapi import HTTPException
from supabase._async.client import AsyncClient
from utils import execute_with_retry_async, create_audit_log

async def fetch_dashboard_data(db: AsyncClient, admission_id: str):
    """
    Helper to fetch all related data for a given admission_id in parallel
    """
    # Define all query tasks
    tasks = [
        execute_with_retry_async(db.table("admissions").select("id, patient_name_masked, room_number, check_in_at, dob, gender, status").eq("id", admission_id)),
        execute_with_retry_async(db.table("vital_signs").select("id, admission_id, temperature, has_medication, medication_type, recorded_at").eq("admission_id", admission_id).order("recorded_at", desc=True).limit(100)),
        execute_with_retry_async(db.table("iv_records").select("id, admission_id, photo_url, infusion_rate, created_at").eq("admission_id", admission_id).order("created_at", desc=True).limit(50)),
        execute_with_retry_async(db.table("meal_requests").select("id, admission_id, request_type, pediatric_meal_type, guardian_meal_type, meal_date, meal_time, status, created_at").eq("admission_id", admission_id).order("meal_date", desc=True).limit(50)),
        execute_with_retry_async(db.table("exam_schedules").select("id, admission_id, scheduled_at, name, note").eq("admission_id", admission_id).order("scheduled_at")),
        execute_with_retry_async(db.table("document_requests").select("id, admission_id, request_items, status, created_at").eq("admission_id", admission_id).order("created_at", desc=True).limit(10))
    ]
    
    # Execute in parallel
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Extract results and handle potential exceptions from gather
    for res in results:
        if isinstance(res, Exception):
            raise res

    adm_res, vitals_res, iv_records_res, meals_res, exam_schedules_res, doc_res = results

    # 1. Info
    if not adm_res.data:
        raise HTTPException(status_code=404, detail="Admission not found")
    admission = adm_res.data[0]
    
    # Ensure name fallback
    if not admission.get("patient_name_masked"):
        admission["patient_name_masked"] = "환자"
    
    # 2. Vitals
    vitals = vitals_res.data or []
    
    # 3. IV Records
    iv_records = iv_records_res.data or []
    
    # 4. Meals
    meals = meals_res.data or []

    # 5. Exam Schedules
    exam_schedules = exam_schedules_res.data or []

    # 6. Document requests
    document_requests = doc_res.data or []

    # Fire and forget audit log to avoid blocking response
    # The inner function handles its own exceptions
    asyncio.create_task(create_audit_log(db, "GUARDIAN", "VIEW", admission_id))

    return {
        "admission": admission,
        "vitals": vitals,
        "iv_records": iv_records,
        "meals": meals,
        "exam_schedules": exam_schedules,
        "document_requests": document_requests
    }
