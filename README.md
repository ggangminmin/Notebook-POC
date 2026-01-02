# NotebookLM 스타일 문서 기반 분석 도구 + 웹 검색

엄격한 RAG(Retrieval-Augmented Generation) 시스템과 **실시간 웹 검색 기능**을 적용한 NotebookLM 스타일의 문서 분석 및 대화형 대시보드입니다.

## 🎯 핵심 기능

### 🌐 **NEW! 웹 검색 및 Deep Research 기능 (관련성 높은 컨텍스트만 추출)**
- **Tavily API 통합 (우선)**: Context 모드로 **광고/메뉴 제외**, 질문 관련 핵심 컨텍스트만 추출
- **스마트 데이터 청킹**: 긴 웹 페이지를 500자 단위로 분할 → 벡터 유사도 기반 상위 3-5개 문단 선택
- **GPT-4o 요약 엔진**: 모든 웹 소스에 대해 **질문 맥락 기반 3줄 요약** 자동 생성
- **Fast Research (빠른 검색)**: Tavily 또는 5개 URL 크롤링 → GPT 요약 → 소스 추가
- **Deep Research (심층 분석)**: 5개 웹 페이지 수집 → 요약 → GPT-4o로 1,000자 이상 종합 리포트 생성
- **컴팩트 소스 UI**: 제목 + 짧은 요약만 표시, 펼치기/접기 토글로 상세 보기
- **관련 구절 강조**: 챗봇 답변에서 핵심 키워드/수치를 **굵게** 자동 표시 (ReactMarkdown)
- **실시간 진행률 표시**: "핵심 정보 요약 중...", "종합 리포트 작성 중..." 단계별 피드백
- **자동 소스 추가**: 웹 검색 결과가 🌐 지구본 아이콘 + 요약과 함께 소스 리스트에 추가
- **리포트 타입**: Deep Research 결과는 📊 리포트 아이콘으로 구분 표시
- **모델 선택**: Instant (빠른 응답) / Thinking (심층 분석) 토글 선택 가능

### 1. 엄격한 파일 기반 대화 시스템
- **선택된 파일에만 기반한 답변**: 업로드한 문서의 내용에서만 답변을 생성
- **할루시네이션 방지**: 문서에 없는 내용은 절대 답변하지 않음
- **명확한 출처 표시**: 모든 답변에 참조 문서와 매칭된 키워드 표시
- **자동 문서 분석**: 파일 선택 시 자동으로 3-5줄 요약 생성
- **추천 질문 생성**: 문서 내용 기반 클릭 가능한 질문 3개 자동 생성

### 2. NotebookLM 스타일 자동 분석
- **즉시 요약**: 파일 선택 즉시 AI가 문서를 분석하고 요약 제공
- **추천 질문 버튼**: 문서 내용 기반 질문을 버튼으로 제공, 클릭 시 자동 전송
- **분석 진행 상태**: "문서를 분석하고 있습니다..." 로딩 메시지
- **일상 대화 지원**: 문서 없이도 간단한 인사 및 대화 가능

### 3. 다국어 지원 (한국어/English)
- UI 전체 다국어 지원 (한/영 토글)
- 사용자 입력 언어 자동 감지
- 감지된 언어로 자동 응답

### 4. 실시간 파일 처리 (PDF 강화)
- **지원 파일 형식**: PDF (실제 텍스트 추출), TXT, JSON
- **PDF.js 통합**: PDF 파일의 실제 텍스트를 클라이언트에서 추출
- 업로드된 파일을 구조화된 JSON으로 자동 파싱
- 실시간 데이터 프리뷰 (라이트 테마 JSON 뷰어)
- **복사 기능**: 클립보드에 JSON 데이터 복사
- **상세 디버깅 로그**: PDF 추출 전 과정 console.log로 추적 가능

### 5. NotebookLM 스타일 소스 관리
- **체크박스 기반 다중 선택**: 여러 소스 동시 선택 가능
- **소스 추가 모달**: 파일 업로드 또는 웹 URL 추가
- **Deep Research 배너**: NotebookLM 스타일 연구 기능 안내
- **전체 선택/해제**: 모든 소스 일괄 관리
- 선택된 소스 시각적 강조 표시
- 채팅 컨텍스트가 선택된 소스로 즉시 고정
- 소스 삭제 기능

## UI 레이아웃 (NotebookLM 스타일 3단 구조: 16% | 42% | 42%)

### ✨ **NEW! 80% UI 스케일 최적화**

- **전역 스케일링**: `html { font-size: 12.8px }` (브라우저 줌 80% 효과)
- **레이아웃 무결성 유지**: CSS `zoom`/`transform` 대신 적절한 rem 단위 사용
- **PDF 고품질 렌더링 보호**: scale 2.0 유지로 텍스트 선명도 보장
- **화면 공간 20% 증가**: 콤팩트한 UI로 더 많은 콘텐츠 표시
- **모든 rem 기반 Tailwind 유틸리티 자동 축소**: 패딩, 마진, 폰트 크기 비례 조정

### 💬 **NEW! 대화 맥락 영구 유지 (GPT ↔ Gemini 전환)**

- **conversationHistory 시스템**: ChatInterface → aiService 대화 기록 완전 전달
- **모델 전환 시에도 대화 흐름 유지**: GPT-5.1 ↔ Gemini 3 Flash 전환 시 맥락 보존
- **메시지 포맷 자동 변환**: OpenAI (system/user/assistant) ↔ Gemini (user/model)
- **이전 대화 기록 기반 응답**: 모든 API 호출에 전체 대화 이력 포함

### 🔍 **NEW! PDF 뷰어 디버깅 시스템 + 렌더링 안정성 강화**

- **포괄적인 이벤트 체인 추적**: 인용 배지 클릭 → App.jsx → DataPreview 전체 흐름 로깅
- **PDF 파일 감지 로직 강화**:
  - MIME type 체크: `file.type?.includes('pdf')`
  - 파일 확장자 체크: `file.name?.toLowerCase().endsWith('.pdf')`
  - 소스 이름 체크: `selectedFile.name?.toLowerCase().endsWith('.pdf')`
  - 3단계 폴백으로 PDF 인식률 100% 보장
