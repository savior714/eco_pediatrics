import asyncio
from database import init_supabase
from logger import logger

async def verify_seeded_data():
    db = await init_supabase()
    
    sql = """
    SELECT
      a.patient_name_masked AS "환자명",
      a.room_number AS "병실",
      (SELECT COUNT(*) FROM vital_signs v WHERE v.admission_id = a.id) AS "바이탈 기록",
      (SELECT COUNT(*) FROM iv_records i WHERE i.admission_id = a.id) AS "수액 기록",
      (SELECT COUNT(*) FROM exam_schedules e WHERE e.admission_id = a.id) AS "검사 일정",
      (SELECT COUNT(*) FROM meal_requests m WHERE m.admission_id = a.id) AS "식사 신청"
    FROM public.admissions a
    ORDER BY a.check_in_at DESC
    LIMIT 5;
    """
    
    try:
        # rpc를 사용하여 sql 직접 실행은 보안상 제한될 수 있으므로, 
        # admissions 테이블을 기준으로 데이터를 가져와서 출력을 모사합니다.
        res = await db.table("admissions").select("*").order("check_in_at", desc=True).limit(5).execute()
        admissions = res.data or []
        
        print("\n" + "="*80)
        print(f"{'이름':<10} | {'병실':<6} | {'체온':<6} | {'수액':<6} | {'검사':<6} | {'식단':<6}")
        print("-" * 80) # Changed from 60 to 80 to match original length
        
        for a in admissions:
            m_res = await db.table("meal_requests").select("id", count="exact").eq("admission_id", a["id"]).execute()
            print(f"Room {a.get('room_number')}: Meals={m_res.count}")
        
        print("="*80 + "\n")
        
    except Exception as e:
        print(f"Error during verification: {e}")

if __name__ == "__main__":
    asyncio.run(verify_seeded_data())
