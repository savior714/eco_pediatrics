from supabase._async.client import AsyncClient
from datetime import date
from utils import execute_with_retry_async
from typing import List, Dict
from constants.meal_config import SKIPPED_MEAL_KEYWORDS, DEFAULT_PEDIATRIC_MEAL, DISPLAY_SKIPPED_SYMBOL, MEAL_DISPLAY_MAPPING

async def fetch_pending_requests(db: AsyncClient) -> List[Dict]:
    """
    Fetch all pending meal and document requests for the station dashboard sidebar.
    """
    # 1. Fetch pending meals
    meals_task = execute_with_retry_async(
        db.table("meal_requests")
        .select("id, admission_id, request_type, meal_date, meal_time, pediatric_meal_type, guardian_meal_type, requested_pediatric_meal_type, requested_guardian_meal_type, created_at, admissions!inner(room_number)")
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
        
        meal_info = format_meal_notification_data(m)
        
        notifications.append({
            "id": f"meal_{m['id']}",
            "room": room,
            "time": m['created_at'],
            "meal_date": m.get('meal_date'),
            "meal_rank": {'BREAKFAST': 0, 'LUNCH': 1, 'DINNER': 2}.get(m.get('meal_time'), 9),
            "content": f"[{meal_info['date_label']} {meal_info['time_label']}] 식단 신청 ({meal_info['meal_desc']})",
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
            "meal_date": None,
            "meal_rank": 0,
            "content": f"서류 신청 ({', '.join(item_names)})",
            "type": "doc",
            "admissionId": d['admission_id']
        })
        
    # Sort by time descending (Primary)
    # Then by meal_date ascending (Secondary)
    # Then by meal_rank ascending (Tertiary)
    # Since we want descending for time but ascending for the others, we can do it in two steps
    # or use a custom key if time wasn't string. As strings:
    notifications.sort(key=lambda x: (x['meal_date'] or '', x['meal_rank']))
    notifications.sort(key=lambda x: x['time'], reverse=True)
    return notifications

def format_meal_notification_data(m: Dict) -> Dict:
    """Helper to format meal request data into display labels"""
    # 1. Meal Type (Prioritize requested over current)
    pediatric = m.get('requested_pediatric_meal_type') or m.get('pediatric_meal_type')
    if not pediatric:
        pediatric = DEFAULT_PEDIATRIC_MEAL
    elif pediatric in SKIPPED_MEAL_KEYWORDS:
        pediatric = DISPLAY_SKIPPED_SYMBOL
    else:
        pediatric = MEAL_DISPLAY_MAPPING.get(pediatric, pediatric)
        
    guardian = m.get('requested_guardian_meal_type') or m.get('guardian_meal_type')
    if not guardian or guardian in SKIPPED_MEAL_KEYWORDS:
        guardian = DISPLAY_SKIPPED_SYMBOL
    else:
        guardian = MEAL_DISPLAY_MAPPING.get(guardian, guardian)
        
    meal_desc = f"{pediatric}/{guardian}"

    # 2. Time Label
    m_time = m.get('meal_time')
    time_map = {'BREAKFAST': '아침', 'LUNCH': '점심', 'DINNER': '저녁'}
    time_label = time_map.get(m_time, m_time)

    # 3. Date Label
    m_date = m.get('meal_date')
    date_label = ""
    if m_date:
        try:
            d_obj = date.fromisoformat(m_date) if isinstance(m_date, str) else m_date
            date_label = d_obj.strftime("%m/%d")
        except:
            date_label = str(m_date)

    return {
        "meal_desc": meal_desc,
        "time_label": time_label,
        "date_label": date_label
    }
