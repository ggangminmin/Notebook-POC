# NotebookLM Dashboard - 작업 진행 상황

## 📊 프로젝트 개요
- **프로젝트명**: NotebookLM 스타일 문서 기반 분석 도구
- **기술 스택**: React 18, Vite, Tailwind CSS, PDF.js, OpenAI API, Gemini API
- **배포 URL**: https://notebooklm-dashboard.vercel.app
- **로컬 서버**: http://localhost:5175
- **마지막 업데이트**: 2026-01-07 (다중 파일 인용 시스템 완전 수정 + 자동 분석 최적화)

## ✅ 완료된 기능 (2026-01-07 업데이트)

### 핵심 시스템
- [x] 엄격한 RAG 기반 문서 분석 시스템
- [x] PDF.js 통합 (텍스트 추출 + 페이지 렌더링)
- [x] Word/Excel 파일 지원 (mammoth.js, xlsx)
- [x] 다국어 지원 (한국어/English)
- [x] 다중 AI 모델 지원 (GPT-4o, GPT-4o-mini, Gemini 3 Flash)

### UI/UX
- [x] **대시보드 페이지 (2026-01-07 신규)**:
  - NotebookLM 스타일 헤더 (로고, 검색창, 프로필/설정)
  - 반응형 그리드 레이아웃 (1-4열 자동 조정)
  - 노트북 카드 (이모지, 제목, 생성일, 소스 개수)
  - 인라인 제목 수정 (Edit2/Check/X 아이콘)
  - "새 노트 만들기" 카드
  - 검색 기능 (제목 기반)
  - Grid/List 뷰 전환
  - 배경색 #F9FAFB
  - 카드 호버 애니메이션
- [x] 반응형 2/3단 레이아웃 (토글형 우측 패널)
- [x] 소스 패널 20% 너비 (체크박스 기반 다중 선택)
- [x] 파일 타입별 아이콘 (PDF:빨강, Word:파랑, Excel:초록, TXT:회색, JSON:보라)
- [x] 채팅 인터페이스 (ReactMarkdown 렌더링)
- [x] NotebookLM 스타일 폰트 (11.5px, line-height 1.65)
- [x] 자동 확장 textarea (최소 40px, 최대 200px)
- [x] 메시지 복사 버튼 (AI 응답에 Copy 아이콘)
- [x] PDF 뷰어 (고품질 2배 스케일 렌더링)
- [x] 토글형 AI 설정 패널 (우측 슬라이드 인/아웃, 35% 너비)
- [x] **대시보드 UI 개선 (2026-01-07)**:
  - 3점 메뉴 (MoreVertical) 항상 표시
  - "전체" 탭만 유지 (내 노트북, 추천 노트북 제거)
  - Grid/List 뷰 토글 (LayoutGrid, List 아이콘)

### 인용 시스템
- [x] 클릭 가능한 페이지 배지 (`[5]`, `[5-8]`)
- [x] 대괄호 없는 패턴 자동 감지 ("페이지 15", "15-18", "16, 18")
- [x] 보라색 추론 배지 (`[문서 맥락 기반 추론]`)
- [x] 배지 클릭 시 PDF 페이지 자동 이동
- [x] PDF 외 파일(Word/Excel/TXT/JSON) 클릭 시 텍스트 뷰어 표시
- [x] 범위 인용 개별 배지로 분리 ("15-18" → `15` `18`)
- [x] 인용 배지 클릭 시 AI 설정 패널 자동 열기
- [x] 파일 전환 시 AI 지침 자동 초기화
- [x] **다중 파일 인용 정확성 (2026-01-07 완전 수정)**:
  - 누적 페이지 번호 시스템 구현
  - 각 파일별 로컬 페이지 번호 자동 변환
  - 인용 클릭 시 정확한 소스 파일 열림 (PDF + Word/Excel 모두 지원)
  - findFileByPageNumber 헬퍼 함수 추가
  - Word/Excel 파일 인용 시 targetFile 설정 수정
  - PDF 파일 전환 시 자동 리로드 (selectedFile.id 의존성 추가)
  - 노트북 재로드 시 allSources 페이지 범위 자동 재계산

### AI 지침 설정 (2026-01-06 개편)
- [x] SystemPromptPanel 컴포넌트
- [x] 사용자 정의 AI 지침 입력
- [x] 프리셋 제공 (서비스 운영자, 문서 분석가)
- [x] 실시간 적용 시스템
- [x] 시스템 프롬프트 오버라이드
- [x] 토글형 설정 패널 (우측 상단 버튼)
- [x] 슬라이드 인/아웃 애니메이션 (0.3s cubic-bezier)
- [x] 채팅창 자동 확장/축소 (85% ↔ 50%)

