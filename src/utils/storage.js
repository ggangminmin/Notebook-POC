// IndexedDB 래퍼 - localStorage 대체 (대용량 데이터 저장)
// 브라우저별 용량: Chrome/Edge ~수백MB, Firefox ~무제한, Safari ~1GB

const DB_NAME = 'NotebookLM_DB'
const DB_VERSION = 1
const STORE_NAME = 'notebooks'

// IndexedDB 연결 및 초기화
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[IndexedDB] 연결 실패:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      console.log('[IndexedDB] 연결 성공')
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      console.log('[IndexedDB] 데이터베이스 업그레이드')
      const db = event.target.result

      // Object Store 생성 (테이블과 유사)
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        objectStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        console.log('[IndexedDB] Object Store 생성 완료')
      }
    }
  })
}

// 모든 노트북 가져오기
export const getAllNotebooks = async () => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('[IndexedDB] 노트북 로드:', request.result.length, '개')
        resolve(request.result)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('[IndexedDB] 노트북 로드 실패:', error)
    return []
  }
}

// ID로 노트북 가져오기
export const getNotebookById = async (id) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.get(id)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('[IndexedDB] 노트북 조회 실패:', error)
    return null
  }
}

// 노트북 저장/업데이트
export const saveNotebook = async (notebook) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.put(notebook)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('[IndexedDB] 노트북 저장 성공:', notebook.id)
        resolve(notebook)
      }
      request.onerror = () => {
        console.error('[IndexedDB] 노트북 저장 실패:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('[IndexedDB] 노트북 저장 실패:', error)
    throw error
  }
}

// 노트북 삭제
export const deleteNotebook = async (id) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.delete(id)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('[IndexedDB] 노트북 삭제 성공:', id)
        resolve(true)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('[IndexedDB] 노트북 삭제 실패:', error)
    return false
  }
}

// 전체 데이터베이스 초기화
export const clearAllNotebooks = async () => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.clear()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('[IndexedDB] 전체 데이터 삭제 완료')
        resolve(true)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('[IndexedDB] 데이터 삭제 실패:', error)
    return false
  }
}

// localStorage에서 IndexedDB로 마이그레이션
export const migrateFromLocalStorage = async () => {
  try {
    const STORAGE_KEY = 'notebooklm_notebooks'
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      console.log('[Migration] localStorage에 데이터 없음')
      return false
    }

    const notebooks = JSON.parse(stored)
    console.log('[Migration] localStorage에서 발견:', notebooks.length, '개 노트북')

    // IndexedDB로 이동
    for (const notebook of notebooks) {
      await saveNotebook(notebook)
    }

    console.log('[Migration] IndexedDB로 마이그레이션 완료')

    // localStorage 백업 후 삭제
    localStorage.setItem(STORAGE_KEY + '_backup', stored)
    localStorage.removeItem(STORAGE_KEY)
    console.log('[Migration] localStorage 데이터 정리 완료 (백업: _backup)')

    return true
  } catch (error) {
    console.error('[Migration] 마이그레이션 실패:', error)
    return false
  }
}
