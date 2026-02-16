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
        execute_with_retry_async(db.table("admissions").select("*").eq("id", admission_id)),
        execute_with_retry_async(db.table("vital_signs").select("*").eq("admission_id", admission_id).order("recorded_at", desc=True).limit(100)),
        execute_with_retry_async(db.table("iv_records").select("*").eq("admission_id", admission_id).order("created_at", desc=True).limit(50)),
        execute_with_retry_async(db.table("meal_requests").select("*").eq("admission_id", admission_id).order("id", desc=True).limit(20)),
        execute_with_retry_async(db.table("exam_schedules").select("*").eq("admission_id", admission_id).order("scheduled_at")),
        execute_with_retry_async(db.table("document_requests").select("*").eq("admission_id", admission_id).order("created_at", desc=True).limit(10))
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
    meals_raw = meals_res.data or []
    def meal_sort_key(m):
        d = m.get('meal_date') or ''
        t = m.get('meal_time')
        rank = 0
        if t == 'BREAKFAST': rank = 1
        elif t == 'LUNCH': rank = 2
        elif t == 'DINNER': rank = 3
        return (d, rank, m.get('id', 0))

    meals_raw.sort(key=meal_sort_key, reverse=True)
    meals = meals_raw[:5]

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
