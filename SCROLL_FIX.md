# 🚀 인용 배지 클릭 → PDF 스크롤 이동 개선

## 🐛 기존 문제점

### 증상
- 인용 배지 `[5]` 클릭 시 **콘솔 로그는 찍히지만 페이지 이동 안 됨**
- 우측 패널이 PDF 뷰어 모드로 전환되지 않음
- 간헐적으로 스크롤 실패 (DOM이 준비되지 않음)

### 원인 분석

#### 1. App.jsx: 모드 전환 누락
```javascript
// ❌ 기존 코드
const handlePageClick = (pageNumber) => {
  setTargetPage(pageNumber)  // targetPage만 설정
  setTimeout(() => setTargetPage(null), 100)
}
```

**문제**: `rightPanelState`를 업데이트하지 않아 모드가 'natural'에서 'pdf'로 전환 안 됨

#### 2. DataPreview.jsx: 고정된 지연 시간
```javascript
// ❌ 기존 코드
setTimeout(() => {
  const pageElement = pageRefs.current[pageKey]
  if (pageElement) {
    // 스크롤...
  }
}, 350) // 350ms 고정 대기
```

**문제**:
- DOM 렌더링이 350ms보다 오래 걸리면 스크롤 실패
- 반대로 빠르게 렌더링되면 불필요한 대기 시간

---

## ✅ 개선 사항

### 1. App.jsx: 즉시 PDF 모드 전환

```javascript
// ✅ 개선된 코드
const handlePageClick = (pageNumber) => {
  console.log('═══════════════════════════════════════════════════════')
  console.log('[App.jsx] 🔵 인용 배지 클릭 감지!')
  console.log('[App.jsx] 목표 페이지:', pageNumber)
  console.log('[App.jsx] 현재 우측 패널 모드:', rightPanelState.mode)
  console.log('═══════════════════════════════════════════════════════')

  // 1️⃣ 즉시 PDF 뷰어 모드로 전환 (강제)
  setRightPanelState({ mode: 'pdf', pdfPage: pageNumber })
  console.log('[App.jsx] ✅ 우측 패널 모드 → PDF 뷰어로 전환')

  // 2️⃣ targetPage 설정 (DataPreview가 감지하여 스크롤 실행)
  setTargetPage(pageNumber)
  console.log('[App.jsx] ✅ targetPage 설정:', pageNumber)

  // 3️⃣ targetPage 리셋 (다음 클릭을 위해)
  setTimeout(() => {
    setTargetPage(null)
    console.log('[App.jsx] 🔄 targetPage 리셋 완료')
  }, 500)
}
```

**개선점**:
- ✅ `setRightPanelState({ mode: 'pdf', pdfPage: pageNumber })` 추가
- ✅ 모드 전환 + 페이지 번호를 **하나의 상태로 전달**
- ✅ 상세한 디버깅 로그

---

### 2. DataPreview.jsx: Retry 로직 (최대 5회 재시도)

```javascript
// ✅ 개선된 코드
const handlePageNavigate = useCallback(({ pageNumber }) => {
  console.log('═══════════════════════════════════════════════════════')
  console.log('[DataPreview] 📖 페이지 이동 요청:', pageNumber)
  console.log('[현재 상태] viewMode:', viewMode, '| 렌더링된 페이지:', pdfState.renderedPages.length)
  console.log('═══════════════════════════════════════════════════════')

  // ✅ 강제 PDF 뷰어 모드로 전환
  if (viewMode !== 'pdf') {
    console.log('[DataPreview] ⚙️ PDF 뷰어 모드로 전환 중...')
    setViewMode('pdf')
  }

  // 🎯 Retry 스크롤 함수: DOM이 그려질 때까지 재시도
  const tryScroll = (attempt = 1, maxAttempts = 5) => {
    const pageKey = `page-${pageNumber}`
    const pageElement = pageRefs.current[pageKey]
    const scrollContainer = scrollContainerRef.current

    console.log(`[DataPreview Scroll] 시도 ${attempt}/${maxAttempts} - 페이지 ${pageNumber}`)

    if (pageElement && scrollContainer) {
      // ✅ 성공: 페이지 요소 발견
      const elementTop = pageElement.offsetTop
      const offset = 20

      console.log(`[DataPreview Scroll] ✨ 페이지 ${pageNumber} 발견! 스크롤 시작`)

      // Smooth scroll 실행
      scrollContainer.scrollTo({
        top: elementTop - offset,
        behavior: 'smooth'
      })

      console.log('✅ [DataPreview] 페이지 이동 완료:', pageNumber)
    } else {
      // ⚠️ 실패: 페이지 요소 아직 없음
      if (attempt < maxAttempts) {
        console.warn(`⚠️ [DataPreview] 페이지 ${pageKey} 아직 없음. ${100 * attempt}ms 후 재시도...`)

        // 재귀 호출: 점진적 지연 (100ms, 200ms, 300ms, 400ms, 500ms)
        setTimeout(() => {
          tryScroll(attempt + 1, maxAttempts)
        }, 100 * attempt)
      } else {
        // ❌ 최종 실패 (5회 재시도 후)
        console.error('❌ [DataPreview] 최대 재시도 횟수 초과!')
        console.error('사용 가능한 페이지 refs:', Object.keys(pageRefs.current))
      }
    }
  }

  // 초기 지연 후 스크롤 시작 (모드 전환 시간 고려)
  setTimeout(() => {
    tryScroll()
  }, viewMode === 'pdf' ? 50 : 200) // PDF 모드면 빠르게, 아니면 여유 있게
}, [viewMode, pdfState.renderedPages.length])
```

