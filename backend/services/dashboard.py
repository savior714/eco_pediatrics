from fastapi import HTTPException
from supabase._async.client import AsyncClient
from utils import execute_with_retry_async, create_audit_log

async def fetch_dashboard_data(db: AsyncClient, admission_id: str):
    """
    Helper to fetch all related data for a given admission_id
    """
    # 1. Info
    adm_res = await execute_with_retry_async(db.table("admissions").select("*").eq("id", admission_id))
    if not adm_res.data:
        raise HTTPException(status_code=404, detail="Admission not found")
    admission = adm_res.data[0]
    
    # Contract: Ensure display_name is populated
    # Currently defaults to patient_name_masked, but allows for future overrides (e.g. nickname)
    if "display_name" not in admission or not admission["display_name"]:
         admission["display_name"] = admission.get("patient_name_masked", "환자")
    
    # 2. Vitals
    vitals_res = await execute_with_retry_async(db.table("vital_signs").select("*").eq("admission_id", admission_id).order("recorded_at", desc=True).limit(100))
    vitals = vitals_res.data or []
    
    # 3. IV Records
    iv_records_res = await execute_with_retry_async(db.table("iv_records").select("*").eq("admission_id", admission_id).order("created_at", desc=True).limit(50))
    iv_records = iv_records_res.data or []
    
    # 4. Meals
    # Fetch more to sort by date/time in memory (ID desc is good proxy but not perfect if back-filled)
    meals_res = await execute_with_retry_async(db.table("meal_requests").select("*").eq("admission_id", admission_id).order("id", desc=True).limit(20))
    meals_raw = meals_res.data or []
    
    def meal_sort_key(m):
        d = m.get('meal_date') or ''
        t = m.get('meal_time')
        # Priority: DINNER(3) > LUNCH(2) > BREAKFAST(1)
        rank = 0
        if t == 'BREAKFAST': rank = 1
        elif t == 'LUNCH': rank = 2
        elif t == 'DINNER': rank = 3
        # Tie-breaker: ID (descending)
        return (d, rank, m.get('id', 0))

    meals_raw.sort(key=meal_sort_key, reverse=True)
    meals = meals_raw[:5]

    # 5. Exam Schedules
    exam_schedules_res = await execute_with_retry_async(db.table("exam_schedules").select("*").eq("admission_id", admission_id).order("scheduled_at"))
    exam_schedules = exam_schedules_res.data or []

    # 6. Document requests (퇴원 전 서류 신청)
    doc_res = await execute_with_retry_async(db.table("document_requests").select("*").eq("admission_id", admission_id).order("created_at", desc=True).limit(10))
    document_requests = doc_res.data or []

    await create_audit_log(db, "GUARDIAN", "VIEW", admission_id)

    return {
        "admission": admission,
        "vitals": vitals,
        "iv_records": iv_records,
        "meals": meals,
        "exam_schedules": exam_schedules,
        "document_requests": document_requests
    }
