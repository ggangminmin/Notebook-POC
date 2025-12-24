const translations = {
  ko: {
    app: {
      title: 'NotebookLM 대시보드',
      subtitle: '문서 기반 AI 분석 도구'
    },
    fileUpload: {
      title: '문서 업로드',
      dragDrop: '파일을 여기에 드래그하거나 클릭하여 선택하세요',
      supportedFormats: 'PDF, Word, Excel, TXT 파일 지원',
      uploadedFiles: '업로드된 파일',
      noFiles: '업로드된 파일이 없습니다',
      select: '선택',
      selected: '선택됨',
      delete: '삭제'
    },
    dataPreview: {
      title: '문서 데이터 (JSON)',
      subtitle: '선택된 파일의 구조화된 데이터',
      noFileSelected: '파일을 선택하면 데이터가 표시됩니다',
      lastUpdated: '마지막 업데이트',
      status: '상태'
    },
    chat: {
      title: '채팅 어시스턴트',
      subtitle: '업로드된 문서에 대해 질문하세요',
      currentContext: '현재 [{fileName}] 내용을 기반으로 대화 중입니다',
      noContext: '문서를 선택하여 대화를 시작하세요',
      placeholder: '문서에 대해 질문하세요...',
      send: '전송',
      typing: 'AI가 문서를 분석하는 중...',
      enterToSend: 'Enter: 전송, Shift+Enter: 줄바꿈',
      greeting: '안녕하세요! 문서를 업로드하고 선택하면 해당 문서의 내용을 기반으로 답변해드립니다.',
      noDocumentContext: '현재 선택된 문서가 없습니다. 좌측에서 문서를 선택해주세요.',
      notFoundInDocument: '죄송합니다. 선택하신 문서에서 관련 내용을 찾을 수 없습니다. 문서에 포함된 정보에 대해서만 답변드릴 수 있습니다.'
    },
    language: {
      switch: '언어 전환',
      korean: '한국어',
      english: 'English'
    },
    sources: {
      addSource: '소스 추가',
      searchPlaceholder: '웹에서 새 소스를 검색하세요',
      fastResearch: 'Fast Research',
      deepResearch: 'Deep Research',
      deepResearchTitle: 'Deep Research 사용해보기',
      deepResearchDesc: 'Deep Research를 사용해 심층 보고서를 확인하고 새로운 소스를 이용해 보세요.',
      web: '웹',
      allSources: '모든 소스',
      selectAll: '모두 선택',
      deselectAll: '선택 해제',
      noSources: '추가된 소스가 없습니다',
      addSourceHint: '위의 "+ 소스 추가" 버튼을 눌러 시작하세요',
      uploadFile: '파일 업로드',
      uploadFileDesc: 'PDF, Word, Excel, TXT, JSON',
      webSearch: '웹 검색',
      webSearchDesc: '웹에서 정보 검색 (준비 중)',
      selectedSources: '선택된 소스',
      webUrl: '웹 URL',
      webUrlLabel: '웹 페이지 URL 입력',
      addUrl: 'URL 추가',
      urlRequired: 'URL을 입력해주세요.',
      urlError: 'URL을 가져올 수 없습니다.',
      loading: '로딩 중...',
      urlHint: '웹 페이지의 메타데이터를 자동으로 추출합니다',
      supportedFormats: '지원 형식'
    }
  },
  en: {
    app: {
      title: 'NotebookLM Dashboard',
      subtitle: 'Document-based AI Analysis Tool'
    },
    fileUpload: {
      title: 'Document Upload',
      dragDrop: 'Drag and drop files here, or click to select',
      supportedFormats: 'Supports PDF, Word, Excel, TXT files',
      uploadedFiles: 'Uploaded Files',
      noFiles: 'No files uploaded',
      select: 'Select',
      selected: 'Selected',
      delete: 'Delete'
    },
    dataPreview: {
      title: 'Document Data (JSON)',
      subtitle: 'Structured data of selected file',
      noFileSelected: 'Select a file to view data',
      lastUpdated: 'Last Updated',
      status: 'Status'
    },
    chat: {
      title: 'Chat Assistant',
      subtitle: 'Ask questions about your uploaded documents',
      currentContext: 'Currently discussing based on [{fileName}]',
      noContext: 'Select a document to start conversation',
      placeholder: 'Ask about the document...',
      send: 'Send',
      typing: 'AI is analyzing the document...',
      enterToSend: 'Enter: Send, Shift+Enter: New line',
      greeting: 'Hello! Upload and select a document, and I will answer based on its content.',
      noDocumentContext: 'No document is currently selected. Please select a document from the left.',
      notFoundInDocument: 'Sorry, I could not find relevant information in the selected document. I can only answer based on the information contained in the document.'
    },
    language: {
      switch: 'Switch Language',
      korean: '한국어',
      english: 'English'
    },
    sources: {
      addSource: 'Add Source',
      searchPlaceholder: 'Search for new sources on the web',
      fastResearch: 'Fast Research',
      deepResearch: 'Deep Research',
      deepResearchTitle: 'Try Deep Research',
      deepResearchDesc: 'Use Deep Research to view in-depth reports and explore new sources.',
      web: 'Web',
      allSources: 'All Sources',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      noSources: 'No sources added',
      addSourceHint: 'Click the "+ Add Source" button above to get started',
      uploadFile: 'Upload Files',
      uploadFileDesc: 'PDF, Word, Excel, TXT, JSON',
      webSearch: 'Web Search',
      webSearchDesc: 'Search information on the web (Coming soon)',
      selectedSources: 'Selected Sources',
      webUrl: 'Web URL',
      webUrlLabel: 'Enter Web Page URL',
      addUrl: 'Add URL',
      urlRequired: 'Please enter a URL.',
      urlError: 'Failed to fetch URL.',
      loading: 'Loading...',
      urlHint: 'Automatically extracts metadata from the web page',
      supportedFormats: 'Supported Formats'
    }
  }
}

export default translations
