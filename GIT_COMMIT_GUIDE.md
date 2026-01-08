# Git 커밋 및 푸시 가이드

## 프로젝트 폴더에서 직접 실행하세요

프로젝트 폴더를 파일 탐색기에서 열고, 그 폴더에서 PowerShell/CMD를 열어 다음 명령을 실행하세요:

```bash
# 1. 원격 저장소 확인/설정
git remote -v
# 만약 없다면:
git remote add origin https://github.com/ggangminmin/Notebook-POC.git

# 2. 변경사항 확인
git status

# 3. 변경된 파일 추가
git add src/components/SystemPromptPanel.jsx
git add vercel.json
# 또는 모든 변경사항 추가:
git add .

# 4. 커밋
git commit -m "AI 행동 지침 설정 UI 개선: 서비스 운영자 프리셋, 사용자 정의 지침 토글 기능"

# 5. 푸시
git push -u origin main
```

## 변경사항 요약

1. **SystemPromptPanel.jsx**:
   - "에이비딩 운영자" → "서비스 운영자"로 변경
   - 사용자 정의 지침을 토글 버튼으로 변경
   - 프리셋 선택 시 사용자 정의 지침 버튼 비활성화
   - 사용자 정의 지침 버튼 클릭 시 빈 텍스트 영역으로 열림

2. **vercel.json**: Vercel 배포 설정 파일 추가

## 푸시 후

GitHub에 푸시하면 Vercel이 자동으로 감지하여 재배포합니다.
배포 완료 후 https://notebooklm-dashboard-o4wgcbfdd-kangminseoks-projects.vercel.app/ 에서 변경사항을 확인하세요.