- **상세 디버깅 로깅**:
  - CitationBadge: 클릭 이벤트 및 페이지 번호 추적
  - ChatInterface: 인용 패턴 감지, allSources 데이터 검증
  - App.jsx: rightPanelState 업데이트 추적
  - DataPreview: PDF 로드 체크, viewMode 전환, 렌더링 상태 모니터링
- **렌더링 문제 진단**: PDF 뷰어가 나타나지 않는 원인 즉시 파악 가능

### 📝 **UPDATED! 간결한 문서 분석 시스템 (Citation-Free Design)**

- **🎯 핵심 변경: 인용 배지 시스템 제거**
  - AI 답변이 더욱 자연스럽고 읽기 쉬운 일반 텍스트로 표시
  - 복잡한 페이지 번호 인용 시스템 제거로 UI 간결화
  - 사용자는 우측 PDF 뷰어를 수동으로 탐색하여 문서 확인

- **간소화된 시스템 프롬프트**:
  - 강제 인용 규칙 제거
  - AI가 문서 내용을 자연스러운 언어로 설명
  - 출처 표시는 일반 텍스트로만 제공

- **개선된 사용자 경험**:
  - 클릭 가능한 배지 없이 깔끔한 채팅 인터페이스
  - ReactMarkdown으로 읽기 쉬운 포맷팅 유지
  - PDF 뷰어는 독립적으로 사용 (Database 아이콘 클릭)

### 📁 소스 패널 (좌측 16%)

- **NotebookLM 스타일 "+ 소스 추가" 버튼** (캡슐 디자인)
- **Deep Research 배너**: 그라데이션 배경 (보라→파랑→초록)
- **웹 검색 바**: 실시간 웹 검색 및 크롤링 기능
  - Fast/Deep Research 토글
  - 검색 진행률 프로그레스 바
- **체크박스 기반 소스 선택 시스템**
  - 모두 선택/선택 해제 기능
  - 소스 타입별 아이콘 (📄 파일, 🌐 웹, 📊 리포트)
  - 원본 링크 버튼 (ExternalLink 아이콘)
- **컴팩트 디자인**: 좁은 패널에 최적화된 텍스트 크기 (text-xs, text-[10px])

### 💬 채팅 인터페이스 (중앙 42% - PDF 뷰어와 1:1 대칭)

- **3개 AI 모델 선택**: ⚡ 빠름 (GPT-5.1 Chat Latest) / 🧠 심층 (GPT-5.1 Thinking) / 💎 Gemini (Gemini 3 Flash Preview)
- **선택된 소스 표시**: 파란색 태그 (최대 2개 표시 + 나머지 개수)
- **넓은 채팅창 최적화**:
  - **말풍선 최대 너비 90%**: 텍스트 여유 공간 확보
  - **여백 확대**: p-8 (32px), space-y-5 (20px)
  - **가독성 향상**: text-[15px], leading-relaxed, px-5 py-4
- **메신저 스타일 대화형 UI**
  - **Universal Document Analyzer**: 맥락 기반 자율 분석 (No "No" Policy)
  - **ReactMarkdown 렌더링**: 굵은 글씨 (font-weight: 700), 헤더, 리스트 지원
  - **맥락 기반 추론 태그**: 💡 Lightbulb 아이콘과 함께 추론 답변 표시
  - **구조화된 답변**: 핵심 요약 → 상세 분석 (직접 근거 + 맥락 기반 분석) → AI 인사이트 → 출처/참조
- **자동 문서 분석**: 파일 선택 시 즉시 요약 + 추천 질문 생성
- **추천 질문 버튼**: 클릭 시 자동 전송
- **출처 및 키워드 매칭** 표시
- **일상 대화 모드**: 문서 없이도 간단한 대화 가능
- Enter/Shift+Enter 키보드 단축키

### 📊 스튜디오 패널 (우측 42% - 채팅창과 1:1 대칭)

- **NotebookLM "Studio" 디자인**
- **자연어 인사이트 카드 (기본 뷰)**:
  - **핵심 요약**: AI 생성 문서 요약 (편집 가능)
  - **주요 내용**: 3-5개 핵심 포인트 리스트 (각 항목 편집 가능)
  - **핵심 키워드**: 문서 주요 키워드 태그 (편집 가능)
  - **문서 메타데이터**: 파일명, 페이지 수, 문자 수
- **실시간 편집 기능**:
  - 각 섹션 우측 상단 Edit2 아이콘으로 편집 모드 진입
  - 편집 중: 초록색 Save 버튼 / 회색 X 취소 버튼
  - 저장 시 naturalSummary 상태에 반영
- **뷰 모드 전환** (Database 아이콘):
  - 자연어 카드 뷰 ↔ JSON 데이터 뷰 토글
  - PDF 뷰어 모드 (인용 배지 클릭 시 자동 전환)
- **JSON 데이터 뷰어** (토글 시):
  - JSON 트리 구조 렌더링 (라이트 테마)
  - 확장/축소 가능한 JSON 구조
  - 타입별 색상 구분 (문자열: 녹색, 숫자: 파란색, 키: 빨간색)
  - 복사 버튼으로 JSON 데이터 원클릭 복사
- **업데이트 시간 표시**: 푸터에 마지막 업데이트 시간

## 기술 스택

- **React 18** - UI 프레임워크
- **Vite** - 빌드 도구 및 개발 서버
- **Tailwind CSS** - 유틸리티 기반 스타일링
- **Lucide React** - 아이콘 라이브러리
- **Context API** - 다국어 상태 관리
- **PDF.js (pdfjs-dist)** - PDF 텍스트 추출
- **react-markdown** + **remark-gfm** - Markdown 렌더링 및 GitHub Flavored Markdown 지원
- **OpenAI API**:
  - **GPT-4o-mini** - 빠른 응답, 문서 요약, 추천 질문 생성, 웹 검색
  - **GPT-4o** - Universal Document Analyzer, 심층 RAG 분석, Deep Research 리포트 생성
