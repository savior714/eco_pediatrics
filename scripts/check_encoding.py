import chardet
from pathlib import Path

file_path = Path(__file__).parent.parent / "eco.bat"

try:
    if not file_path.exists():
        print("File not found.")
    else:
        with open(file_path, 'rb') as f:
            data = f.read()
            result = chardet.detect(data)
            print(f"Encoding: {result['encoding']}")
            print(f"Confidence: {result['confidence']}")
except OSError as e:
    print(f"파일 읽기 오류: {e}")
