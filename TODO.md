# NotebookLM Dashboard - 작업 진행 상황

## 📊 프로젝트 개요
- **프로젝트명**: NotebookLM 스타일 문서 기반 분석 도구
- **기술 스택**: React 18, Vite, Tailwind CSS, PDF.js, OpenAI API, Gemini API, Supabase
- **배포 URL**: https://notebooklm-dashboard.vercel.app
- **로컬 서버**: http://localhost:5175
- **마지막 업데이트**: 2026-01-13 (채팅 UI 개선)

## ✅ 완료된 기능 (2026-01-07 업데이트)

### 핵심 시스템
- [x] 엄격한 RAG 기반 문서 분석 시스템
- [x] PDF.js 통합 (텍스트 추출 + 페이지 렌더링)
- [x] Word 파일 지원 (mammoth.js)
- [x] 다국어 지원 (한국어/English)
- [x] 다중 AI 모델 지원 (GPT-5.1 Instant, GPT-5.1 Thinking, Gemini 3 Flash)

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
- [x] **NotebookLM 스타일 심리스 제목 편집 (2026-01-08 신규)**:
  - 이모지와 제목 분리 (편집 시 이모지 유지)
  - 클릭하여 편집 모드 전환
  - 자동 포커스 + 전체 선택
  - Enter로 저장, Esc로 취소
  - 레이아웃 시프트 방지 (동일 폰트/패딩/높이)
  - 호버 효과 (hover:bg-gray-50)
  - IndexedDB 자동 저장
  - 상태 메시지 없는 깔끔한 UI
- [x] 반응형 2/3단 레이아웃 (토글형 우측 패널)
- [x] 소스 패널 20% 너비 (체크박스 기반 다중 선택)
- [x] 파일 타입별 아이콘 (PDF:빨강, Word:파랑, TXT:회색)
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
- [x] **AI 모델 선택 UI 개선 (2026-01-08 신규)**:
  - 직관적인 영어 레이블 ("GPT Instant", "GPT Thinking", "Gemini 3")
  - 모델별 툴팁 추가 (빠른 응답, 복잡한 추론, 다국어 지원)
  - 폰트 크기 10px → 11px 증가
  - 패딩 증가로 가독성 향상
- [x] **채팅 입력창 UI 개선 (2026-01-13 신규)**:
  - 입력창 하단 안내 텍스트 제거 ("문서 없이도 대화 가능 · Enter로 전송")
  - 전송 버튼과 입력창 높이 완벽 정렬 (items-stretch + box-border)
  - 최소 높이 44px 통일, 동일한 패딩 적용 (py-2.5)
  - 입력창 확장 시 버튼도 함께 늘어나도록 개선

### 인용 시스템
- [x] 클릭 가능한 페이지 배지 (`[5]`, `[5-8]`)
- [x] 대괄호 없는 패턴 자동 감지 ("페이지 15", "15-18", "16, 18")
- [x] 보라색 추론 배지 (`[문서 맥락 기반 추론]`)
- [x] 배지 클릭 시 PDF 페이지 자동 이동
- [x] PDF 외 파일(Word/TXT) 클릭 시 텍스트 뷰어 표시
- [x] 범위 인용 개별 배지로 분리 ("15-18" → `15` `18`)
- [x] 인용 배지 클릭 시 AI 설정 패널 자동 열기
- [x] 파일 전환 시 AI 지침 자동 초기화
- [x] **다중 파일 인용 정확성 (2026-01-07 완전 수정)**:
  - 누적 페이지 번호 시스템 구현
  - 각 파일별 로컬 페이지 번호 자동 변환
  - 인용 클릭 시 정확한 소스 파일 열림 (PDF + Word 모두 지원)
  - findFileByPageNumber 헬퍼 함수 추가
  - Word 파일 인용 시 targetFile 설정 수정
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

### 데이터 보존 시스템 (2026-01-09 Supabase 클라우드 전환)