### 데이터 보존 시스템 (2026-01-07 IndexedDB 마이그레이션)

- [x] **IndexedDB 기반 대용량 저장** (localStorage → IndexedDB 완전 전환):
  - 노트북 데이터 구조 (ID, 제목, 이모지, 생성일, 수정일)
  - 파일 첨부 내역 (sources 배열) - 대용량 base64 데이터 지원
  - 채팅 메시지 내역 (messages 배열) - 무제한 대화 저장
  - AI 모델 선택 (selectedModel)
  - AI 지침 설정 (systemPromptOverrides)
  - **용량**: localStorage 5-10MB → IndexedDB 수백MB~GB
- [x] **자동 저장 시스템**:
  - 파일 업로드 시 자동 저장 (sources useEffect)
  - 메시지 전송 시 자동 저장
  - 모델 변경 시 자동 저장
  - AI 지침 수정 시 자동 저장
  - 페이지 이동 시 자동 저장 (saveCurrentNotebookData)
- [x] **데이터 복원**:
  - 대시보드에서 노트북 클릭 시 모든 데이터 복원
  - 파일, 메시지, 설정 완벽 복구
  - 브라우저 뒤로가기/앞으로가기 지원 (History API)
- [x] **라우팅 시스템**:
  - Dashboard ↔ Chat 뷰 전환
  - 브라우저 뒤로가기 버튼 지원 (popstate 이벤트)
  - URL 기반 라우팅 (#dashboard, #chat/notebookId)
  - 뒤로가기 버튼 (ArrowLeft 아이콘)
  - 현재 노트북 제목/이모지 표시
- [x] **신규 파일**:
  - src/utils/storage.js (IndexedDB 래퍼)
  - src/utils/notebookManager.js (async CRUD 함수)
  - src/components/Dashboard.jsx (대시보드 UI)
  - src/components/NotebookCard.jsx (3점 메뉴 포함)

### 대화 관리
- [x] 자동 문서 분석 및 요약
- [x] 추천 질문 3개 자동 생성
- [x] 다중 파일 통합 분석 메시지
- [x] 깨끗한 초기 화면
- [x] 노트북별 메시지 보존
- [x] **자동 분석 최적화 (2026-01-07 신규)**:
  - analyzedSourceIds 시스템 구현
  - 이미 분석한 파일은 재분석 건너뛰기
  - 새 파일 추가 시에만 자동 분석 실행
  - 노트북 재열기 시 자동 분석 방지

### 웹 검색 (선택적)
- [x] Fast Research (URL 크롤링)
- [x] Deep Research (종합 리포트)
- [x] Tavily API 통합 지원
- [x] 소스 타입별 아이콘 (📄 파일, 🌐 웹, 📊 리포트)

### 배포
- [x] Vercel 배포 자동화
- [x] 환경 변수 설정 (.env)
- [x] README 전면 개편 (실제 기능만 포함)

## 🔄 진행 중

현재 진행 중인 작업 없음

## 📋 다음 작업 (우선순위순)

### 높음
- [ ] 다크모드 구현
  - Tailwind dark: 클래스 활용
  - 테마 토글 버튼 추가
  - localStorage에 테마 설정 저장

### 중간
- [ ] 모바일 반응형 디자인
  - 3단 레이아웃 → 탭 기반 전환
  - 터치 제스처 지원
  - 작은 화면 최적화

- [ ] 대화 기록 저장/불러오기
  - 수동 저장 버튼 추가
  - 대화 내보내기 (JSON/Markdown)
  - 대화 불러오기 기능

- [ ] PDF 페이지 검색
  - 페이지 내 텍스트 검색
  - 검색 결과 하이라이트
  - 검색 결과 네비게이션

### 낮음
- [ ] Claude API 통합
  - Anthropic API 추가
  - 모델 선택 UI 확장

- [ ] 웹 검색 고도화
  - Serper API 통합
  - 검색 결과 필터링
  - 검색 히스토리

## 🐛 알려진 이슈

- [x] ~~localStorage 용량 초과 (QuotaExceededError)~~ → IndexedDB 마이그레이션으로 해결 ✅
- [x] ~~파일 첨부 후 페이지 이동 시 파일 초기화~~ → 자동 저장 로직 수정으로 해결 ✅
- [x] ~~브라우저 뒤로가기 버튼 미작동~~ → History API 구현으로 해결 ✅
- [x] ~~Grid3x3 아이콘 import 에러~~ → LayoutGrid로 변경하여 해결 ✅
- [ ] PDF OCR 미지원 (이미지 기반 PDF 텍스트 추출 불가)
- [ ] 일부 웹사이트 크롤링 실패 (CORS/크롤링 방지 정책)
- [ ] 대용량 PDF (100MB+) 처리 시 느림

## 📝 기술 부채

- [ ] 코드 스플리팅 (번들 크기 최적화)
- [ ] 성능 프로파일링 및 최적화
- [ ] 단위 테스트 추가
- [ ] E2E 테스트 추가
- [ ] 접근성 개선 (ARIA 레이블, 키보드 네비게이션)

## 💡 아이디어 (미확정)

- 음성 입력/출력 (STT/TTS)
- 문서 비교 기능 (Diff Viewer)
- 협업 기능 (멀티 유저)
- AI 모델 성능 비교 (A/B 테스트)
- 북마크/즐겨찾기 시스템

## 🔗 관련 링크

- **프로덕션**: https://notebooklm-dashboard.vercel.app
- **GitHub**: (저장소 URL 추가 필요)
- **문서**: README.md

## 📌 메모

### 최근 결정 사항

- **자동 분석 최적화 시스템 구축 (2026-01-07 신규)**
  - **배경**: 노트북을 다시 열 때마다 파일 자동 분석 메시지가 반복 표시되는 문제
  - **해결 방법**: analyzedSourceIds 추적 시스템 구현
  - **구현 내용**:
    - notebookManager.js: analyzedSourceIds 필드 추가
    - App.jsx: handleAnalyzedSourcesUpdate 콜백 구현
    - ChatInterface.jsx: 새 파일만 분석하도록 로직 수정
    - 노트북 복원 시 기존 메시지가 있으면 모든 소스를 분석됨으로 표시
  - **동작 방식**:
    - 첫 파일 업로드: 자동 분석 ✅
    - 동일 파일 재선택: 건너뛰기 ✅
    - 새 파일 추가: 새 파일만 분석 ✅
    - 기존 노트북 재열기: 건너뛰기 ✅

- **IndexedDB 마이그레이션 완료 (2026-01-07 최종)**
  - **배경**: localStorage 용량 제한 (5-10MB)으로 파일 첨부 시 QuotaExceededError 발생
  - **해결 방법**: 전체 저장소 시스템을 IndexedDB로 전환 (수백MB~GB 지원)
  - **구현 내용**:
    - **신규 파일**: src/utils/storage.js (IndexedDB 래퍼)
    - **전면 수정**: src/utils/notebookManager.js (모든 함수 async로 변경)
    - **App.jsx 수정**:
      - saveCurrentNotebookData에 sources 저장 로직 추가
      - sources useEffect 자동 저장 재활성화
      - handlePopState async 처리로 변경
      - handleBackToDashboard async 처리
    - **Dashboard.jsx**: 모든 핸들러 async로 변경
    - **자동 마이그레이션**: localStorage → IndexedDB (백업 포함)
  - **주요 기능**:
    - openDB: IndexedDB 연결 및 초기화
    - getAllNotebooks: 전체 노트북 조회
    - getNotebookById: 특정 노트북 조회
    - saveNotebook: 노트북 저장/업데이트 (put)
    - deleteNotebook: 노트북 삭제
    - migrateFromLocalStorage: 기존 데이터 자동 마이그레이션
  - **결과**:
    - 파일 첨부 용량 제한 해제 ✅
    - 무제한 채팅 메시지 저장 ✅
    - 파일/메시지 영구 보존 ✅
    - 브라우저 뒤로가기/앞으로가기 완벽 지원 ✅

- **대시보드 + 데이터 보존 시스템 구축 (2026-01-07)**
  - **목표**: NotebookLM처럼 여러 노트북을 관리하고 모든 데이터를 영구 보존
  - **구현 내용**:
    - IndexedDB 기반 노트북 관리 (notebookManager.js + storage.js)
    - Dashboard 페이지 (검색, 그리드 뷰, 카드 호버 효과)
    - NotebookCard 컴포넌트 (3점 메뉴, 인라인 제목 수정)
    - App.jsx 라우팅 (Dashboard ↔ Chat, History API)
    - 자동 저장 (sources, messages, model, systemPrompt)
    - 데이터 복원 (initialMessages prop)
    - 6개 더미 노트북 제공
  - **UI 개선**:
    - 3점 메뉴 항상 표시 (MoreVertical 아이콘)
    - "전체" 탭만 유지 (내 노트북, 추천 노트북 제거)
    - Grid/List 뷰 토글 버튼
    - 브라우저 뒤로가기 버튼 지원
  - **신규 파일**:
    - src/utils/storage.js (IndexedDB 래퍼)
    - src/utils/notebookManager.js (async CRUD)
    - src/components/Dashboard.jsx
    - src/components/NotebookCard.jsx
  - **수정 파일**:
    - src/App.jsx (라우팅, History API, 자동 저장 로직)
    - src/components/ChatInterface.jsx (initialMessages prop, onChatUpdate)

- **다중 파일 인용 시스템 완전 수정 (2026-01-07 최종)**
  - **문제 1**: 2개 이상 파일 선택 시 모든 인용이 첫 번째 파일로만 연결
  - **문제 2**: Word/Excel 파일 인용 클릭 시 첫 번째 PDF 파일 표시
  - **문제 3**: PDF 전환 시 우측 패널이 업데이트되지 않음
  - **문제 4**: 노트북 재로드 시 인용 배지가 첫 번째 파일로만 연결
  - **해결 방법**:
    - 누적 페이지 번호 시스템 구현 (전역 페이지 → 로컬 페이지 자동 변환)
    - Word/Excel 파일 클릭 시 rightPanelState에 targetFile 추가
    - DataPreview PDF 렌더링에 selectedFile.id 의존성 추가
    - processInitialMessages 함수로 allSources 페이지 범위 재계산
  - **구현 파일**:
    - ChatInterface.jsx: allSourcesData 생성, findFileByPageNumber 함수
    - ChatInterface.jsx: processInitialMessages 함수 (초기 메시지 페이지 범위 재계산)
    - App.jsx: handlePageClick 수정 (Word/Excel targetFile 설정)
    - DataPreview.jsx: PDF 렌더링 의존성에 selectedFile.id 추가

- UI/UX 개선 (2026-01-07)
  - 소스 패널 너비: 15% → 20% (파일명 가독성 향상)
  - 채팅 패널 폰트: NotebookLM 스타일 (11.5px, 회색)
  - 자동 확장 textarea 구현
  - AI 메시지에 복사 버튼 추가

- 인용 배지 시스템 개선 (2026-01-06)
  - 범위 인용 개별 배지로 분리 ("15-18" → 두 개의 배지)
  - 인용 배지 클릭 시 AI 설정 패널 자동 열기
  - 파일 전환 시 AI 지침 자동 초기화
  - 콤마/공백 구분 숫자 패턴 지원 ("16, 18", "15 17")

- Word/Excel 파일 완전 지원 (2026-01-05)
  - mammoth.js, xlsx 라이브러리 추가
  - 텍스트 추출 완료, 시각적 렌더링은 제외
  - 파일 타입별 아이콘 시스템 구축

- README 간소화 (2026-01-05)
  - 이유: 미구현 기능 과장 방지
  - 결과: 862줄 삭제, 실제 기능만 포함

### 해결된 주요 버그

1. **QuotaExceededError (localStorage 용량 초과)** - 2026-01-07 해결
   - **증상**: 파일 첨부/채팅 중 "Failed to execute 'setItem' on 'Storage'" 에러
   - **원인**: localStorage 5-10MB 제한, base64 인코딩된 파일 데이터가 용량 초과
   - **해결**: IndexedDB 전환 (수백MB~GB 지원)
   - **관련 파일**: storage.js (신규), notebookManager.js (전면 수정), App.jsx

2. **파일 첨부 후 페이지 이동 시 초기화 문제** - 2026-01-07 해결
   - **증상**: 대시보드 ↔ 노트북 이동 시 첨부한 파일이 사라짐
   - **원인**: sources 배열이 IndexedDB에 저장되지 않음
   - **해결**: saveCurrentNotebookData에 sources 저장 로직 추가, useEffect 자동 저장 재활성화
   - **관련 파일**: App.jsx (lines 188-197, 200-207)

3. **브라우저 뒤로가기 버튼 미작동** - 2026-01-07 해결
   - **증상**: 브라우저 뒤로가기 버튼 클릭 시 페이지 이동 안됨
   - **원인**: History API 미구현
   - **해결**: window.history.pushState + popstate 이벤트 핸들러 구현
   - **관련 파일**: App.jsx (lines 210-229, 248-249, 273)

4. **Grid3x3 아이콘 import 에러** - 2026-01-07 해결
   - **증상**: "Uncaught ReferenceError: Grid3x3 is not defined"
   - **원인**: lucide-react에서 Grid3x3 export 미제공
   - **해결**: LayoutGrid 아이콘으로 변경
   - **관련 파일**: Dashboard.jsx (line 2, 125)

### 개발 환경
- Node.js: v18+
- npm: v9+
- 로컬 서버: <http://localhost:5175> (포트 5173-5174 사용 중)
- 빌드 시간: ~5초
- IndexedDB: NotebookLM_DB (버전 1)
  - Object Store: notebooks
  - Index: updatedAt

---

**작업 시작 전 체크리스트**:
1. [ ] `git pull` (최신 코드 받기)
2. [ ] `npm install` (의존성 업데이트)
3. [ ] TODO.md 확인 (작업할 내용 선택)
4. [ ] 작업 완료 후 이 파일 업데이트
5. [ ] Git 커밋 + README 업데이트 (필요시)
