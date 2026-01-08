# NotebookLM 스타일 문서 기반 분석 도구

엄격한 RAG(Retrieval-Augmented Generation) 시스템을 적용한 NotebookLM 스타일의 문서 분석 및 대화형 대시보드입니다.

## 🎯 핵심 기능

### 1. 엄격한 파일 기반 대화 시스템
- **선택된 파일에만 기반한 답변**: 업로드한 문서의 내용에서만 답변을 생성
- **할루시네이션 방지**: 문서에 없는 내용은 절대 답변하지 않음
- **명확한 출처 표시**: 모든 답변에 참조 문서와 페이지 번호 표시
- **자동 문서 분석**: 파일 선택 시 자동으로 3-5줄 요약 생성
- **추천 질문 생성**: 문서 내용 기반 클릭 가능한 질문 3개 자동 생성

### 2. AI 지침 설정 시스템 (NEW!)
- **사용자 정의 AI 지침**: 사용자가 원하는 대로 AI의 역할과 응답 스타일 설정 가능
- **실시간 적용**: "적용" 버튼 클릭 시 모든 AI 응답에 즉시 반영
- **시스템 프롬프트 오버라이드**: 사용자 지침이 기본 프롬프트보다 우선 적용
- **프리셋 제공**: "서비스 운영자", "문서 분석가" 등 사전 정의된 페르소나
- **사용자 정의 지침 토글**: Edit2 아이콘으로 텍스트 영역 열기/닫기

### 3. NotebookLM 스타일 인용 시스템
- **클릭 가능한 페이지 배지**: `[5]`, `[5-8]` 형태의 파란색 배지
- **범위 인용 지원**: 여러 페이지를 하나의 배지로 표시 (예: 5-8페이지)
- **대괄호 없는 패턴 자동 감지**: "페이지 15", "15-18" 같은 자연어 패턴도 자동 배지 변환
- **보라색 추론 배지**: `[문서 맥락 기반 추론]` 형태의 클릭 가능한 추론 표시
- **PDF 페이지 이동**: 배지 클릭 시 해당 PDF 페이지로 자동 스크롤

### 4. 다국어 지원 (한국어/English)
- UI 전체 다국어 지원 (한/영 토글)
- 사용자 입력 언어 자동 감지
- 감지된 언어로 자동 응답

### 5. 다양한 파일 형식 지원
- **PDF**: PDF.js 통합, 페이지별 고품질 렌더링, PDF 뷰어, 페이지 네비게이션
- **Word (.docx, .doc)**: mammoth.js로 텍스트 추출, 500단어당 1페이지 자동 분할
- **Excel (.xlsx, .xls)**: xlsx 라이브러리로 데이터 추출, 시트별 페이지 처리
- **TXT**: 전체 텍스트 추출, 페이지 단위 분할
- **JSON**: JSON 파싱 및 구조화된 데이터 표시
- **파일 타입별 아이콘**: PDF(빨강), Word(파랑), Excel(초록), TXT(회색), JSON(보라)

### 6. 실시간 PDF 처리
- **PDF.js 통합**: PDF 파일의 실제 텍스트를 클라이언트에서 추출
- **페이지별 렌더링**: 모든 페이지를 이미지로 변환하여 표시
- **고품질 렌더링**: 2배 스케일 렌더링으로 선명한 텍스트 표시
- **PDF 뷰어**: 우측 패널에서 PDF 전체 페이지 확인 가능
- **페이지 네비게이션**: 인용 배지 클릭 시 해당 페이지로 자동 이동

### 7. 다중 AI 모델 지원
- **GPT-5.1 Chat Latest (Instant 모드)**: 적응형 추론, 빠른 응답, 문서 요약, 추천 질문 생성 (`gpt-5.1-chat-latest`)
- **GPT-5.1 (Thinking 모드)**: 고급 추론, 심층 분석, 복잡한 문서 해석 (`gpt-5.1`)
- **Gemini 3 Flash Preview**: Google AI 기반 고품질 분석 (2025.12.17 출시) (`gemini-3-flash-preview`)
- **실시간 모델 전환**: 채팅 중에도 모델 변경 가능
- **대화 맥락 유지**: 모델 전환 시에도 이전 대화 기록 보존