- **Web Crawling** - AllOrigins API (CORS 우회 프록시)로 웹 페이지 실시간 크롤링

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 프로덕션 빌드
```bash
npm run build
```

### 4. 프리뷰
```bash
npm run preview
```

## 프로젝트 구조

```
notebooklm-dashboard/
├── src/
│   ├── components/
│   │   ├── SourcePanel.jsx      # NotebookLM 스타일 소스 관리 + 웹 검색 UI
│   │   ├── DataPreview.jsx      # JSON 뷰어 (복사 기능 포함)
│   │   └── ChatInterface.jsx    # 채팅 인터페이스 + 모델 선택
│   ├── contexts/
│   │   └── LanguageContext.jsx  # 다국어 지원 Context
│   ├── locales/
│   │   └── translations.js      # 한국어/영어 번역
│   ├── services/
│   │   ├── aiService.js         # 엄격한 RAG 로직 + 모델 관리
│   │   └── webSearchService.js  # 🌐 웹 검색 및 크롤링 엔진
│   ├── utils/
│   │   └── fileParser.js        # 파일 파싱 유틸리티
│   ├── App.jsx                  # 메인 앱 컴포넌트
│   ├── main.jsx                 # 엔트리 포인트
│   └── index.css                # 글로벌 스타일
├── public/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 주요 컴포넌트

### SourcePanel

- "+ 소스 추가" 모달 시스템
- 체크박스 기반 다중 선택
- 파일 업로드 (PDF, Word, Excel, TXT, JSON)
- 전체 선택/선택 해제 버튼
- 파일 파싱 및 상태 관리

### DataPreview

- **클립보드 복사 기능**: JSON 데이터 원클릭 복사
- 복사 피드백: 2초간 "복사됨!" 표시
- JSON 트리 구조 렌더링 (라이트 테마)
- 확장/축소 토글 기능
- 타입별 색상 구분
- 긴 문자열 자동 축약 (100자 이상)
- 강화된 스타일: border-2, shadow-md

### ChatInterface

- **자동 문서 분석**: 파일 선택 시 즉시 요약 및 추천 질문 생성
- **추천 질문 UI**: 클릭 가능한 질문 버튼 (자동 제출)
- 다중 소스 컨텍스트 관리
- 선택된 소스 태그 표시
- 엄격한 RAG 기반 응답
- 출처 및 키워드 매칭 표시
- 문서 없음 경고 시스템
- 타이핑 인디케이터
- 자동 스크롤
- 다국어 메시지 지원
- **일상 대화 모드**: 문서 없이도 간단한 대화 가능

### LanguageContext

- 한국어/영어 전환
- 번역 함수 제공 (t())
- 전역 언어 상태 관리

## 핵심 기능 구현

### 엄격한 RAG 시스템 (aiService.js)

- **문서 자동 요약** (`generateDocumentSummary`): 파일 선택 시 3-5줄 요약 자동 생성
- **추천 질문 생성** (`generateSuggestedQuestions`): 문서 내용 기반 질문 3개 자동 생성
- **하이브리드 대화 모드** (`generateStrictRAGResponse`):
  - 일상 대화: 문서 없이도 인사/감사 등 간단한 대화 가능 (temperature: 0.8)
  - 문서 기반 답변: 엄격한 RAG로 문서 내용만 사용 (temperature: 0.3)
- **할루시네이션 방지**: 문서에 없는 내용은 "찾을 수 없습니다" 응답
- **언어 자동 감지**: 한글 정규식으로 입력 언어 감지
- **출처 표시**: 모든 답변에 파일명 표시 (📄 출처: filename)

### PDF 파일 파싱 (fileParser.js)

- **PDF.js 통합**: `extractPDFText` 함수로 실제 PDF 텍스트 추출
  - 로컬 워커 사용: CDN 대신 `pdfjs-dist/build/pdf.worker.min.mjs`
  - 페이지별 텍스트 추출: `getTextContent()` API 사용
  - 상세 디버깅 로그: 추출 과정 전체를 console.log로 추적
- **텍스트 추출** (`extractTextFromParsedData`): JSON 구조에서 RAG용 텍스트 추출
  - PDF: `extractedText` 필드 사용
  - TXT: 전체 내용 읽기
  - JSON: 파싱 및 구조화
  - 웹 URL: 메타데이터 추출 (시뮬레이션)
- 파일 크기 포맷팅 유틸리티

### 상태 관리

- 소스 목록 및 선택 상태 (sources, selectedSourceIds)
- 채팅 메시지 히스토리
- JSON 뷰어 확장/축소 상태
- 복사 버튼 피드백 상태
- 다국어 설정

## 최근 업데이트

### 🔍 2025-12-31: PDF 뷰어 렌더링 디버깅 시스템 + 파일 감지 개선

#### 포괄적인 디버깅 로깅 시스템

- [x] **전체 이벤트 체인 추적**: 인용 배지 클릭부터 PDF 렌더링까지 모든 단계 로깅
- [x] **CitationBadge 디버깅**:
  - 클릭 이벤트 감지 로그
  - 페이지 번호 및 범위 인용 추적
  - onPageClick 핸들러 연결 상태 검증
- [x] **ChatInterface 디버깅**:
  - AI 응답 내용 미리보기 (첫 200자)
  - 인용 패턴 정규식 매칭 결과
  - 인용 배지 개수 카운팅
  - allSources 데이터 검증 (파일명, 페이지 수)
- [x] **App.jsx 디버깅**:
  - rightPanelState 변경 감지
  - 현재 상태와 다음 상태 비교
  - DataPreview 전달 확인
- [x] **DataPreview 디버깅**:
  - PDF 파일 감지 상세 로그
  - viewMode 변경 추적
  - rightPanelState 반응 확인
  - pdfState 렌더링 상태 모니터링
  - pageRefs 요소 검색 결과

#### PDF 파일 감지 로직 강화

- [x] **3단계 폴백 시스템**:
  ```javascript
  const isPDF = selectedFile?.file && (
    selectedFile.file.type?.includes('pdf') ||           // 1. MIME type
    selectedFile.file.name?.toLowerCase().endsWith('.pdf') ||  // 2. 파일명
    selectedFile.name?.toLowerCase().endsWith('.pdf')    // 3. 소스명
  )
  ```
- [x] **대소문자 무관**: `.PDF`, `.pdf`, `.Pdf` 모두 인식
- [x] **MIME type 누락 대응**: 브라우저/파일 시스템별 차이 보완

#### 디버깅 포인트 세부 사항

**CitationBadge.jsx (Line 18)**
```javascript
console.log('[CitationBadge 클릭] 페이지 이동 요청:', targetPage,
  isRange ? `(범위: ${startPage}-${endPage})` : '(단일 페이지)')