- [x] **Supabase 클라우드 데이터베이스** (IndexedDB → Supabase PostgreSQL 마이그레이션):
  - **배경**: 멀티 디바이스 동기화 + 무제한 용량 + 데이터 영구 보존
  - **기술 스택**: PostgreSQL + Supabase Storage + Row Level Security
  - **데이터베이스 스키마**:
    - `notebooks` 테이블: id, title, emoji, created_at, updated_at, selected_model, system_prompt_overrides, analyzed_source_ids
    - `messages` 테이블: id, notebook_id, role, content, timestamp
    - `sources` 테이블: id, notebook_id, name, type, size, uploaded_at, file_path, page_count, page_texts, file_type, file_name, file_size, extracted_text
    - **2026-01-09 스키마 업데이트**: file_type, file_name, file_size, extracted_text 컬럼 추가 (PDF 뷰어 문제 해결)
  - **파일 저장**: Supabase Storage 버킷 (`notebook-files`) - PDF/Word/TXT 파일 업로드
  - **보안**: Row Level Security (RLS) 정책 적용
  - **마이그레이션**: IndexedDB 데이터 자동 마이그레이션 함수 구현 (migrateFromIndexedDB)
  - **용량**: localStorage 5-10MB → IndexedDB 수백MB → Supabase 무제한
- [x] **자동 저장 시스템 (2026-01-09 무한 루프 해결)**:
  - 파일 업로드 시 자동 저장 (sources useEffect, ID 기반 비교)
  - 메시지 전송 시 자동 저장 (handleChatUpdate 콜백)
  - 모델 변경 시 자동 저장 (초기 마운트 감지)
  - AI 지침 수정 시 자동 저장 (초기 마운트 감지)
  - 페이지 이동 시 자동 저장 (saveCurrentNotebookData)
  - **무한 루프 방지**: 소스 ID 목록 비교 (lastSavedSourceIds ref)
- [x] **데이터 복원**:
  - 대시보드에서 노트북 클릭 시 모든 데이터 복원
  - 파일, 메시지, 설정 완벽 복구
  - 브라우저 뒤로가기/앞으로가기 지원 (History API)
- [x] **파일 저장 최적화 (2026-01-09 신규)**:
  - File 객체 → ArrayBuffer 변환하여 IndexedDB 저장
  - ArrayBuffer → File 복원 헬퍼 함수 (bufferToFile)
  - PDF 썸네일 Base64 제거로 용량 대폭 감소
  - 데이터 정제 함수 (sanitizeNotebookForStorage)
  - 에러 핸들링 강화 (QuotaExceededError, DataError 등)
  - **결과**: PDF/TXT/DOCX 모든 파일 형식 저장 성공 ✅
