# 배포 가이드

## Vercel 배포 방법

### 방법 1: Vercel 웹사이트에서 배포 (권장)

1. **GitHub/GitLab에 코드 푸시**
   ```bash
   # 프로젝트 디렉토리에서
   git init
   git add .
   git commit -m "AI 행동 지침 설정 기능 개선"
   git remote add origin [YOUR_GITHUB_REPO_URL]
   git push -u origin main
   ```

2. **Vercel 대시보드에서 배포**
   - https://vercel.com/dashboard 접속
   - "Add New Project" 클릭
   - GitHub 저장소 선택
   - 프로젝트 설정:
     - Framework Preset: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - "Deploy" 클릭

### 방법 2: Vercel CLI로 배포

프로젝트 디렉토리에서 다음 명령 실행:

```bash
# 프로젝트 디렉토리로 이동 (한글 경로 문제로 수동으로 이동 필요)
cd "C:\Users\AIWEB\OneDrive - 지피티코리아\바탕 화면\활용\notebooklm copy"

# Vercel 로그인 (처음만)
vercel login

# 프로젝트 연결 (처음만)
vercel link

# 프로덕션 배포
vercel --prod
```

### 방법 3: 기존 Vercel 프로젝트에 재배포

이미 Vercel 프로젝트가 연결되어 있다면:

1. **Vercel 대시보드 접속**
   - https://vercel.com/kangminseoks-projects/notebooklm-dashboard

2. **수동 재배포**
   - "Deployments" 탭에서 "Redeploy" 클릭
   - 또는 Git 저장소에 푸시하면 자동 배포

## 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 설정하세요:

- `VITE_OPENAI_API_KEY`: OpenAI API 키
- `VITE_GEMINI_API_KEY`: Gemini API 키 (선택사항)

**설정 위치**: Project Settings → Environment Variables

## 배포 확인

배포 완료 후:
- 배포 URL에서 앱이 정상 작동하는지 확인
- AI 행동 지침 설정 기능 테스트
- 프리셋 선택 및 사용자 정의 지침 입력 테스트










