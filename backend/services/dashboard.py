import asyncio
from fastapi import HTTPException
from supabase._async.client import AsyncClient
from utils import execute_with_retry_async, create_audit_log

async def fetch_dashboard_data(db: AsyncClient, admission_id: str):
    """
    Helper to fetch all related data for a given admission_id in parallel
    """
    # Define all query tasks with explicit column selection to optimize payload size
    tasks = [
        # 1. Admission Info
        execute_with_retry_async(
            db.table("admissions")
            .select("id,patient_name_masked,room_number,status,discharged_at,access_token,dob,gender,check_in_at")
            .eq("id", admission_id)
        ),
        # 2. Vitals
        execute_with_retry_async(
            db.table("vital_signs")
            .select("id,admission_id,temperature,has_medication,medication_type,recorded_at")
            .eq("admission_id", admission_id)
            .order("recorded_at", desc=True)
            .limit(100)
        ),
        # 3. IV Records
        execute_with_retry_async(
            db.table("iv_records")
            .select("id,admission_id,photo_url,infusion_rate,created_at")
            .eq("admission_id", admission_id)
            .order("created_at", desc=True)
            .limit(50)
        ),
        # 4. Meal Requests
        execute_with_retry_async(
            db.table("meal_requests")
            .select("id,admission_id,request_type,pediatric_meal_type,guardian_meal_type,requested_pediatric_meal_type,requested_guardian_meal_type,room_note,meal_date,meal_time,status,created_at")
            .eq("admission_id", admission_id)
            .order("meal_date", desc=True)
            .limit(50)
        ),
        # 5. Exam Schedules
        execute_with_retry_async(
            db.table("exam_schedules")
            .select("id,admission_id,scheduled_at,name,note")
            .eq("admission_id", admission_id)
            .order("scheduled_at")
        ),
        # 6. Document Requests
        execute_with_retry_async(
            db.table("document_requests")
            .select("id,admission_id,request_items,status,created_at")
            .eq("admission_id", admission_id)
            .order("created_at", desc=True)
            .limit(10)
        )
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
    
    if "display_name" not in admission or not admission["display_name"]:
        admission["display_name"] = admission.get("patient_name_masked", "환자")
    
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
