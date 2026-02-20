"""
Regression: 로컬 개발 시 스테이션 DEV 버튼(전체퇴원/환자추가) 노출 조건.
frontend/.env.local 이 존재할 때 NEXT_PUBLIC_ENABLE_DEV_UI=true 여야 빌드에 반영됨.
CI 등에서는 .env.local 이 없을 수 있으므로 파일 없으면 skip.
"""
import pytest
from pathlib import Path


def _frontend_env_local() -> Path:
    return Path(__file__).resolve().parent.parent.parent / "frontend" / ".env.local"


@pytest.mark.skipif(
    not _frontend_env_local().exists(),
    reason="frontend/.env.local not present (e.g. CI); dev UI env check skipped",
)
def test_dev_ui_env_set_when_env_local_exists():
    """frontend/.env.local 이 있으면 DEV UI 활성화 변수가 설정되어 있어야 함 (로컬 개발 시 버튼 노출)."""
    path = _frontend_env_local()
    content = path.read_text(encoding="utf-8")
    assert "NEXT_PUBLIC_ENABLE_DEV_UI=true" in content, (
        "frontend/.env.local에 NEXT_PUBLIC_ENABLE_DEV_UI=true를 설정하세요. "
        "설정 후 개발 서버(npm run dev / npm run tauri dev)를 재시작해야 스테이션 DEV 버튼이 보입니다."
    )
