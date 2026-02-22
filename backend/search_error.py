"""
멀티라인 Supabase 쿼리 오류 패턴 검색
.eq(), .in_(), .update(), .delete() 뒤에 .select()가 오는 BAD 패턴 강제 검출
"""
import os
import re

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
                    print(f"FOUND BAD PATTERN IN: {path} (line {line_no})")
                    print(f"  Context: ...{ctx}...")
                    print()
            except Exception as e:
                print(f"Error reading {path}: {e}")
