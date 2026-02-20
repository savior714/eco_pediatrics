import subprocess
from pathlib import Path
import pytest

def test_batch_file_encoding_integrity():
    """
    모든 .bat 파일이 UTF-8 코드 페이지(65001)를 설정하고 있는지 검증
    """
    root_dir = Path(__file__).resolve().parent.parent.parent
    
    # 루트 디렉토리 및 scripts 디렉토리의 모든 bat 파일 검색
    bat_files = list(root_dir.glob("*.bat")) + list((root_dir / "scripts").glob("*.bat"))
    
    for bat_file in bat_files:
        content = bat_file.read_text(encoding='utf-8')
        
        # 1. chcp 65001 명령 포함 여부 확인 (대소문자 무시)
        assert "chcp 65001" in content.lower(), f"{bat_file.name} 에 'chcp 65001' 설정이 누락되었습니다."
        
        # 2. 런타임 출력 검증 (한글 깨짐 테스트)
        # 테스트용 임시 환경 변수 설정 후 실행 결과 캡처
        result = subprocess.run(
            ["cmd.exe", "/c", str(bat_file), "test_encoding"],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        
        # 출력 결과에 유효하지 않은 문자(?)가 과도하게 포함되었는지 검사 (replace 된 문자)
        assert "\ufffd" not in result.stdout, f"{bat_file.name} 실행 결과에서 인코딩 깨짐이 감지되었습니다."