### 8. 웹 검색 기능 (선택적)
- **Fast Research**: URL 크롤링 및 요약
- **Deep Research**: 종합 리포트 생성
- **Tavily API 통합**: 고급 웹 검색 지원 (선택적)
- **소스 타입별 아이콘**: 📄 파일, 🌐 웹, 📊 리포트 구분

## UI 레이아웃 (NotebookLM 스타일 3단 구조)

### 📁 소스 패널 (좌측)
- "+ 소스 추가" 버튼으로 파일 업로드
- 체크박스 기반 다중 선택 시스템
- 전체 선택/해제 기능
- 소스 삭제 기능
- 선택된 소스 시각적 강조

### 💬 채팅 인터페이스 (중앙)
- 3개 AI 모델 선택 (⚡ 빠름 / 🧠 심층 / 💎 Gemini)
- ReactMarkdown 렌더링 (굵은 글씨, 헤더, 리스트 지원)
- 인용 배지 시스템 (페이지 번호 클릭 가능)
- 자동 문서 분석 및 추천 질문
- Enter/Shift+Enter 키보드 단축키
- 깨끗한 초기 화면 (localStorage 비활성화)

### 📊 스튜디오 패널 (우측)
- **PDF 뷰어 모드**: 전체 PDF 페이지 표시 및 네비게이션
- **자연어 분석 모드**: AI 생성 문서 요약 (편집 가능)
- **JSON 데이터 모드**: 구조화된 데이터 뷰어
- **AI 지침 설정 패널**: 하단에 시스템 프롬프트 설정 UI
- 뷰 모드 전환 (Database 아이콘)

## 기술 스택

- **React 18** - UI 프레임워크
- **Vite** - 빌드 도구 및 개발 서버
- **Tailwind CSS** - 유틸리티 기반 스타일링
- **Lucide React** - 아이콘 라이브러리
- **PDF.js (pdfjs-dist)** - PDF 텍스트 추출 및 렌더링
- **mammoth.js** - Word 파일 텍스트 추출
- **xlsx** - Excel 파일 데이터 추출
- **react-markdown** + **remark-gfm** - Markdown 렌더링
- **OpenAI API** - GPT-5.1 (`gpt-5.1`), GPT-5.1 Chat Latest (`gpt-5.1-chat-latest`)
- **Google Gemini API** - Gemini 3 Flash Preview
- **Context API** - 다국어 상태 관리

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 API 키를 설정하세요:
```env
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key (선택)
VITE_TAVILY_API_KEY=your_tavily_api_key (선택)
```

### 3. 개발 서버 실행
```bash
npm run dev
```

### 4. 프로덕션 빌드
```bash
npm run build
```

### 5. 프리뷰
```bash
npm run preview
```

## 프로젝트 구조

