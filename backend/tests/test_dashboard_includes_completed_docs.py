"""
[회귀 테스트] dashboard.py의 document_requests 조회에 status 필터가 없어야 함.
신청된 서류 섹션에 완료 이력이 노출되도록 CRITICAL_LOGIC §3.3 정책 검증.
Import 불필요(정적 소스 분석)로 C 확장 의존성 없이 실행 가능.
"""
from pathlib import Path


def test_dashboard_document_requests_no_status_filter():
    """document_requests 쿼리에 .eq('status' 또는 .eq(\"status\" 존재 시 실패. COMPLETED 포함 조회 정책."""
    dashboard_path = Path(__file__).resolve().parent.parent / "services" / "dashboard.py"
    source = dashboard_path.read_text(encoding="utf-8")

    # document_requests 블록 찾기 (6번째 execute_with_retry_async 호출)
    # status 필터가 있으면 COMPLETED가 제외되므로 금지
    doc_section_start = source.find('db.table("document_requests")')
    assert doc_section_start >= 0, "document_requests 조회 블록이 dashboard.py에 없습니다."

    # 해당 블록 내에 .eq("status" 또는 .eq('status' 가 있으면 안 됨
    doc_section_end = source.find("execute_with_retry_async", doc_section_start)
    block_end = source.find(")", doc_section_end) + 1
    block = source[doc_section_start:block_end]

    forbidden = ['.eq("status"', ".eq('status'", '.eq("status",', ".eq('status',"]
    for pattern in forbidden:
        assert pattern not in block, (
            f"document_requests 쿼리에 status 필터({pattern})를 적용하면 안 됩니다. "
            "COMPLETED 항목이 제외되어 신청된 서류 섹션이 비게 됩니다. CRITICAL_LOGIC §3.3 참고."
        )
