@echo off
chcp 65001 >nul
echo ====================================
echo  Git 커밋 및 푸시
echo ====================================
echo.

echo [1/4] 현재 디렉토리 확인...
cd /d "%~dp0"
echo 현재 위치: %CD%
echo.

echo [2/4] 변경사항 추가 중...
git add .
echo.

echo [3/4] 커밋 중...
git commit -m "최신 변경사항"
echo.

echo [4/4] GitHub에 푸시 중...
git push
echo.

echo ====================================
echo  완료! Vercel이 자동으로 배포합니다.
echo ====================================
pause










