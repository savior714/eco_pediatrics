"""
[회귀 테스트] 환경 설정 무결성 검증.
협업/환경 이전 시 .env.local 누락으로 인한 DEV UI 비노출을 방지합니다.
"""
import pytest
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def test_dev_ui_config_exists():
    """
    [회귀 테스트] 스테이션 대시보드의 DEV 버튼 노출을 위한
    환경 변수가 .env.local에 정의되어 있는지 확인합니다.
    """
    env_path = _REPO_ROOT / "frontend" / ".env.local"

    assert env_path.exists(), (
        f"CRITICAL: {env_path} 파일이 없습니다. .env.example을 복사하여 생성하세요."
    )

    content = env_path.read_text(encoding="utf-8")
    required_var = "NEXT_PUBLIC_ENABLE_DEV_UI=true"

    assert required_var in content, (
        f"ERROR: {required_var} 설정이 누락되었습니다. "
        "스테이션 대시보드에서 DEV 버튼이 보이지 않을 수 있습니다."
    )


def test_critical_logic_doc_exists():
    """SSOT 문서가 지정된 위치에 존재하는지 확인합니다."""
    ssot_path = _REPO_ROOT / "docs" / "CRITICAL_LOGIC.md"
    assert ssot_path.exists(), "SSOT(CRITICAL_LOGIC.md) 문서가 누락되었습니다."
