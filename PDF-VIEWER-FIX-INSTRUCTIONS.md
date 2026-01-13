# PDF 뷰어 문제 해결 가이드

## 문제 상황
- PDF 인용 배지를 클릭했을 때, PDF 뷰어가 나와야 하는데 텍스트 기반 뷰가 나옴
- 패널 제목이 "AI 행동 지침 설정"으로 잘못 표시됨

## 근본 원인
Supabase `sources` 테이블에 `file_type`, `file_name`, `file_size`, `extracted_text` 컬럼이 없어서, 파일 타입 정보가 저장/복원되지 않음.

- `parsedData.fileType`이 `null`이 되어 파일 타입 감지 실패
- `App.jsx:519`에서 `fileType !== 'pdf'` 조건이 잘못 판단됨
- 텍스트 뷰어 모드로 진입하게 됨

## 해결 방법

### 1단계: Supabase 데이터베이스 스키마 업데이트

**중요:** 아래 SQL을 Supabase Console에서 실행해야 합니다.

1. Supabase 대시보드 접속: https://unvbpxtairtkjqygxqhy.supabase.co
2. 왼쪽 메뉴에서 "SQL Editor" 선택
3. `supabase-migration-add-source-fields.sql` 파일 내용을 복사하여 실행:

```sql
-- Supabase Migration: Add missing fields to sources table

-- Add file_type column (PDF, Word, Excel, TXT, etc.)
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Add file_name column (original filename from parsedData)
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Add file_size column (file size in bytes)
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0;

-- Add extracted_text column (full text content for search/analysis)
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS extracted_text TEXT;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sources'
ORDER BY ordinal_position;
```

### 2단계: 코드 변경 사항 (이미 완료됨)

#### ✅ src/utils/storage.js
- **저장 시 (lines 374-379)**: `file_type`, `file_name`, `file_size`, `extracted_text` 필드 추가
- **로드 시 (lines 295-304)**: 전체 `parsedData` 객체 재구성 (fileType, fileName, fileSize, extractedText 포함)

#### ✅ src/components/DataPreview.jsx
- **패널 제목 수정 (lines 1094-1102)**: `text-preview` 모드에서 파일 이름 표시

### 3단계: 테스트 방법

1. SQL 마이그레이션 실행 후 브라우저 새로고침 (F5)
2. 새 노트북 생성
3. PDF 파일 업로드
4. 질문하여 인용 배지가 포함된 답변 받기
5. 인용 배지 클릭 시:
   - ✅ 우측 패널에 PDF 뷰어가 표시되어야 함
   - ✅ 패널 제목이 "PDF 뷰어"로 표시되어야 함
   - ✅ 해당 페이지로 자동 스크롤되어야 함

### 4단계: 기존 데이터 마이그레이션 (선택사항)

만약 이미 업로드한 파일들이 있다면, 해당 파일들을 다시 업로드해야 합니다:
1. 대시보드에서 노트북 열기
2. 기존 파일 삭제
3. 같은 파일 다시 업로드

이렇게 하면 새로운 스키마로 데이터가 저장됩니다.

## 기술 상세 정보

### parsedData 구조 (파일 파서에서 생성)
```javascript
{
  fileType: 'pdf' | 'word' | 'excel' | 'text',
  fileName: 'example.pdf',
  fileSize: 1024000,
  extractedText: '전체 텍스트 내용...',
  pageTexts: [{page: 1, text: '...', thumbnail: null}, ...],
  numPages: 10,
  pageCount: 10,
  pageImages: []
}
```

### Supabase 저장 필드 매핑
| parsedData 필드 | Supabase 컬럼 | 타입 |
|----------------|--------------|------|
| fileType | file_type | TEXT |
| fileName | file_name | TEXT |
| fileSize | file_size | INTEGER |
| extractedText | extracted_text | TEXT |
| pageTexts | page_texts | JSONB |
| numPages/pageCount | page_count | INTEGER |

### 파일 타입 감지 로직 (App.jsx:519)
```javascript
const fileType = targetFile?.parsedData?.fileType
if (fileType !== 'pdf') {
  // Word, Excel, TXT 등 → text-preview 모드
  setRightPanelState({ mode: 'text-preview', ... })
} else {
  // PDF → pdf 모드
  setRightPanelState({ mode: 'pdf', ... })
}
```

## 예상 결과

### 변경 전
- 인용 배지 클릭 → 텍스트 뷰어 표시
- 제목: "AI 행동 지침 설정"
- `fileType`이 undefined/null

### 변경 후
- 인용 배지 클릭 → PDF 뷰어 표시
- 제목: "PDF 뷰어"
- `fileType`이 'pdf'로 정상 복원
- 해당 페이지로 자동 스크롤

## 관련 파일
- ✅ `storage.js` (lines 295-304, 374-379) - 수정 완료
- ✅ `DataPreview.jsx` (lines 1094-1102) - 수정 완료
- 📋 `supabase-migration-add-source-fields.sql` - 실행 필요
- 📖 `App.jsx` (lines 519-526) - 참고용 (수정 불필요)

## 문의사항
질문이 있으시면 이슈를 남겨주세요!
