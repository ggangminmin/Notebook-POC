@echo off
chcp 65001 >nul
echo ====================================
echo  Vercel 프로덕션 배포 시작
echo ====================================
echo.

echo [1/2] 현재 디렉토리 확인...
cd /d "%~dp0"
echo 현재 위치: %CD%
echo.

echo [2/2] Vercel 배포 실행 중...
vercel --prod

echo.
echo ====================================
echo  배포 완료!
echo ====================================
pause










