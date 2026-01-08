@echo off
chcp 65001 >nul
echo ====================================
echo  Git 저장소 복구 및 배포
echo ====================================
echo.

echo [1/6] 현재 디렉토리 확인...
cd /d "%~dp0"
echo 현재 위치: %CD%
echo.

echo [2/6] Git lock 파일 제거 (있을 경우)...
if exist .git\index.lock del /f /q .git\index.lock 2>nul
echo.

echo [3/6] Git 저장소 초기화...
git init
echo.

echo [4/6] 모든 파일 추가...
git add .
echo.

echo [5/6] 커밋 생성...
git commit -m "배포 복구"
echo.

echo [6/6] 원격 저장소 설정 및 강제 푸시...
git remote remove origin 2>nul
git remote add origin https://github.com/ggangminmin/Notebook-POC.git
git branch -M main
git push -f origin main
echo.

echo ====================================
echo  완료!
echo  Vercel이 자동으로 배포를 감지합니다.
echo ====================================
pause