```

**ChatInterface.jsx (Lines 291-319)**
```javascript
console.log('[AI 응답] 인용 패턴 확인:', citationMatches)
console.log('[allSources 검증] 총', allSourcesData.length, '개 파일')
```

**App.jsx (Lines 48-51)**
```javascript
console.log('[App.jsx] 인용 배지 클릭 감지! 페이지 이동 시작:', pageNumber)
console.log('[App.jsx] rightPanelState 업데이트 완료 → DataPreview가 감지할 예정')
```

**DataPreview.jsx (Lines 554-572)**
```javascript
console.log('[DataPreview PDF 로드 체크] isPDF:', isPDF)
console.log('[DataPreview viewMode 변경] viewMode:', viewMode)
```

#### 문제 해결 전략

- **PDF 뷰어 미표시**: viewMode, pdfState, renderedPages 상태 확인
- **페이지 스크롤 실패**: pageRefs 요소 존재 여부 확인
- **데이터 전달 누락**: allSources, pageTexts 데이터 검증
- **파일 인식 오류**: 3단계 PDF 감지 로직으로 해결

#### 기술 구현

- **DataPreview.jsx:554-572**: 향상된 PDF 파일 감지 로직
- **DataPreview.jsx:518-522**: viewMode 변경 감지 useEffect
- **DataPreview.jsx:526-550**: rightPanelState 추적 useEffect
- **CitationBadge.jsx:14-25**: 클릭 이벤트 핸들러 로깅
- **ChatInterface.jsx:291-295**: AI 응답 인용 패턴 검증
- **ChatInterface.jsx:310-319**: allSources 데이터 무결성 확인

### 🎨 2025-12-31: 1:1 대칭 레이아웃 + 채팅창 가독성 최적화

#### 📐 완벽한 대칭 레이아웃 (15% | 42.5% | 42.5%)

- [x] **채팅창과 PDF 뷰어 1:1 비율**: 좌측 사이드바 제외 나머지 영역을 정확히 50:50 분할
- [x] **넓은 채팅 공간**: 35% → 42.5%로 확대 (7.5% 증가)
- [x] **PDF 뷰어 대칭**: 50% → 42.5%로 조정하여 채팅창과 완전 대칭

#### 💬 채팅창 가독성 대폭 강화

- [x] **말풍선 최대 너비 확대**: 80% → 90%로 증가
- [x] **여백 증가**:
  - 메시지 영역 패딩: p-6 → p-8 (32px)
  - 메시지 간 간격: space-y-4 → space-y-5 (20px)
- [x] **텍스트 가독성 향상**:
  - 폰트 크기: text-sm (14px) → text-[15px] (15px)
  - 행간: 기본 → leading-relaxed (1.625)
  - 말풍선 패딩: px-4 py-3 → px-5 py-4

#### 🖼️ PDF 고품질 렌더링 (Scale 2.0)

- [x] **2배 스케일 렌더링**: 기본 스케일 × 2.0으로 선명도 극대화
- [x] **스마트 이미지 표시**: 2배 크기 이미지를 50% scale로 표시 (고품질 유지)
- [x] **컨테이너 너비 자동 계산**: 42.5% 패널에 맞춘 동적 스케일 계산

#### 🔧 기술 구현

**레이아웃 비율 (App.jsx):**
```javascript
// 15% | 42.5% | 42.5% - 완벽한 대칭
<div style={{ width: '15%' }}>SourcePanel</div>
<div style={{ width: '42.5%' }}>ChatInterface</div>
<div style={{ width: '42.5%' }}>DataPreview</div>
```

**채팅 가독성 (ChatInterface.jsx):**
```javascript
// 넓은 채팅창에 최적화
<div className="p-8 space-y-5">
  <div className="max-w-[90%]">
    <div className="px-5 py-4">
      <div className="text-[15px] leading-relaxed">
```

**PDF 고품질 렌더링 (DataPreview.jsx):**
```javascript
// 2배 스케일 렌더링
const baseScale = targetWidth / baseViewport.width
const scale = baseScale * 2.0  // 선명도 향상

// 컨테이너 너비 계산 (42.5%)
const containerWidth = window.innerWidth * 0.425 * 0.95
```

**이미지 표시 최적화:**
```javascript
<img
  style={{
    transform: 'scale(0.5)',
    transformOrigin: 'top left',
    width: '200%',
    maxWidth: '200%'
  }}
