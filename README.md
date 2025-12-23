# NotebookLM 스타일 문서 기반 분석 도구

엄격한 RAG(Retrieval-Augmented Generation) 시스템을 적용한 NotebookLM 스타일의 문서 분석 및 대화형 대시보드입니다.

## 🎯 핵심 기능

### 1. 엄격한 파일 기반 대화 시스템
- **선택된 파일에만 기반한 답변**: 업로드한 문서의 내용에서만 답변을 생성
- **할루시네이션 방지**: 문서에 없는 내용은 절대 답변하지 않음
- **명확한 출처 표시**: 모든 답변에 참조 문서와 매칭된 키워드 표시

### 2. 다국어 지원 (한국어/English)
- UI 전체 다국어 지원 (한/영 토글)
- 사용자 입력 언어 자동 감지
- 감지된 언어로 자동 응답

### 3. 실시간 파일 처리
- **지원 파일 형식**: PDF, Word, Excel, TXT, JSON
- 업로드된 파일을 구조화된 JSON으로 자동 파싱
- 실시간 데이터 프리뷰 (라이트 테마 JSON 뷰어)
- **복사 기능**: 클립보드에 JSON 데이터 복사

### 4. NotebookLM 스타일 소스 관리

- **체크박스 기반 다중 선택**: 여러 소스 동시 선택 가능
- **소스 추가 모달**: 파일 업로드 또는 웹 검색 (준비 중)
- **전체 선택/해제**: 모든 소스 일괄 관리
- 선택된 소스 시각적 강조 표시
- 채팅 컨텍스트가 선택된 소스로 즉시 고정

## UI 레이아웃 (50:50 비율)

### 📁 소스 패널 (좌측 상단 - 320px)

- NotebookLM 스타일 "+ 소스 추가" 버튼
- 체크박스 기반 소스 선택 시스템
- 모두 선택/선택 해제 기능
- 파일 메타데이터 표시 (이름, 업로드 시간)
- 검색 바 (웹 검색 기능 준비 중)

### 📊 JSON 데이터 뷰어 (좌측 하단 - 확장)

- **라이트 테마** JSON 트리 뷰어
- **복사 버튼**: 클립보드에 JSON 데이터 복사
- 확장/축소 가능한 JSON 구조
- 타입별 색상 구분
  - 문자열: 녹색 (text-green-700)
  - 숫자: 파란색 (text-blue-600)
  - 키: 빨간색 (text-red-600)
  - Boolean/null: 보라색 (text-purple-600)
  - 배열 인덱스: 주황색 (text-orange-600)
- 그림자 및 테두리 스타일 강화
- 긴 문자열 축약 및 "더보기" 기능

### 💬 채팅 인터페이스 (오른쪽 50%)

- 선택된 소스 표시 (파란색 태그)
- 메신저 스타일 대화형 UI
- 엄격한 RAG 기반 응답 생성
- 출처 및 매칭된 키워드 표시
- 타이핑 인디케이터
- 문서 없음 경고 메시지
- Enter/Shift+Enter 키보드 단축키

## 기술 스택

- **React 18** - UI 프레임워크
- **Vite** - 빌드 도구 및 개발 서버
- **Tailwind CSS** - 유틸리티 기반 스타일링
- **Lucide React** - 아이콘 라이브러리
- **Context API** - 다국어 상태 관리

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
│   │   ├── SourcePanel.jsx      # NotebookLM 스타일 소스 관리
│   │   ├── DataPreview.jsx      # JSON 뷰어 (복사 기능 포함)
│   │   └── ChatInterface.jsx    # 채팅 인터페이스
│   ├── contexts/
│   │   └── LanguageContext.jsx  # 다국어 지원 Context
│   ├── locales/
│   │   └── translations.js      # 한국어/영어 번역
│   ├── services/
│   │   └── aiService.js         # 엄격한 RAG 로직
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

- 다중 소스 컨텍스트 관리
- 선택된 소스 태그 표시
- 엄격한 RAG 기반 응답
- 출처 및 키워드 매칭 표시
- 문서 없음 경고 시스템
- 타이핑 인디케이터
- 자동 스크롤
- 다국어 메시지 지원

### LanguageContext

- 한국어/영어 전환
- 번역 함수 제공 (t())
- 전역 언어 상태 관리

## 핵심 기능 구현

### 엄격한 RAG 시스템 (aiService.js)

- **키워드 기반 매칭**: 질문에서 추출한 키워드가 문서에 있는지 검증
- **할루시네이션 방지**: 키워드가 없으면 "문서에서 찾을 수 없음" 응답
- **언어 자동 감지**: 한글 정규식으로 입력 언어 감지
- **출처 표시**: 모든 답변에 파일명과 매칭된 키워드 표시

### 파일 파싱 (fileParser.js)

- TXT 파일: 전체 텍스트 읽기
- JSON 파일: JSON 파싱
- PDF/Word/Excel: 시뮬레이션 데이터 (향후 라이브러리 연동 예정)
- 파일 크기 포맷팅 유틸리티

### 상태 관리

- 소스 목록 및 선택 상태 (sources, selectedSourceIds)
- 채팅 메시지 히스토리
- JSON 뷰어 확장/축소 상태
- 복사 버튼 피드백 상태
- 다국어 설정

## 향후 개선 사항

- [ ] PDF/Word/Excel 실제 파싱 라이브러리 연동
  - pdf.js, mammoth.js, xlsx 등
- [ ] AI API 연동 (OpenAI, Claude API)
  - 현재는 시뮬레이션 응답
- [ ] 웹 검색 기능 구현
  - 소스 패널의 "웹 검색" 활성화
- [ ] 다중 소스 동시 참조 분석
  - 현재는 첫 번째 선택 소스만 사용
- [ ] 문서 내 검색 및 하이라이팅
- [ ] 대화 내역 저장/불러오기 (로컬 스토리지)
- [ ] 소스 삭제 기능
- [ ] 반응형 디자인 (모바일 지원)
- [ ] JSON 뷰어 다크모드 토글

## 라이선스

MIT