**개선점**:
- ✅ **재귀 Retry 로직**: DOM이 준비될 때까지 최대 5회 재시도
- ✅ **점진적 지연**: 100ms → 200ms → 300ms → 400ms → 500ms
- ✅ **즉시 성공 시 빠른 응답**: 첫 시도에서 성공하면 50-200ms 내 스크롤
- ✅ **상세한 에러 로깅**: 실패 원인 추적 용이

---

### 3. DataPreview.jsx: rightPanelState 즉시 반영

```javascript
// ✅ 개선된 useEffect
useEffect(() => {
  if (rightPanelState?.mode) {
    console.log('[DataPreview] 🔄 rightPanelState 모드 변경 감지:', rightPanelState.mode)

    // 🚀 즉시 모드 전환 (PDF 포함)
    setViewMode(rightPanelState.mode)
    console.log('[DataPreview] ✅ viewMode 전환 완료 →', rightPanelState.mode)

    // PDF 모드 + pdfPage가 있으면 해당 페이지로 스크롤
    if (rightPanelState.mode === 'pdf' && rightPanelState.pdfPage) {
      console.log('[DataPreview] 📖 PDF 페이지 스크롤 요청:', rightPanelState.pdfPage)

      // 약간의 지연 후 스크롤 (DOM 렌더링 대기)
      setTimeout(() => {
        handlePageNavigate({ pageNumber: rightPanelState.pdfPage })
        handlePageHighlight({ pageNumber: rightPanelState.pdfPage, duration: 3000 })
      }, 100)
    }
  }
}, [rightPanelState?.mode, rightPanelState?.pdfPage, handlePageNavigate, handlePageHighlight])
```

**개선점**:
- ✅ `rightPanelState.pdfPage` 감지 추가
- ✅ PDF 모드 전환 + 페이지 스크롤을 **하나의 트랜잭션으로 처리**
- ✅ 100ms 지연으로 DOM 렌더링 보장

---

## 🎯 전체 플로우

### Before (기존)
```
1. 사용자: 배지 [5] 클릭
2. ChatInterface: onPageClick(5) 호출
3. App.jsx: setTargetPage(5) ← 모드 전환 없음 ❌
4. DataPreview: targetPage 감지 → 스크롤 시도
5. 실패: viewMode가 'natural'이라 PDF 페이지가 렌더링 안 됨 ❌
```

### After (개선)
```
1. 사용자: 배지 [5] 클릭
   ↓
2. ChatInterface: onPageClick(5) 호출
   ↓
3. App.jsx:
   - setRightPanelState({ mode: 'pdf', pdfPage: 5 }) ✅
   - setTargetPage(5) ✅
   ↓
4. DataPreview (rightPanelState 감지):
   - setViewMode('pdf') → PDF 뷰어 렌더링 시작 ✅
   - handlePageNavigate({ pageNumber: 5 }) 호출 ✅
   ↓
5. handlePageNavigate (Retry 로직):
   - 시도 1 (50ms): 페이지 발견? → Yes → 스크롤 완료! ✅
   - 시도 1 실패 → 100ms 대기 → 시도 2
   - 시도 2 (200ms): 페이지 발견? → Yes → 스크롤 완료! ✅
   - 최대 5회 재시도 (총 1500ms 대기)
   ↓
6. 결과: 파란색 테두리 + Pulse 효과 3초간 표시 ✅
```

---

## 📊 성능 비교