- [x] **라우팅 시스템**:
  - Dashboard ↔ Chat 뷰 전환
  - 브라우저 뒤로가기 버튼 지원 (popstate 이벤트)
  - URL 기반 라우팅 (#dashboard, #chat/notebookId)
  - 뒤로가기 버튼 (ArrowLeft 아이콘)
  - 현재 노트북 제목/이모지 표시
- [x] **신규 파일**:
  - src/utils/supabaseClient.js (Supabase 클라이언트 초기화 + 연결 테스트)
  - src/utils/storage.js (Supabase PostgreSQL + Storage 래퍼)
  - src/utils/notebookManager.js (async CRUD 함수)
  - src/components/Dashboard.jsx (대시보드 UI)
  - src/components/NotebookCard.jsx (3점 메뉴 포함)
  - .env (Supabase 환경 변수)

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

### PDF 뷰어 문제 수정 (2026-01-09)

- [x] 문제 진단: PDF 인용 배지 클릭 시 텍스트 뷰어 표시됨
- [x] 근본 원인 파악: Supabase sources 테이블에 file_type 컬럼 누락
- [x] 코드 수정 완료:
  - storage.js (lines 295-304, 374-379): file_type, file_name, file_size, extracted_text 저장/로드
  - DataPreview.jsx (lines 1094-1102): text-preview 모드 제목 표시 개선
- [ ] **다음 단계 (필수)**: Supabase SQL 마이그레이션 실행
  - 파일: supabase-migration-add-source-fields.sql
  - 실행 위치: <https://unvbpxtairtkjqygxqhy.supabase.co> (SQL Editor)
  - 테스트: 새 PDF 업로드 후 인용 배지 클릭 → PDF 뷰어 정상 표시 확인
- [x] 문서화: PDF-VIEWER-FIX-INSTRUCTIONS.md 작성 완료

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
- [x] ~~PDF/TXT 파일 저장 실패~~ → Base64 썸네일 제거 + ArrayBuffer 변환으로 해결 ✅
- [x] ~~파일 저장 무한 루프~~ → 소스 ID 기반 비교로 해결 ✅
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

- **Supabase 클라우드 데이터베이스 전환 (2026-01-09 최종 완료)**
  - **배경**: IndexedDB는 로컬 브라우저에만 저장되어 멀티 디바이스 동기화 불가
  - **목표**: 클라우드 기반 데이터 영구 보존 + 모든 디바이스에서 접근 가능
  - **기술 선택**: MongoDB 고려 → Supabase PostgreSQL 선택 (무료 500MB, 파일 스토리지 내장)
  - **구현 단계**:
    1. **Supabase 프로젝트 생성**:
       - Project URL: https://unvbpxtairtkjqygxqhy.supabase.co
       - Anonymous Key: 환경 변수로 관리
       - .env 파일 생성 (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
    2. **데이터베이스 스키마 생성** (SQL 직접 실행):
       ```sql
       -- notebooks 테이블
       CREATE TABLE notebooks (
         id TEXT PRIMARY KEY,
         title TEXT NOT NULL,
         emoji TEXT DEFAULT '📝',
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         selected_model TEXT DEFAULT 'instant',
         system_prompt_overrides JSONB DEFAULT '{}',
         analyzed_source_ids TEXT[] DEFAULT '{}'
       );

       -- messages 테이블
       CREATE TABLE messages (
         id SERIAL PRIMARY KEY,
         notebook_id TEXT REFERENCES notebooks(id) ON DELETE CASCADE,
         role TEXT NOT NULL,
         content TEXT NOT NULL,
         timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
       );

       -- sources 테이블
       CREATE TABLE sources (
         id TEXT PRIMARY KEY,
         notebook_id TEXT REFERENCES notebooks(id) ON DELETE CASCADE,
         name TEXT NOT NULL,
         type TEXT NOT NULL,
         size INTEGER DEFAULT 0,
         uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         file_path TEXT,
         page_count INTEGER,
         page_texts JSONB
       );
       ```
    3. **Supabase Storage 버킷 생성**:
       - 버킷 이름: `notebook-files`
       - Public 버킷으로 생성
       - RLS 정책 설정:
         ```sql
         -- 모든 사용자가 읽기 가능
         CREATE POLICY "Allow public read" ON storage.objects
         FOR SELECT USING (bucket_id = 'notebook-files');

         -- 모든 사용자가 업로드 가능
         CREATE POLICY "Allow public insert" ON storage.objects
         FOR INSERT WITH CHECK (bucket_id = 'notebook-files');

         -- 모든 사용자가 업데이트 가능
         CREATE POLICY "Allow public update" ON storage.objects
         FOR UPDATE USING (bucket_id = 'notebook-files');

         -- 모든 사용자가 삭제 가능
         CREATE POLICY "Allow public delete" ON storage.objects
         FOR DELETE USING (bucket_id = 'notebook-files');
         ```
    4. **Supabase 클라이언트 생성**:
       - 신규 파일: `src/utils/supabaseClient.js`
       - @supabase/supabase-js 라이브러리 설치
       - 연결 테스트 함수 구현 (testSupabaseConnection)
    5. **storage.js 완전 재작성**:
       - IndexedDB 코드 → Supabase 클라이언트로 전환
       - getAllNotebooks: notebooks + messages + sources 조인 조회
       - getNotebookById: 특정 노트북 + 관련 데이터 조회
       - saveNotebook: upsert 패턴으로 저장 (onConflict 처리)
       - saveNotebookMessages: 기존 메시지 삭제 후 재삽입
       - saveNotebookSources: 파일 Storage 업로드 + 메타데이터 저장
       - getNotebookSources: Storage에서 파일 다운로드 + File 객체 복원
       - deleteNotebook: CASCADE로 관련 데이터 자동 삭제
       - migrateFromIndexedDB: 기존 IndexedDB 데이터 Supabase로 이전
    6. **데이터 정제 시스템 추가**:
       - sanitizeNotebookForStorage 함수: 저장 전 무거운 데이터 제거
       - PDF 썸네일 제거 (Base64 이미지 → null)
       - pageImages 배열 전체 제거
       - 데이터 크기 로그 출력 (MB 단위)
  - **해결된 에러**:
    1. **NULL constraint violation** (messages.role):
       - 원인: 빈 messages 배열 삽입 시 role 필드 누락
       - 해결: saveNotebookMessages에서 role/content 필터링 추가
    2. **409 Conflict** (sources_pkey duplicate key):
       - 원인: .insert()는 기존 ID 존재 시 충돌
       - 해결: .upsert(data, { onConflict: 'id' })로 변경
    3. **데이터 정리 필요**:
       - 해결: TRUNCATE TABLE SQL 실행하여 모든 테이블 초기화
  - **신규 파일**:
    - `src/utils/supabaseClient.js` (Supabase 클라이언트 + 연결 테스트)
    - `.env` (Supabase 환경 변수)
  - **수정 파일**:
    - `src/utils/storage.js` (완전 재작성: IndexedDB → Supabase)
    - `src/utils/notebookManager.js` (기본 모델: thinking → instant)
    - `src/App.jsx` (기본 모델 변경: 3곳 수정, Supabase 연결 테스트)
  - **결과**:
    - 클라우드 데이터베이스 전환 완료 ✅
    - 파일 업로드/다운로드 성공 ✅
    - 멀티 디바이스 동기화 가능 ✅
    - 무제한 용량 지원 ✅
    - 새 노트북 기본 모델: GPT Instant ✅

- **IndexedDB 저장 최적화 + 파일 영속성 문제 완전 해결 (2026-01-09 신규)**
  - **배경**: PDF/TXT 파일이 저장되지 않는 문제 발생 (DOCX만 저장 성공)
  - **근본 원인**:
    1. File 객체는 IndexedDB에 직렬화 불가능
    2. PDF 썸네일(Base64 이미지)이 너무 커서 용량 초과
    3. 자동 저장 무한 루프 (sources 배열 참조 변경 감지)
  - **해결 방법**:
    1. **File → ArrayBuffer 변환** (SourcePanel.jsx):
       - `file.arrayBuffer()` 사용
       - `fileBuffer`와 `fileMetadata`로 분리 저장
       - IndexedDB 저장 가능한 형식으로 변환
    2. **ArrayBuffer → File 복원** (App.jsx):
       - `bufferToFile()` 헬퍼 함수 추가
       - PDF 뷰어용 File 객체 동적 생성
       - `selectedSources` 계산 시 자동 변환
    3. **썸네일 제거** (storage.js, fileParser.js):
       - `sanitizeNotebookForStorage()` 함수 추가
       - PDF `pageTexts`에서 `thumbnail: null` 처리
       - `pageImages` 배열 전체 제거
       - 데이터 크기 50MB 이상 시 경고
    4. **무한 루프 방지** (App.jsx):
       - `lastSavedSourceIds` ref 추가 (개수 → ID 목록)
       - 소스 ID 문자열 비교 (`sources.map(s => s.id).sort().join(',')`)
       - 변경 없으면 저장 스킵
    5. **에러 핸들링 강화** (storage.js):
       - QuotaExceededError 감지 및 상세 로그
       - DataError, ConstraintError 구분
       - 데이터 크기 MB 단위 표시
  - **구현 파일**:
    - `src/utils/storage.js`: sanitizeNotebookForStorage, saveNotebook 개선
    - `src/utils/fileParser.js`: PDF 썸네일 생성 비활성화
    - `src/components/SourcePanel.jsx`: File → ArrayBuffer 변환
    - `src/App.jsx`: bufferToFile 헬퍼, 무한 루프 방지, ref 관리
  - **결과**:
    - PDF/TXT/DOCX 모든 파일 형식 저장 성공 ✅
    - 파일만 첨부해도 저장됨 ✅
    - 예상 질문만 클릭해도 저장됨 ✅
    - 무한 루프 완전 제거 ✅
    - 데이터 크기 대폭 감소 (5MB → 0.25MB) ✅

- **AI 모델 UI 개선 + 제목 편집 + 파일 형식 제한 (2026-01-08 신규)**
  - **배경**: 사용자 경험 개선을 위한 UI/UX 최적화 작업
  - **구현 내용**:
    - **AI 모델 선택 버튼 개선**:
      - ChatInterface.jsx 수정 (lines 820-855)
      - 한글 레이블 → 영어 직관적 레이블 ("빠름" → "GPT Instant", "심층" → "GPT Thinking", "Gemini" → "Gemini 3")
      - 툴팁 추가 (각 모델별 특징 설명)
      - 폰트 크기 10px → 11px, 패딩 증가
    - **NotebookLM 스타일 심리스 제목 편집**:
      - App.jsx 수정 (lines 39-42, 469-510, 548-587)
      - 이모지와 제목 분리 (`<span>` + `<input>`/`<h1>`)
      - 클릭 시 편집 모드, 자동 포커스 + 전체 선택
      - Enter로 저장, Esc로 취소
      - 레이아웃 시프트 방지 (동일 폰트, 패딩, line-height)
      - 호버 효과 (hover:bg-gray-50)
      - IndexedDB 자동 저장 (updateNotebook 함수)
      - 상태 메시지 제거 (깔끔한 UI)
    - **파일 형식 제한 (Excel, JSON 제거)**:
      - FileUpload.jsx: accept 속성 수정 (.pdf,.txt,.doc,.docx)
      - FileUpload.jsx: 파일 타입 필터 수정 (handleDrop, getFileIcon)
      - SourcePanel.jsx: 동일하게 파일 타입 제한 적용
      - translations.js: 한글/영어 번역 텍스트 수정 ("PDF, Word, TXT 파일 지원")
  - **해결된 버그**:
    - React Hooks 규칙 위반: useState를 조건부 return 이전으로 이동
    - 제목 저장 실패: updateNotebook import 추가, async/await 처리
    - 편집 시 이모지 사라짐: 이모지를 별도 `<span>`으로 분리
  - **결과**:
    - 직관적인 AI 모델 선택 UI ✅
    - 깔끔한 제목 편집 경험 ✅
    - 지원하지 않는 파일 형식 업로드 차단 ✅

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

1. **Supabase 마이그레이션 중 발생한 에러들** - 2026-01-09 완전 해결
   - **증상 1**: `null value in column 'role' of relation 'messages' violates not-null constraint`
     - **원인**: 빈 messages 배열을 저장할 때 role 필드가 없는 메시지가 포함됨
     - **해결**: saveNotebookMessages에서 `.filter(msg => msg.role && msg.content)` 추가
     - **관련 파일**: storage.js (lines 198-199)
   - **증상 2**: `duplicate key value violates unique constraint 'sources_pkey'` (409 Conflict)
     - **원인**: .insert()는 동일 ID가 이미 존재하면 충돌 발생
     - **해결**: `.upsert(sourcesData, { onConflict: 'id' })` 사용으로 변경
     - **관련 파일**: storage.js (lines 356-358)
   - **증상 3**: 기본 모델이 여전히 'thinking'으로 설정됨
     - **원인**: notebookManager.js와 App.jsx 모두 수정 필요
     - **해결**:
       - notebookManager.js line 156: 'instant'로 변경
       - App.jsx lines 121, 155, 249: 모든 fallback 값 'instant'로 변경
     - **결과**: 새 노트북 생성 시 GPT Instant가 기본값으로 설정됨 ✅

2. **PDF/TXT 파일 저장 실패 + 무한 루프 문제** - 2026-01-09 완전 해결
   - **증상**:
     - DOCX는 저장되지만 PDF/TXT는 저장 안 됨
     - 파일 업로드 시 무한 저장 루프 발생
     - 콘솔에 `[IndexedDB] 노트북 저장 성공` 반복 출력
   - **원인**:
     - File 객체는 IndexedDB에 직렬화 불가능
     - PDF Base64 썸네일이 너무 커서 용량 초과 (페이지당 500KB)
     - sources 배열 참조 변경으로 useEffect 무한 트리거
   - **해결**:
     - File → ArrayBuffer 변환 저장
     - PDF 썸네일 제거 (null 처리)
     - 소스 ID 기반 비교로 무한 루프 방지
   - **관련 파일**:
     - storage.js (sanitizeNotebookForStorage)
     - fileParser.js (thumbnail 비활성화)
     - SourcePanel.jsx (fileBuffer 변환)
     - App.jsx (bufferToFile, lastSavedSourceIds)

2. **QuotaExceededError (localStorage 용량 초과)** - 2026-01-07 해결
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
- **Supabase 클라우드 데이터베이스**:
  - Project URL: <https://unvbpxtairtkjqygxqhy.supabase.co>
  - Database: PostgreSQL 15
  - Storage: notebook-files 버킷
  - 테이블: notebooks, messages, sources
- ~~IndexedDB: NotebookLM_DB (버전 1)~~ → Supabase로 마이그레이션 완료

---

**작업 시작 전 체크리스트**:
1. [ ] `git pull` (최신 코드 받기)
2. [ ] `npm install` (의존성 업데이트)
3. [ ] TODO.md 확인 (작업할 내용 선택)
4. [ ] 작업 완료 후 이 파일 업데이트
5. [ ] Git 커밋 + README 업데이트 (필요시)