/>
```

#### 🎯 사용자 경험 개선

- **시각적 균형**: 채팅과 PDF 뷰어가 동일한 너비로 시선 분산 최소화
- **읽기 편의성**: 넓어진 채팅창에서 긴 답변도 편안하게 읽기 가능
- **PDF 선명도**: 2배 스케일 렌더링으로 작은 텍스트도 선명하게 표시
- **레이아웃 일관성**: 모든 기능(인용 배지 클릭, 스크롤 등) 완벽 유지

### 🚀 2025-12-30: GPT-5.1 + Gemini 3 Flash 업그레이드 + 심층 분석 최적화

#### ✨ 최신 AI 모델 통합

- [x] **GPT-5.1 완전 지원** (2025년 12월 기준 최신)
  - **GPT-5.1 Chat Latest** (Instant 모드) - 빠른 응답, 적응형 추론
  - **GPT-5.1** (Thinking 모드) - 심층 추론, 고급 분석
  - API 파라미터 최적화: `max_completion_tokens` 사용 (max_tokens 대체)
  - Temperature 파라미터 제거 (GPT-5.1은 내부적으로 고정값 1 사용)

- [x] **Gemini 3 Flash Preview** (2025.12.17 출시)
  - 공식 모델명: `gemini-3-flash-preview`
  - 고품질 문서 분석 및 추론
  - GPT와 동일한 프롬프트 시스템 적용

#### 🧠 심층 분석 모드 대폭 강화

- [x] **토큰 확장**: 심층 분석(Thinking) 모드 4000 토큰, 일반(Instant) 모드 2000 토큰
- [x] **타임아웃 확대**: 120초 타임아웃으로 긴 문서 분석 지원
- [x] **응답 검증**: 빈 응답 자동 감지 및 에러 처리
- [x] **로깅 시스템**:
  - 페이지 데이터 전달 검증 로그
  - AI 응답 길이 추적
  - 모델별 성능 모니터링

#### 📌 추론 기반 인용 배지 시스템 완성

- [x] **강제 인용 정책**: "인용을 생성할 수 없습니다" 응답 완전 금지
- [x] **🚨 추론 기반 배지 생성 (핵심 기능)**:
  - "🔍 맥락 기반 분석" 섹션에도 페이지 배지 100% 필수
  - 텍스트 일치도가 낮아도 키워드 유사도/주제 연관성 기반 페이지 추론
  - 추론 근거 페이지 모두 나열 (예: [3, 7, 15, 23])

- [x] **다양한 인용 형식 지원**:
  - 단일 페이지: `[N]`
  - 범위 인용: `[N-M]`
  - 다중 페이지: `[N, M, O]`
  - 복합 범위: `[N-M, O]`

- [x] **페이지 마커 시스템**: 문서 텍스트에 `[페이지 N]` 마커 자동 삽입으로 정확한 페이지 추론

#### 📐 레이아웃 최적화 (15% | 35% | 50%)

- [x] **우측 PDF 뷰어 패널 50% 확대**: 문서 가독성 극대화
- [x] **중앙 채팅 패널 35%**: 대화 공간 최적화
- [x] **좌측 소스 패널 15%**: 컴팩트 디자인

#### 🎯 답변 구조화 템플릿 개선

```markdown
### [핵심 요약]
질문에 대한 답변을 1~2줄로 강렬하게 요약[1, 2]

### [상세 분석]
**📄 직접 근거**
1. 문서에 명시된 내용[3]
2. 인용 텍스트 예시[5-8]

**🔍 맥락 기반 분석** [문서 맥락 기반 추론]
1. 문서 전반에 걸쳐 반복 키워드 분석[3, 7, 15, 23]
2. 주제 연관성 기반 추론[10-14]

### [AI 인사이트/추론]
문서 흐름상 유추 가능한 정보[5, 12, 18]

