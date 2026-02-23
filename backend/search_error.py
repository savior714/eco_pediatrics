"""
멀티라인 Supabase 쿼리 오류 패턴 검색
.eq(), .in_(), .update(), .delete() 뒤에 .select()가 오는 BAD 패턴 강제 검출
"""
import os
import re
import sys

# backend/ 에서 실행하거나 프로젝트 루트에서 backend/search_error.py 실행 시 logger 로드
_backend = os.path.dirname(os.path.abspath(__file__))
if _backend not in sys.path:
    sys.path.insert(0, _backend)
from logger import logger

# .eq() 또는 .in_(), update, delete 뒤에 .select( 가 오는 멀티라인 패턴
# (필터/update/delete) ... (공백/줄바꿈) ... .select(
pattern = re.compile(
    r'\.(eq|in_|neq|gt|lt|gte|lte|update|delete)\s*\([^)]*\)[\s\n]*\.select\s*\(',
    re.DOTALL
)

for root, dirs, files in os.walk('backend'):
    # scripts 제외 (런타임 로직 아님)
    dirs[:] = [d for d in dirs if d != '__pycache__']
    for file in files:
        if file.endswith('.py') and file != 'search_error.py':
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                matches = pattern.finditer(content)
                for m in matches:
                    # 라인 번호 계산
                    line_no = content[:m.start()].count('\n') + 1
                    ctx = m.group(0).replace('\n', ' ')[:120]
                    logger.info("FOUND BAD PATTERN IN: %s (line %s)", path, line_no)
                    logger.info("  Context: ...%s...", ctx)
            except Exception as e:
                logger.error("Error reading %s: %s", path, e)
