from supabase._async.client import AsyncClient
from utils import execute_with_retry_async
from typing import List, Dict

async def fetch_pending_requests(db: AsyncClient) -> List[Dict]:
    """
    Fetch all pending meal and document requests for the station dashboard sidebar.
    """
    # 1. Fetch pending meals
    meals_task = execute_with_retry_async(
        db.table("meal_requests")
        .select("id, admission_id, request_type, meal_date, meal_time, pediatric_meal_type, guardian_meal_type, created_at, admissions!inner(room_number)")
        .eq("status", "PENDING")
        .order("created_at", desc=True)
    )
    
    # 2. Fetch pending document requests
    docs_task = execute_with_retry_async(
        db.table("document_requests")
        .select("id, admission_id, request_items, created_at, admissions!inner(room_number)")
        .eq("status", "PENDING")
        .order("created_at", desc=True)
    )
    
    import asyncio
    meals_res, docs_res = await asyncio.gather(meals_task, docs_task)
    
    notifications = []
    
    # Process Meals
    for m in (meals_res.data or []):
        admissions_data = m.get('admissions') or {}
        room = admissions_data.get('room_number', '??')
        pediatric = m.get('pediatric_meal_type')
        guardian = m.get('guardian_meal_type')
        
        meal_desc = pediatric if pediatric else m.get('request_type', '식사')
        if guardian and guardian != '신청 안함':
            meal_desc += f" / {guardian}"
            
        # Format Date & Time
        m_date = m.get('meal_date') # '2026-02-19'
        m_time = m.get('meal_time') # 'BREAKFAST'
        time_map = {'BREAKFAST': '아침', 'LUNCH': '점심', 'DINNER': '저녁'}
        time_label = time_map.get(m_time, m_time)
        
        date_label = ""
        if m_date:
            try:
                # 2026-02-19 -> 02/19
                d_obj = date.fromisoformat(m_date) if isinstance(m_date, str) else m_date
                date_label = d_obj.strftime("%m/%d")
            except:
                date_label = str(m_date)

        notifications.append({
            "id": f"meal_{m['id']}",
            "room": room,
            "time": m['created_at'],
            "content": f"[{date_label} {time_label}] 식단 신청 ({meal_desc})",
            "type": "meal",
            "admissionId": m['admission_id']
        })
        
    # Process Docs
    from constants.mappings import DOC_MAP
    for d in (docs_res.data or []):
        admissions_data = d.get('admissions') or {}
        room = admissions_data.get('room_number', '??')
        items = d.get('request_items', [])
        item_names = [DOC_MAP.get(it, it) for it in items]
        
        notifications.append({
            "id": f"doc_{d['id']}",
            "room": room,
            "time": d['created_at'],
            "content": f"서류 신청 ({', '.join(item_names)})",
            "type": "doc",
            "admissionId": d['admission_id']
        })
        
    # Sort by time descending
    notifications.sort(key=lambda x: x['time'], reverse=True)
    return notifications