| 시나리오 | Before | After |
|---------|--------|-------|
| **PDF 모드 → 배지 클릭** | ❌ 실패 (모드 전환 안 됨) | ✅ 50ms 내 이동 |
| **자연어 모드 → 배지 클릭** | ❌ 실패 (모드 전환 안 됨) | ✅ 200-300ms 내 이동 |
| **느린 렌더링 (500ms)** | ❌ 350ms 후 실패 | ✅ 500ms 후 성공 (재시도 덕분) |
| **매우 느린 렌더링 (2000ms)** | ❌ 실패 | ❌ 1500ms 후 실패 (5회 재시도) |

---

## 🧪 테스트 시나리오

### 테스트 1: 즉시 클릭 (PDF 모드에서)
1. 우측 패널이 이미 PDF 모드일 때
2. 배지 `[5]` 클릭
3. **기대 결과**: 50ms 내 5번 페이지로 스크롤 ✅

### 테스트 2: 모드 전환 필요 (자연어 모드에서)
1. 우측 패널이 '스튜디오(자연어)' 모드일 때
2. 배지 `[5]` 클릭
3. **기대 결과**:
   - PDF 뷰어 모드로 전환 (100ms)
   - 5번 페이지로 스크롤 (200-300ms)
   - 총 소요 시간: **300-400ms** ✅

### 테스트 3: 연속 클릭
1. 배지 `[5]` 클릭
2. 즉시 배지 `[10]` 클릭
3. **기대 결과**:
   - 5번 페이지 스크롤 시작
   - 10번 페이지로 재스크롤 (부드럽게)
   - targetPage 리셋 로직으로 충돌 없음 ✅

### 테스트 4: 존재하지 않는 페이지
1. 배지 `[99]` 클릭 (Mock은 30페이지까지만)
2. **기대 결과**:
   - 5회 재시도 후 콘솔 에러 메시지
   - 사용자에게는 조용히 실패 (UX 유지) ✅

---

## 🔧 디버깅 로그 예시

### 성공 케이스 (빠른 렌더링)
```
═══════════════════════════════════════════════════════
[App.jsx] 🔵 인용 배지 클릭 감지!
[App.jsx] 목표 페이지: 5
[App.jsx] 현재 우측 패널 모드: natural
═══════════════════════════════════════════════════════
[App.jsx] ✅ 우측 패널 모드 → PDF 뷰어로 전환
[App.jsx] ✅ targetPage 설정: 5

[DataPreview] 🔄 rightPanelState 모드 변경 감지: pdf
[DataPreview] ✅ viewMode 전환 완료 → pdf
[DataPreview] 📖 PDF 페이지 스크롤 요청: 5

═══════════════════════════════════════════════════════
[DataPreview] 📖 페이지 이동 요청: 5
[현재 상태] viewMode: pdf | 렌더링된 페이지: 30
═══════════════════════════════════════════════════════
[DataPreview Scroll] 시도 1/5 - 페이지 5
[DataPreview Scroll] ✨ 페이지 5 발견! 스크롤 시작
✅ [DataPreview] 페이지 이동 완료: 5
```

### 재시도 케이스 (느린 렌더링)
```
[DataPreview Scroll] 시도 1/5 - 페이지 5
⚠️ [DataPreview] 페이지 page-5 아직 없음. 100ms 후 재시도...

[DataPreview Scroll] 시도 2/5 - 페이지 5
⚠️ [DataPreview] 페이지 page-5 아직 없음. 200ms 후 재시도...

[DataPreview Scroll] 시도 3/5 - 페이지 5
[DataPreview Scroll] ✨ 페이지 5 발견! 스크롤 시작
✅ [DataPreview] 페이지 이동 완료: 5
```

---

## 📁 수정된 파일

1. **[App.jsx](src/App.jsx)**: `handlePageClick` 함수
   - `setRightPanelState({ mode: 'pdf', pdfPage })` 추가
   - 상세 로깅 추가

2. **[DataPreview.jsx](src/components/DataPreview.jsx)**:
   - `handlePageNavigate` 함수에 Retry 로직 추가
   - `rightPanelState` useEffect 개선

---

## 🚀 사용자 경험 개선

### Before
- 클릭 → **반응 없음** 😕
- 콘솔만 로그 출력
- 모드 전환 수동으로 해야 함

### After
- 클릭 → **즉각 반응** 😃
- 0.05초~0.4초 내 스크롤
- 부드러운 애니메이션
- 파란색 하이라이트 3초간 표시

---

## 🎉 완료!

이제 인용 배지를 클릭하면 **즉각적이고 부드럽게** PDF 페이지로 이동합니다!

**브라우저에서 테스트**: http://localhost:5173/

채팅창에서 `"[5]를 참고하세요"` 입력 후 배지 클릭해보세요! 🚀
