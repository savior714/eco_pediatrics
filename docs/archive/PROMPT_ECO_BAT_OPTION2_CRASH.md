# 프롬프트: eco.bat 2번(Setup) 선택 시 터미널 크래시

**해결됨 (2026-03-02)**  
Setup 전체를 **PowerShell** `scripts/Setup-Environment.ps1`로 이관하고, eco.bat은 해당 스크립트만 호출하도록 변경함. ProjectRoot 인자 끝 `\` 제거로 경로 파싱 오류도 수정. 인코딩 문제 시 `pwsh -File scripts\Fix-BatEncoding.ps1` 실행. 자세한 내용은 TROUBLESHOOTING §11 및 DEV_ENVIRONMENT §3·§6 참고.

---

아래 블록은 참고용으로 보관. 다른 LLM(Claude, GPT, Gemini 등)에 동일 이슈 문의 시 복사해 사용할 수 있음.

---

## 프롬프트 본문 (복사용)

```
[문제]
Windows에서 eco.bat을 실행하면 메뉴가 뜨고, [1] [2] [3] [Q] 중에서 선택할 수 있다.
그런데 [2] Environment Setup (Install Deps)을 누르면 곧바로 터미널(창)이 크래시하거나 닫힌다.
에러 메시지 없이 창이 사라져서 원인 파악이 어렵다.

[환경]
- Windows 11, cmd.exe 또는 Windows Terminal에서 eco.bat 실행
- 프로젝트 루트에 eco.bat 있음. scripts\ 폴더에 Refresh-BuildEnv.ps1, Get-SdkVersion.ps1 있음
- eco.bat은 ANSI(CP949)로 저장하는 것이 원칙이며, 인코딩 변환 스크립트(Fix-BatEncoding.ps1)로 CP949 저장까지 시도한 상태

[2번 선택 시 실행 흐름 요약]
1. :setup 레이블로 이동
2. logs 폴더 생성, SETUP_LOG 설정
3. python / node / uv 존재 여부 검사 (실패 시 goto setup_fail)
4. backend 폴더로 이동, .venv 없으면 uv venv .venv --python 3.14
5. "Configuring Build Environment (SDK Discovery)..." 출력
6. powershell -File "%~dp0scripts\Refresh-BuildEnv.ps1" 실행
7. set "SDK_VER=" 후 powershell -File Get-SdkVersion.ps1 -OutFile "%~dp0logs\sdk_ver.txt"
8. if exist sdk_ver.txt 이면 set /p SDK_VER=< 해당 파일
9. set "PF86=%ProgramFiles(x86)%"
10. if defined SDK_VER ( ... INCLUDE/LIB/PATH 설정 ... ) else ( SDK not found 메시지 )
11. uv pip install ...

[이미 시도한 것]
- 배치 파일 인코딩: UTF-8이면 cmd가 첫 줄부터 잘못 해석해 창이 닫힌다는 문서(TROUBLESHOOTING §8)에 따라, eco.bat을 ANSI(CP949)로 재저장하는 스크립트(Fix-BatEncoding.ps1) 실행함. 1번 실행 시 메뉴는 뜨므로 인코딩은 어느 정도 해결된 상태.
- for /f 제거: 원래 SDK 버전을 for /f "tokens=*" %%i in ('powershell -Command "..."') 로 받았는데, cmd 파싱/서브프로세스 크래시 가능성을 피하려고 제거하고, Get-SdkVersion.ps1이 -OutFile로 파일에 쓰고 배치는 set /p 로 파일에서만 읽도록 변경함.
- if 블록 내 괄호 제거: "if defined SDK_VER (" 블록 안에 "C:\Program Files (x86)\..." 리터럴이 있으면 (x86)의 ) 가 if의 닫는 괄호로 해석된다고 가정하고, 블록 밖에서 set "PF86=%ProgramFiles(x86)%" 한 뒤 블록 안에서는 "%PF86%\..." 만 사용하도록 수정함.

[요청]
- 위 시도들로도 2번 선택 시 크래시가 계속된다.
- 가능한 원인을 새로 추론하고, 배치를 최소한으로만 수정해서 해결하는 구체적인 수정안을 제시해 달라.
- 또는 Setup(2번) 구간 전체를 배치 대신 PowerShell 스크립트 하나로 옮기고, eco.bat에서는 "powershell -File scripts\Setup-Environment.ps1" 만 호출하는 방식으로 바꾸는 것도 제안 가능하다.
- 수정 시 eco.bat은 반드시 ANSI(CP949) 또는 ASCII만 사용해야 하며, 수정 후 다시 CP949로 저장해야 한다는 점을 안내에 포함해 달라.

[참고할 파일 경로]
- eco.bat (프로젝트 루트) — :setup 레이블부터 SDK 설정·uv pip·npm·doctor 호출까지
- scripts\Refresh-BuildEnv.ps1 — Windows SDK 경로 탐색 및 사용자 환경변수 등록, 실패 시 exit 1
- scripts\Get-SdkVersion.ps1 — SDK 버전을 -OutFile 인자로 받은 경로에 한 줄로 기록
- docs\TROUBLESHOOTING.md — §8 배치 인코딩, §3 SDK 경로 관련 내용
```

---

## 사용 방법

1. 위 "프롬프트 본문 (복사용)" 의 ``` 부터 ``` 까지 복사한다.
2. 다른 LLM 채팅 창에 붙여 넣고 전송한다.
3. 제안된 수정안을 프로젝트에 적용한 뒤, `pwsh -File scripts\Fix-BatEncoding.ps1` 로 eco.bat을 CP949로 다시 저장하고, eco.bat 실행 후 2번을 눌러 동작을 확인한다.