```
notebooklm-dashboard/
├── src/
│   ├── components/
│   │   ├── SourcePanel.jsx          # 소스 관리 패널
│   │   ├── ChatInterface.jsx        # 채팅 인터페이스
│   │   ├── DataPreview.jsx          # PDF 뷰어 + JSON 뷰어
│   │   ├── SystemPromptPanel.jsx    # AI 지침 설정 패널
│   │   ├── CitationBadge.jsx        # 인용 배지 컴포넌트
│   │   ├── PDFViewer.jsx            # PDF 렌더링
│   │   ├── FileUpload.jsx           # 파일 업로드
│   │   └── Tooltip.jsx              # 툴팁 컴포넌트
│   ├── contexts/
│   │   └── LanguageContext.jsx      # 다국어 지원 Context
│   ├── locales/
│   │   └── translations.js          # 한국어/영어 번역
│   ├── services/
│   │   ├── aiService.js             # RAG 로직 + AI 모델 관리
│   │   └── webSearchService.js      # 웹 검색 (선택적)
│   ├── utils/
│   │   ├── fileParser.js            # 파일 파싱
│   │   └── pdfViewerController.js   # PDF 뷰어 제어
│   ├── App.jsx                      # 메인 앱 컴포넌트
│   ├── main.jsx                     # 엔트리 포인트
│   └── index.css                    # 글로벌 스타일
├── public/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 최근 업데이트

### 🎯 2026-01-08: 다중 파일 인용 시스템 완전 수정 + 자동 분석 최적화

#### 🔧 다중 파일 인용 버그 수정 (4단계)

**문제 1: PDF 전환 시 우측 패널 미업데이트**
- [x] **증상**: 2개 이상 PDF 파일에서 인용 배지 클릭 시 첫 번째 PDF만 표시
- [x] **원인**: DataPreview의 PDF 렌더링 useEffect가 파일 변경을 감지하지 못함
- [x] **해결**: `selectedFile?.id`를 useEffect 의존성 배열에 추가
- [x] **파일**: [DataPreview.jsx:818](src/components/DataPreview.jsx#L818)

**문제 2: Word/Excel 인용이 첫 번째 PDF 열림**
- [x] **증상**: Word/Excel 파일 인용 배지 클릭 시 첫 번째 PDF 파일 표시
- [x] **원인**: App.jsx의 handlePageClick에서 Word/Excel 파일 처리 시 targetFile 미설정
- [x] **해결**: rightPanelState에 targetFile 추가 (`mode: 'text-preview'` 블록)
- [x] **파일**: [App.jsx:419-423](src/App.jsx#L419-L423)

**문제 3: 저장된 노트북에서 인용이 첫 번째 파일로만 연결**
- [x] **증상**: 노트북 재로드 시 모든 인용 배지가 첫 번째 파일로만 연결
- [x] **원인**: 저장된 메시지의 allSources에 startPage/endPage 정보 누락
- [x] **해결**: processInitialMessages 함수로 페이지 범위 재계산
- [x] **파일**: [ChatInterface.jsx:13-46](src/components/ChatInterface.jsx#L13-L46)

**문제 4: 반복 자동 분석 메시지**
- [x] **증상**: 이미 분석한 파일을 포함한 노트북 재열기 시 자동 분석 메시지 재출력
- [x] **원인**: 분석된 파일 추적 시스템 부재
- [x] **해결**: analyzedSourceIds 트래킹 시스템 구현
- [x] **파일**: [App.jsx](src/App.jsx), [ChatInterface.jsx](src/components/ChatInterface.jsx), [notebookManager.js](src/utils/notebookManager.js)

#### 🚀 자동 분석 최적화 시스템

**analyzedSourceIds 트래킹**
- [x] **데이터 구조**: 노트북에 `analyzedSourceIds: Array<string>` 필드 추가
- [x] **자동 초기화**: 메시지가 있는 노트북 로드 시 모든 소스를 분석됨으로 표시
- [x] **중복 방지**: 이미 분석된 파일은 자동 분석에서 제외
- [x] **실시간 업데이트**: 분석 완료 시 analyzedSourceIds 즉시 업데이트 및 저장

**동작 방식**
```javascript
// 첫 파일 업로드 → 자동 분석 ✅
// 동일 파일 재선택 → 건너뛰기 ✅
// 새 파일 추가 → 새 파일만 분석 ✅
// 기존 노트북 재열기 → 건너뛰기 ✅
```

**기술 구현**
- [notebookManager.js:17](src/utils/notebookManager.js#L17) - analyzedSourceIds 필드 추가
- [notebookManager.js:214-216](src/utils/notebookManager.js#L214-L216) - updateNotebookAnalyzedSources 함수
- [App.jsx:36](src/App.jsx#L36) - analyzedSourceIds 상태 관리
- [App.jsx:163-171](src/App.jsx#L163-L171) - 기존 메시지 존재 시 자동 표시
- [App.jsx:328-339](src/App.jsx#L328-L339) - handleAnalyzedSourcesUpdate 콜백
- [ChatInterface.jsx:401-413](src/components/ChatInterface.jsx#L401-L413) - 분석 여부 확인 로직
- [ChatInterface.jsx:508-513](src/components/ChatInterface.jsx#L508-L513) - analyzedSourceIds 업데이트

---

### 🐛 2026-01-07: 다중 파일 인용 시스템 완전 수정 + UI/UX 개선

#### 🔧 다중 파일 인용 버그 수정
- [x] **문제**: 2개 이상 파일 선택 시 모든 인용 배지가 첫 번째 파일로만 연결됨
- [x] **해결**: 누적 페이지 번호 시스템 구현
  - 파일 1 (30페이지): 전역 페이지 1-30
  - 파일 2 (20페이지): 전역 페이지 31-50
- [x] **페이지 매핑 로직**: 전역 페이지 번호 → (대상 파일, 로컬 페이지 번호) 자동 변환
- [x] **findFileByPageNumber 헬퍼**: 페이지 번호로 정확한 소스 파일 찾기
- [x] **정확한 파일 열기**: 인용 클릭 시 해당 파일의 정확한 페이지로 이동

**기술 구현**:
- [ChatInterface.jsx:547-564](src/components/ChatInterface.jsx#L547-L564) - allSourcesData 생성 (페이지 범위 계산)
- [ChatInterface.jsx:225-263](src/components/ChatInterface.jsx#L225-L263) - findFileByPageNumber 헬퍼 함수
- [App.jsx:146-174](src/App.jsx#L146-L174) - handlePageClick 수정 (파일 찾기 + 로컬 페이지 변환)
- [App.jsx:274](src/App.jsx#L274) - DataPreview에 targetFile 전달

#### 🎨 UI/UX 개선
- [x] **소스 패널 너비 확대**: 15% → 20% (파일명 가독성 향상)
- [x] **NotebookLM 스타일 폰트**: 11.5px, line-height 1.65, 회색 텍스트
- [x] **자동 확장 textarea**: 입력 시 자동 높이 조절 (최소 40px, 최대 200px)
- [x] **메시지 복사 버튼**: AI 응답에 Copy 아이콘 추가 (2초간 체크 표시)
- [x] **동적 레이아웃**: 설정 패널 열림/닫힘에 따라 채팅창 너비 자동 조절 (80% ↔ 45%)

**사용 예시**:
```
1. PDF(30페이지) + DOCX(20페이지) 업로드
2. AI 응답: "PDF는 [5]에서, DOCX는 [35]에서 확인 가능"
3. [5] 클릭 → PDF 파일의 5페이지 열림
4. [35] 클릭 → DOCX 파일의 5페이지 열림 (전역 35 - 30 = 로컬 5)
```

---

### 📁 2026-01-05: Word/Excel 파일 완전 지원 + 파일 타입별 아이콘

#### 📄 Word 파일 지원 (.docx, .doc)
- [x] **mammoth.js 통합**: Word 파일에서 텍스트 완전 추출
- [x] **자동 페이지 분할**: 500단어당 1페이지로 자동 분할
- [x] **RAG 분석 지원**: AI가 Word 문서 내용 분석 및 질의응답

#### 📊 Excel 파일 지원 (.xlsx, .xls)
- [x] **xlsx 라이브러리 통합**: Excel 데이터 완전 추출
- [x] **시트별 페이지 처리**: 각 시트를 별도 페이지로 취급
- [x] **표 형식 텍스트 변환**: 셀 데이터를 "셀1 | 셀2" 형식으로 변환
- [x] **RAG 분석 지원**: AI가 Excel 데이터 분석 및 질의응답

#### 🎨 파일 타입별 아이콘 시스템
- [x] **PDF**: 빨강 배경 + FileText 아이콘
- [x] **Word**: 파랑 배경 + FileText 아이콘
- [x] **Excel**: 초록 배경 + FileSpreadsheet 아이콘
- [x] **TXT**: 회색 배경 + File 아이콘
- [x] **JSON**: 보라 배경 + File 아이콘
- [x] **웹**: 파랑 배경 + Globe 아이콘

#### ⚠️ 페이지 클릭 제한
- [x] **PDF 전용 페이지 이동**: PDF 파일만 인용 배지 클릭 시 페이지 이동 가능
- [x] **안내 메시지 표시**: Word/Excel/TXT/JSON 파일은 클릭 시 안내 메시지 표시
- [x] **파일 타입별 메시지**: 각 파일 형식에 맞는 안내 메시지 제공

---

### ⚙️ 2026-01-05: AI 지침 설정 UI/UX 개선 + 시스템 프롬프트 오버라이드

#### 🎛️ AI 행동 지침 설정 시스템 (NEW!)
- [x] **사용자 정의 AI 지침**: 사용자가 원하는 대로 AI의 역할과 응답 스타일 설정 가능
- [x] **실시간 적용**: "적용" 버튼 클릭 시 모든 AI 응답에 즉시 반영
- [x] **시스템 프롬프트 오버라이드**: 사용자 지침이 기본 프롬프트보다 우선 적용
- [x] **일상 대화 모드에서도 적용**: 문서 없이 대화할 때도 사용자 지침 유지

#### 💜 UI/UX 개선
- [x] **"사용자 정의 지침" 토글 버튼**: Edit2 아이콘으로 텍스트 영역 열기/닫기
- [x] **프리셋 자동 확장**: 프리셋이나 추천 페르소나 선택 시 텍스트 영역 자동 열림
- [x] **활성 상태 시각적 피드백**: 보라색 배경으로 현재 활성화된 지침 표시
- [x] **"서비스 운영자" 프리셋**: 범용 서비스 운영자 프롬프트로 개선

**사용 예시**:
```
1. "사용자 정의 지침" 버튼 클릭
2. 텍스트 입력: "모든 답변을 반말로 해줘"
3. "적용" 버튼 클릭
4. AI가 반말로 답변 시작
```

**구현 위치**:
- [SystemPromptPanel.jsx](src/components/SystemPromptPanel.jsx) - UI 및 토글 로직
- [ChatInterface.jsx](src/components/ChatInterface.jsx) - systemPromptOverrides props
- [aiService.js](src/services/aiService.js) - 프롬프트 오버라이드 로직

---

### 🎯 2026-01-05: 보라색 추론 배지 클릭 활성화 + 대화 기록 초기화

#### 💜 보라색 추론 배지 클릭 이벤트 활성화
- [x] **클릭 가능한 추론 배지**: `[문서 맥락 기반 추론]` 같은 보라색 배지를 클릭할 수 있음
- [x] **상세 정보 표시**: 클릭 시 알림창으로 추론 내용 및 설명 제공
- [x] **호버 효과**: 배경색/텍스트 색상 변화, 클릭 애니메이션
- [x] **`<span>` → `<button>` 변환**: 접근성 향상

#### 🧹 대화 기록 자동 복원/저장 비활성화
- [x] **깨끗한 초기 화면**: 앱 시작 시 빈 메시지 배열로 시작
- [x] **localStorage 자동 복원 제거**: 이전 대화 기록이 자동으로 불러와지지 않음
- [x] **세션 기반 대화**: 브라우저 새로고침 시 대화 초기화
- [x] **대화 기록 유지**: 파일 추가/제거 시에도 기존 대화는 유지

---

### 🎯 2026-01-05: 대괄호 없는 페이지 패턴 자동 감지

#### 📌 자연어 페이지 인용 자동 감지
- [x] **자연어 패턴 지원**: "페이지 15", "15-18", "15 17 22" 자동 감지
- [x] **스마트 패턴 처리**: 페이지 접두사, 범위, 연속 숫자 패턴 인식
- [x] **기존 패턴 호환**: `[5]`, `[5-8]`, `[5, 10]` 완전 호환
- [x] **React Fragment 최적화**: ReactMarkdown과 완벽 호환

**사용 예시**:
```
AI 응답: "이 내용은 페이지 15에서 확인할 수 있습니다."
→ "이 내용은 [배지:15]에서 확인할 수 있습니다." (클릭 가능)
```

## 주요 특징

### 엄격한 RAG 시스템
- **문서 기반 답변**: 업로드한 문서 내용만 사용
- **할루시네이션 방지**: 문서에 없는 내용은 답변하지 않음
- **언어 자동 감지**: 한글/영어 입력 자동 인식
- **출처 표시**: 모든 답변에 파일명 및 페이지 번호 표시

### PDF 처리
- **실제 텍스트 추출**: PDF.js로 텍스트 추출
- **페이지별 렌더링**: 모든 페이지를 고품질 이미지로 변환
- **인용 연결**: 배지 클릭 시 해당 페이지로 자동 이동

### 사용자 경험
- **자동 분석**: 파일 선택 시 즉시 요약 생성
- **추천 질문**: 문서 기반 질문 3개 자동 생성
- **깨끗한 UI**: 불필요한 대화 기록 자동 제거
- **반응형 레이아웃**: NotebookLM 스타일 3단 구조

## 배포

### Vercel 배포
```bash
vercel --prod
```

**프로덕션 URL**: https://notebooklm-dashboard.vercel.app

## 라이선스

MIT
