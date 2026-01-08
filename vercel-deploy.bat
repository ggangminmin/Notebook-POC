@echo off
chcp 65001 >nul
echo ====================================
echo  Vercel 직접 배포 (Git 없이)
echo ====================================
echo.

echo [1/2] 프로젝트 폴더로 이동...
cd /d "%~dp0"
echo 현재 위치: %CD%
echo.

echo [2/2] Vercel 프로덕션 배포 실행 중...
npx --yes vercel --prod
echo.

echo ====================================
echo  배포 완료!
echo ====================================
pause










