# 지금 바로 배포하기

현재 localhost:5174에서 테스트 중인 상태를 배포하는 방법입니다.

## 방법 1: Vercel CLI로 직접 배포 (가장 빠름)

1. **파일 탐색기 열기**
   - 프로젝트 폴더: `notebooklm copy`
   - 폴더에서 우클릭 → "터미널에서 열기" 또는 "PowerShell에서 열기"

2. **배포 명령 실행**
   ```powershell
   # 프로덕션 배포 (이미 Vercel 프로젝트가 연결되어 있다면)
   vercel --prod
   
   # 또는 처음 배포하는 경우
   vercel
   ```

## 방법 2: Vercel 웹 대시보드에서 재배포

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard

2. **프로젝트 찾기**
   - 프로젝트 목록에서 `notebooklm-dashboard` 찾기

3. **재배포**
   - Deployments 탭에서 최신 배포 옆 "..." 메뉴 클릭
   - "Redeploy" 선택
   - 또는 "Clear Build Cache" 후 재배포

## 방법 3: Git을 통한 자동 배포 (권장)

GitHub/GitLab에 푸시하면 자동으로 배포됩니다:

1. **변경사항 커밋 및 푸시**
   ```bash
   git add .
   git commit -m "최신 변경사항 배포"
   git push
   ```

2. **Vercel이 자동으로 배포 감지**
   - 몇 분 후 배포 완료 알림

## 환경 변수 확인

배포 전에 Vercel 대시보드에서 환경 변수가 설정되어 있는지 확인하세요:

- `VITE_OPENAI_API_KEY`
- `VITE_GEMINI_API_KEY` (선택사항)

**설정 위치**: Project Settings → Environment Variables










