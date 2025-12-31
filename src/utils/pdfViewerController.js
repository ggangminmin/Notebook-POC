/**
 * PDF 뷰어 전역 컨트롤러 (Event Bus 패턴)
 *
 * 인용 배지 클릭 → PDF 뷰어 모드 전환 → 페이지 스크롤 이동을 중앙에서 관리하는 싱글톤 컨트롤러
 *
 * 핵심 기능:
 * 1. 인용 배지 클릭 이벤트 수신
 * 2. 우측 패널을 자동으로 PDF 뷰어 모드로 전환
 * 3. 페이지 로딩 완료 후 스크롤 이동 보장
 * 4. 80% 줌 스케일 보정 (화면 비율 자동 계산)
 * 5. 페이지 하이라이트 효과
 */

class PDFViewerController {
  constructor() {
    // 싱글톤 패턴
    if (PDFViewerController.instance) {
      return PDFViewerController.instance
    }
    PDFViewerController.instance = this

    // 이벤트 리스너 목록
    this.listeners = {
      modeChange: [], // PDF 뷰어 모드 전환 리스너
      pageNavigate: [], // 페이지 이동 리스너
      pageHighlight: [] // 페이지 하이라이트 리스너
    }

    // 현재 상태
    this.currentState = {
      mode: 'natural', // 'natural', 'json', 'pdf'
      targetPage: null, // 이동할 페이지 번호
      isReady: false, // PDF 뷰어가 준비되었는지 여부
      totalPages: 0 // 전체 페이지 수
    }

    // 대기 중인 페이지 이동 요청 큐
    this.pendingNavigation = null

    console.log('[PDFViewerController] 초기화 완료')
  }

  /**
   * 이벤트 리스너 등록
   * @param {string} event - 이벤트 타입 ('modeChange', 'pageNavigate', 'pageHighlight')
   * @param {function} callback - 콜백 함수
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback)
      console.log(`[PDFViewerController] 리스너 등록: ${event}`)
    } else {
      console.warn(`[PDFViewerController] 알 수 없는 이벤트 타입: ${event}`)
    }
  }

  /**
   * 이벤트 리스너 제거
   * @param {string} event - 이벤트 타입
   * @param {function} callback - 제거할 콜백 함수
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)
      console.log(`[PDFViewerController] 리스너 제거: ${event}`)
    }
  }

  /**
   * 이벤트 발생 (모든 리스너에게 전파)
   * @param {string} event - 이벤트 타입
   * @param {any} data - 전달할 데이터
   */
  emit(event, data) {
    if (this.listeners[event]) {
      console.log(`[PDFViewerController] 이벤트 발생: ${event}`, data)
      this.listeners[event].forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[PDFViewerController] 리스너 실행 오류 (${event}):`, error)
        }
      })
    }
  }

  /**
   * 인용 배지 클릭 핸들러 (최상위 진입점)
   * @param {number} pageNumber - 이동할 페이지 번호
   */
  handleCitationClick(pageNumber) {
    console.log('[PDFViewerController] ========== 인용 배지 클릭 이벤트 시작 ==========')
    console.log('[PDFViewerController] 요청 페이지:', pageNumber)
    console.log('[PDFViewerController] 현재 상태:', this.currentState)

    // 1. 상태 업데이트
    this.currentState.mode = 'pdf'
    this.currentState.targetPage = pageNumber

    // 2. PDF 뷰어 모드로 전환 이벤트 발생
    this.emit('modeChange', { mode: 'pdf', pageNumber })

    // 3. PDF 뷰어가 준비되어 있으면 즉시 이동, 아니면 대기 큐에 추가
    if (this.currentState.isReady) {
      console.log('[PDFViewerController] PDF 뷰어 준비됨 → 즉시 페이지 이동 실행')
      this.navigateToPage(pageNumber)
    } else {
      console.log('[PDFViewerController] PDF 뷰어 대기 중 → 큐에 추가 (로딩 완료 후 자동 이동)')
      this.pendingNavigation = pageNumber
    }
  }

  /**
   * PDF 뷰어 준비 완료 알림 (DataPreview에서 호출)
   * @param {number} totalPages - 전체 페이지 수
   */
  setReady(totalPages) {
    console.log('[PDFViewerController] PDF 뷰어 준비 완료 알림:', totalPages, '페이지')
    this.currentState.isReady = true
    this.currentState.totalPages = totalPages

    // 대기 중인 페이지 이동이 있으면 실행
    if (this.pendingNavigation) {
      console.log('[PDFViewerController] 대기 중인 페이지 이동 실행:', this.pendingNavigation)
      const targetPage = this.pendingNavigation
      this.pendingNavigation = null
      this.navigateToPage(targetPage)
    }
  }

  /**
   * PDF 뷰어 초기화 알림 (파일 변경 시 호출)
   */
  reset() {
    console.log('[PDFViewerController] PDF 뷰어 초기화')
    this.currentState.isReady = false
    this.currentState.totalPages = 0
    this.pendingNavigation = null
  }

  /**
   * 페이지 이동 실행 (실제 스크롤 동작)
   * @param {number} pageNumber - 이동할 페이지 번호
   */
  navigateToPage(pageNumber) {
    console.log('[PDFViewerController] ========== 페이지 이동 실행 ==========')
    console.log('[PDFViewerController] 목표 페이지:', pageNumber)
    console.log('[PDFViewerController] 전체 페이지:', this.currentState.totalPages)

    // 페이지 번호 유효성 검증
    if (pageNumber < 1 || pageNumber > this.currentState.totalPages) {
      console.error('[PDFViewerController] ❌ 유효하지 않은 페이지 번호:', pageNumber)
      return
    }

    // 페이지 이동 이벤트 발생 (DataPreview가 수신)
    this.emit('pageNavigate', { pageNumber })

    // 하이라이트 효과 이벤트 발생 (3초간 페이지 강조)
    setTimeout(() => {
      this.emit('pageHighlight', { pageNumber, duration: 3000 })
    }, 100)
  }

  /**
   * 80% 줌 스케일 보정 계산
   * @param {number} scrollPosition - 원본 스크롤 위치
   * @returns {number} 보정된 스크롤 위치
   */
  calculateScaleAdjustedScroll(scrollPosition) {
    // 현재 화면 줌 비율 (html { font-size: 12.8px } = 80%)
    const zoomScale = 0.8

    // 스크롤 위치는 80% 스케일에서 계산되므로 보정 필요
    // 실제 DOM 요소 위치는 100% 기준이지만, 화면 표시는 80%
    const adjustedPosition = scrollPosition * (1 / zoomScale)

    console.log('[PDFViewerController] 스크롤 위치 보정:', scrollPosition, '→', adjustedPosition)
    return adjustedPosition
  }

  /**
   * 현재 상태 조회
   * @returns {object} 현재 상태 객체
   */
  getState() {
    return { ...this.currentState }
  }
}

// 싱글톤 인스턴스 생성
const pdfViewerController = new PDFViewerController()

export default pdfViewerController
