# 배포 문제 해결 가이드

## 문제 원인
- Git 저장소가 프로젝트 폴더에 제대로 설정되지 않음
- 변경사항이 Git에 커밋/푸시되지 않아서 Vercel이 이전 코드를 배포함

## 해결 방법

### 방법 1: Git을 통해 배포 (권장)

프로젝트 폴더에서 다음 명령 실행:

```bash
# 1. Git 초기화 (프로젝트 폴더에서만)
git init

# 2. 원격 저장소 연결 (GitHub/GitLab)
git remote add origin [YOUR_REPO_URL]

# 3. 변경사항 추가
git add .

# 4. 커밋
git commit -m "AI 행동 지침 설정 UI 개선: 서비스 운영자 프리셋, 사용자 정의 지침 토글"

# 5. 푸시
git push -u origin main
```

Vercel이 자동으로 감지하여 재배포합니다.

### 방법 2: Vercel CLI로 직접 배포

프로젝트 폴더에서 직접 실행:

```bash
# 프로젝트 폴더로 이동 (파일 탐색기에서 열기)
cd "C:\Users\AIWEB\OneDrive - 지피티코리아\바탕 화면\활용\notebooklm copy"

# 배포
vercel --prod
```

### 방법 3: Vercel 대시보드에서 수동 재배포 + 캐시 클리어

1. Vercel 대시보드 접속
2. Settings → Build & Development Settings
3. "Clear Build Cache" 클릭
4. Deployments → "Redeploy" 클릭

## 확인사항

배포 후 다음 기능이 정상 작동하는지 확인:

1. ✅ "서비스 운영자" 프리셋 (기존 "에이비딩 운영자"에서 변경)
2. ✅ "사용자 정의 지침" 버튼 토글 기능
3. ✅ 프리셋 선택 시 "사용자 정의 지침" 버튼 비활성화
4. ✅ 사용자 정의 지침 버튼 클릭 시 빈 텍스트 영역으로 열림










