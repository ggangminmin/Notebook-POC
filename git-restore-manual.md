# Git 저장소 복구 및 배포 (수동 실행)

프로젝트 폴더(`notebooklm copy`)에서 PowerShell/터미널을 열고 다음 명령어를 **순서대로** 실행하세요:

## 1단계: Git 저장소 초기화

```bash
git init
```

## 2단계: 모든 파일 추가

```bash
git add .
```

## 3단계: 커밋 생성

```bash
git commit -m "배포 복구"
```

## 4단계: 원격 저장소 설정 및 강제 푸시

```bash
# 기존 원격 저장소가 있다면 제거
git remote remove origin

# 원격 저장소 추가
git remote add origin https://github.com/ggangminmin/Notebook-POC.git

# main 브랜치로 설정 (필요시)
git branch -M main

# 강제 푸시 (주의: GitHub의 기존 코드를 덮어씁니다)
git push -f origin main
```

## 주의사항

⚠️ **강제 푸시(`-f`)는 GitHub의 기존 코드를 완전히 덮어씁니다.**
- 기존 커밋 히스토리가 사라질 수 있습니다.
- 팀 작업 중이라면 다른 사람과 상의 후 진행하세요.

## 자동 실행 방법

`git-restore.bat` 파일을 더블클릭하면 위의 모든 단계가 자동으로 실행됩니다.