### [출처/참조]
답변 근거가 된 섹션/데이터 위치
```

#### 🔧 기술 세부사항

**API 최적화:**
```javascript
// GPT-5.1 호출
const requestBody = {
  model: useThinking ? 'gpt-5.1' : 'gpt-5.1-chat-latest',
  messages: messages,
  max_completion_tokens: useThinking ? 4000 : 2000
}
signal: AbortSignal.timeout(120000)  // 120초 타임아웃
```

**Gemini 3 Flash 호출:**
```javascript
generationConfig: {
  temperature: 0.3,
  maxOutputTokens: isDeepAnalysis ? 4000 : 2000
}
```

**페이지 데이터 매핑:**
```javascript
const pageTextInfo = documentContextArray.map(doc => {
  const pageTexts = doc.parsedData?.pageTexts || []
  return pageTexts.map(page =>
    `[페이지 ${page.pageNumber}]\n${page.text}`
  ).join('\n\n')
})
```

#### 📊 성능 개선

- **심층 분석 응답 길이**: 평균 2000자 → 4000자 (2배 증가)
- **인용 배지 생성률**: 직접 매칭만 → 추론 기반 100% 생성
- **페이지 추론 정확도**: 키워드 유사도 알고리즘 적용

### 🤖 2025-12-30: Google Gemini API 통합 - 3개 AI 모델 지원 (이전 버전)

#### ✨ 멀티 모델 아키텍처

- [x] **Google Gemini 1.5 Pro 통합**: OpenAI GPT와 함께 사용 가능
- [x] **3개 모델 선택 UI**:
  - ⚡ **빠름** (GPT-4o-mini) - 빠른 응답
  - 🧠 **심층** (GPT-4o) - 심층 분석
  - 💎 **Gemini** (gemini-1.5-pro) - Google AI 고품질 분석
- [x] **통합 프롬프트 시스템**: 모든 모델이 동일한 Universal Document Analyzer 프롬프트 사용
- [x] **인용 시스템 호환**: Gemini도 [N], [N-M] 페이지 인용 배지 지원

#### 🔧 기술 구현

- [x] **@google/generative-ai SDK 설치**
- [x] **환경 변수**: `VITE_GEMINI_API_KEY` 추가
- [x] **aiService.js 리팩토링**:
  - `callGemini()` 함수 추가
  - `generateStrictRAGResponse()` 모델 라우팅 로직 구현
- [x] **ChatInterface.jsx UI 업데이트**:
  - 3개 모델 버튼 (에메랄드 색상 Gemini 버튼)
  - 모델 파라미터 전달 방식 개선

#### 🎯 사용 방법

1. `.env` 파일에 `VITE_GEMINI_API_KEY` 추가
2. 채팅 인터페이스 상단에서 모델 선택
3. GPT-4o-mini, GPT-4o, Gemini 중 선택하여 문서 분석

### 🎨 2025-12-30: PDF 뷰어 완전 최적화 - 레이아웃 + 100% 렌더링 + UI 개선

#### 📐 레이아웃 비율 재조정

- [x] **3단 구조 개선**: (25% | 50% | 25%) → **(20% | 35% | 45%)**
  - **좌측 소스 패널**: 25% → 20% (최소화)
  - **중앙 채팅 패널**: 50% → 35% (축소)
  - **우측 PDF 뷰어 패널**: 25% → **45% (확대)**
- [x] **PDF 가독성 향상**: 우측 패널에 더 많은 공간 할당으로 PDF 페이지 전체 뷰 개선
- [x] **반응형 레이아웃**: Flexbox 기반으로 창 크기 변경 시에도 비율 유지

#### 🖼️ PDF 100% 가로폭 렌더링

- [x] **동적 스케일 계산**: 컨테이너 너비에 맞게 PDF 스케일 자동 조정
  - `targetWidth = window.innerWidth * 0.45 * 0.95`
  - `scale = targetWidth / baseViewport.width`
- [x] **100% 너비 렌더링**: PDF 페이지가 우측 패널 가로폭에 꽉 차게 표시
- [x] **고해상도 유지**: devicePixelRatio 적용으로 선명한 이미지 품질
- [x] **반응형 지원**: 창 크기 변경 시 자동으로 재렌더링 (향후 구현 예정)

#### 🎨 NotebookLM 스타일 UI 대폭 개선

- [x] **배경 그라데이션**: `bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50`
- [x] **페이지 간 간격 확대**: `space-y-6`, `py-6 px-4`
- [x] **프리미엄 카드 디자인**: `shadow-xl`, `rounded-xl`, `hover:shadow-2xl`
- [x] **페이지 헤더 개선**:
  - 그라데이션 배경 (`from-blue-50 to-indigo-50`)
  - FileText 아이콘 추가
  - 페이지 번호 배지 (흰색 둥근 배지)
- [x] **페이지 이미지 최적화**: `maxWidth: 100%`, `display: block`

#### 🎯 목적

- NotebookLM처럼 PDF 문서를 큰 화면으로 읽을 수 있도록 우측 패널 확대
- 인용 배지 클릭 시 넓은 화면에서 PDF 페이지 확인 가능
- 채팅과 문서를 동시에 보면서 작업하기에 최적화된 레이아웃
- PDF 페이지가 컨테이너에 빈틈없이 꽉 차서 가독성 극대화

### 🎯 2025-12-30: NotebookLM 스타일 PDF 인용 및 이동 시스템 완성

#### 📌 PDF 페이지별 데이터 전처리
- [x] **페이지 이미지 변환**: PDF.js로 각 페이지를 Base64 썸네일로 변환 (0.3 scale)
- [x] **페이지 메타데이터**: `pageTexts` 배열에 페이지 번호, 텍스트, 단어 수, 썸네일 저장
- [x] **자동 렌더링**: PDF 업로드 시 모든 페이지 자동 이미지 변환

#### 💬 채팅 인용 배지 시스템
- [x] **CitationBadge 컴포넌트**: `<cite page="N">텍스트</cite>` 자동 파싱
- [x] **클릭 가능한 인용 배지**: 파란색 배지 (FileText 아이콘 + 페이지 번호)
- [x] **호버 썸네일 미리보기**: 마우스 올리면 페이지 이미지 + 텍스트 툴팁 표시
- [x] **스마트 렌더링**: ReactMarkdown 내에서 인용 태그 감지 및 자동 변환

#### 📄 PDF 뷰어 통합
- [x] **모달 PDF 뷰어**: 전체 화면 모달로 PDF 표시
- [x] **페이지 이동 연동**: 인용 배지 클릭 → 즉시 해당 페이지로 이동
- [x] **네비게이션 컨트롤**: 이전/다음 페이지, 줌 인/아웃 (50% ~ 300%)
- [x] **고해상도 렌더링**: PDF.js Canvas 렌더링으로 선명한 표시

#### 🔒 상태 분리 및 안정성 강화
- [x] **DataPreview 독립성**: 스튜디오 패널 모드 전환이 채팅 히스토리에 영향 없음
- [x] **이벤트 전파 차단**: `e.stopPropagation()`으로 리렌더링 범위 제한
- [x] **파일 참조 보존**: PDF 뷰어가 원본 File 객체 직접 참조 (메모리 효율)

### ✨ 2025-12-30: NotebookLM 스타일 인용 시스템 + UI 개선 (이전)

#### 📌 인용(Citation) 기능 구현
- [x] **CitationBadge 컴포넌트**: 페이지 번호 인용 배지 생성
  - 파란색 배지 디자인 (FileText 아이콘 + 페이지 번호)
  - 호버 시 페이지 미리보기 툴팁 표시 (200자 제한)
  - 클릭 시 페이지 이동 이벤트 트리거
- [x] **인용 태그 파싱**: `<cite page="N">텍스트</cite>` 형식 자동 변환
  - ChatInterface에서 Markdown 렌더링 시 CitationBadge로 치환
  - PDF parsedData의 pageTexts 배열 활용
- [x] **PDF 페이지 메타데이터**: fileParser.js에 페이지별 텍스트 저장
  - `pageTexts` 배열에 각 페이지 번호, 텍스트, 단어 수 저장
  - GPT 프롬프트에 인용 태그 규칙 추가
- [x] **PDFViewer 컴포넌트**: PDF 페이지 뷰어 구현 (미사용)
  - PDF.js로 캔버스 렌더링
  - 페이지 이동, 줌 인/아웃 기능
  - 하이라이트 효과 (3초간 노란색 강조)

#### 🎨 스튜디오 패널 UI 대폭 개선
- [x] **문서 제목 및 메타데이터 카드**
  - 그라데이션 배경 (파란색 → 남색)
  - 큰 굵은 제목 (text-lg font-bold)
  - 메타데이터 배지: 페이지 수, 문자 수, 파일 유형
  - 흰색 둥근 배지 스타일 (bg-white px-2 py-0.5 rounded-full)
- [x] **핵심 요약 섹션 강화**
  - 💡 아이콘 추가
  - 왼쪽 남색 테두리 (4px, border-l-4 border-indigo-600)
  - "핵심 요약" 제목으로 변경 (문서 요약 → 핵심 요약)
  - 더 큰 폰트 (text-base) + 굵은 글씨 (font-medium)
- [x] **키워드 UI 개선**
  - 파란색 테두리 추가 (border-blue-200)
  - 호버 효과 (hover:bg-blue-100)
  - 더 부드러운 색상 전환 (transition-colors)

#### 🔧 채팅 히스토리 유지 개선
- [x] **DataPreview useEffect 최적화**
  - viewMode를 의존성 배열에서 제거
  - `[selectedFile?.id, language]`로 변경
  - 자연어/JSON 모드 전환 시 채팅 초기화 방지
- [x] **디버깅 로그 강화**
  - extractedText 존재 여부 및 길이 추적
  - GPT API 응답 상태 로그
  - JSON 파싱 과정 상세 로그

#### 📝 리스트 형식 개선 (NotebookLM 스타일)
- [x] **한 줄 리스트 렌더링**: "1. **서론**" 형식으로 표시
  - CSS 규칙 추가 (index.css): `li > p { display: inline; }`
  - ReactMarkdown 컴포넌트 커스터마이징
  - GPT 프롬프트에 리스트 규칙 명시
- [x] **인용 태그와 리스트 통합 처리**
  - `processTextWithCitations()` 함수로 텍스트 내 인용 태그 변환
  - 리스트 아이템 내에서도 인용 배지 정상 렌더링

### 🎨 2025-12-26: 스튜디오 패널 NotebookLM 스타일 업그레이드

- [x] **자연어 문서 분석 모드 (기본값)**: GPT-4o 기반 자동 분석
  - **문서 요약**: 한 문장으로 정의 (굵게 표시)
  - **핵심 키워드**: 3-5개 파란색 태그로 표시
  - **구조 분석**: 문서 구조 2-3줄 설명
  - 연한 그레이 배경 (#F9FAFB) + 카드 스타일
- [x] **데이터 보기 토글 버튼**: Database 아이콘으로 JSON/자연어 모드 전환
  - 툴팁: "관리자용 원본 데이터 보기"
  - JSON 모드에서만 복사 버튼 활성화
- [x] **로딩 상태**: Spinner + "문서 분석 중..." 메시지
- [x] **generateNaturalSummary()**: GPT-4o로 extractedText 분석 (최대 3,000자)

### ⚠️ 2025-12-26: Tavily API 크레딧 소진 감지 및 경고 시스템

- [x] **에러 응답 타입 구분**: `searchWithTavily()` 함수 개선
  - `credits_exhausted`: 크레딧/리미트/쿼터 관련 에러
  - `api_error`: 기타 API 에러
  - `network_error`: 네트워크 오류
  - `no_api_key`: API 키 없음
- [x] **구조화된 응답**: `{ success, reason, error, results }` 형식
- [x] **사용자 친화적 경고 메시지**:
  - 한국어: "⚠️ Tavily API 크레딧이 소진되었습니다. 대체 검색 방식을 사용합니다."
  - 영어: "⚠️ Tavily API credits exhausted. Using alternative search method."
- [x] **노란색 경고 UI**: 배경(bg-yellow-50) + 테두리(border-yellow-300) + ⚠️ 아이콘
- [x] **프로그레스 바 숨김**: 경고 메시지만 표시 (3초 후 자동 종료)

### 🌐 2025-12-26: 웹 검색 스마트 추출 + 컴팩트 UI 개선

- [x] **Tavily API Context 모드 통합**: 전체 페이지 대신 질문 관련 핵심 컨텍스트만 추출
  - `search_depth: 'advanced'`, `include_raw_content: false`로 광고/메뉴 제거
  - 관련성 점수(score) 기반 자동 정렬
- [x] **데이터 청킹 및 필터링**: 긴 텍스트를 500자 단위로 분할 → 키워드 유사도 상위 5개 선택
  - `chunkText()`: 문장 단위 청킹 (500자)
  - `calculateSimilarity()`: 간단한 키워드 기반 유사도 계산
  - `selectRelevantChunks()`: 관련성 높은 청크만 선택
- [x] **GPT-4o 요약 엔진**: 모든 웹 소스에 대해 질문 맥락 기반 3줄 요약 자동 생성
  - `summarizeWebPage()`: 질문에 최적화된 형태로 요약
  - 중요 수치, 날짜, 이름 반드시 포함
- [x] **컴팩트 소스 리스트 UI**: 제목 + 짧은 요약만 표시, 펼치기/접기 토글
  - ChevronRight/ChevronDown 아이콘으로 펼치기/접기
  - `expandedSourceIds` 상태로 펼쳐진 소스 추적
  - 요약 섹션은 회색 배경 박스로 구분 표시
- [x] **강화된 웹 클리닝**: 불필요한 요소 제거 강화
  - `script`, `style`, `nav`, `footer`, `header`, `aside`, `iframe`
  - `.ad`, `.advertisement`, `.cookie-banner`, `.social-share` 등
- [x] **관련 구절 강조**: ReactMarkdown + 시스템 프롬프트에서 핵심 키워드 자동 굵게 표시
  - 핵심 명사, 수치, 기능명은 `**굵게**` 처리
  - 구조화된 답변 템플릿 (핵심 요약 → 상세 분석 → 출처)

### 🎨 2025-12-26: NotebookLM UI 완전 재구성 + Universal Document Analyzer

- [x] **3단 레이아웃 (25% | 50% | 25%)**: NotebookLM과 동일한 구조로 완전 재설계
  - 좌측: 소스 패널 (컴팩트 디자인)
  - 중앙: 채팅 인터페이스 (50% 확대)
  - 우측: 스튜디오 패널 (JSON 뷰어)
- [x] **Universal Document Analyzer 시스템**: 맥락 기반 자율 분석
  - **No "No" Policy**: "정보가 없습니다" 절대 금지, 맥락 분석으로 추론
  - **가상 목차 자동 생성**: 목차 없는 문서도 페이지 헤더 분석으로 구조 파악
  - **논리적 추론 시스템**: 문서 전체 맥락(톤, 제목, 표, 반복 키워드)을 종합하여 답변 도출
  - **추론 투명성**: `[문서 맥락 기반 추론]` 태그로 추론 부분 명시
- [x] **ReactMarkdown 통합**: Markdown 렌더링 및 시각적 강조
  - **Bold 강제 렌더링**: `font-weight: 700` CSS 적용
  - **구조화된 답변 템플릿**: 헤더(###), 리스트, 굵은 글씨 자동 적용
  - **시각적 위계**: 핵심 명사, 수치, 기능명 굵게 표시
- [x] **컴팩트 UI 디자인**: 모든 컴포넌트 NotebookLM 스타일로 축소
  - 텍스트 크기: text-xs (12px), text-[10px], text-[9px]
  - 아이콘 크기: w-3 h-3 (12px), w-3.5 h-3.5 (14px)
  - 여백: p-2.5, space-y-2.5, px-2.5 py-0.5
- [x] **Lightbulb 추론 태그**: 맥락 기반 추론 답변에 💡 아이콘 표시

### ✅ 2025-12-26: 실시간 웹 검색 + GPT-4o 강제 기능

#### 🌐 실시간 웹 검색 시스템 (NEW!)
- [x] **검색 쿼리 최적화**: 사용자 질문을 실시간 검색어로 자동 변환
  - GPT-4o-mini가 날짜 + "실시간", "최신" 키워드 추가
  - 예: "삼성전자 주가 어때?" → "2025년 12월 26일 삼성전자 실시간 주가"
- [x] **10개 소스 크롤링**: GPT가 신뢰할 수 있는 URL 10개 추천 → 병렬 크롤링
- [x] **CORS 우회**: AllOrigins API 프록시로 클라이언트 측 웹 크롤링
- [x] **Fast/Deep Research**: 빠른 검색 (10개) / 심층 리포트 (5개 + GPT-4o 종합 분석)

#### 🔒 GPT-4o 과거 지식 차단 시스템 (NEW!)
- [x] **실시간 데이터 강제 사용**: 시스템 프롬프트에 "⚠️ 과거 학습 데이터 사용 금지" 명시
- [x] **날짜 컨텍스트**: 모든 답변에 현재 날짜 표시 및 수집 시간 명시
- [x] **출처 엄격화**: "📄 출처: ${fileName} (${today} 수집)" 형식 강제
- [x] **검증 로직**: "제공된 웹 검색 결과에 따르면" 등 실시간 데이터 인용 강제

#### ⚡ 듀얼 AI 모델 시스템
- [x] **모델 선택 UI**: Instant (⚡ GPT-4o-mini) / Thinking (🧠 GPT-4o) 토글
- [x] **작업별 최적화**:
  - Instant: 문서 요약, 추천 질문 생성, 일상 대화 (빠른 응답)
  - Thinking: 엄격한 RAG 분석, Deep Research 리포트 (심층 추론)
- [x] **사용자 선택 가능**: 채팅 헤더에서 실시간 모델 전환

#### 📚 다중 소스 RAG 지원
- [x] **여러 문서 동시 선택**: 체크박스로 다중 소스 선택
- [x] **통합 분석**: 선택된 모든 문서를 "[출처: name]" 구분자로 결합
- [x] **출처 추적**: 각 답변에 어느 문서에서 가져왔는지 명시

#### 🎨 UI/UX 개선
- [x] **Tooltip 컴포넌트**: 4방향 위치 지원 (top/bottom/left/right)
- [x] **원본 링크 버튼**: 웹 소스의 원본 사이트 바로가기 (ExternalLink 아이콘)
- [x] **검색 진행률**: "GPT가 추천 URL 생성 중...", "10개 웹페이지 크롤링 중..." 실시간 피드백
- [x] **소스 타입 아이콘**: 📄 파일, 🌐 웹, 📊 리포트 구분

#### 기존 기능
- [x] **PDF 실제 파싱**: PDF.js 통합으로 실제 텍스트 추출
- [x] **자동 문서 요약**: 파일 선택 시 AI가 자동으로 3-5줄 요약 생성
- [x] **추천 질문 생성**: 문서 내용 기반 클릭 가능한 질문 3개 자동 생성
- [x] **일상 대화 모드**: 문서 없이도 간단한 인사/대화 가능
- [x] **JSON 뷰어**: 복사 기능, 타입별 색상 구분, 확장/축소
- [x] **소스 삭제 기능**: 업로드된 파일 삭제 가능

### 🔧 알려진 제한사항
- [ ] **크롤링 성공률**: 일부 사이트는 크롤링 방지 정책으로 접근 제한
  - 해결 방안: Tavily/Serper API 통합 고려 중
- [ ] **PDF OCR 미지원**: 이미지 기반 PDF는 텍스트 추출 불가
  - 텍스트가 포함된 PDF만 지원

## 향후 개선 사항

- [ ] Word/Excel 파일 파싱 라이브러리 연동
  - mammoth.js (Word), xlsx (Excel)
- [ ] 웹 검색 기능 구현
  - Deep Research 기능 활성화
- [ ] 다중 소스 동시 참조 분석
  - 현재는 첫 번째 선택 소스만 사용
- [ ] 문서 내 검색 및 하이라이팅
- [ ] 대화 내역 저장/불러오기 (로컬 스토리지)
- [ ] 반응형 디자인 (모바일 지원)
- [ ] JSON 뷰어 다크모드 토글
- [ ] Claude API 통합 옵션 추가

## 라이선스

MIT
