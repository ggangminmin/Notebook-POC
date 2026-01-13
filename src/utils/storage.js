// Supabase Storage - IndexedDB 대체
// PostgreSQL 기반 클라우드 데이터베이스 (무제한 용량, 멀티 디바이스 지원)

import { supabase } from './supabaseClient';

const BUCKET_NAME = 'notebook-files'; // Supabase Storage 버킷 이름

// 🔥 데이터 정제: 저장 전 무거운 데이터 제거
const sanitizeNotebookForStorage = (notebook) => {
  console.log('[Sanitize] 저장 전 데이터 정제 시작:', notebook.id);

  // sources 배열에서 썸네일 및 Base64 이미지 제거
  const sanitizedSources = (notebook.sources || []).map(source => {
    const sanitized = { ...source };

    // parsedData 내의 무거운 데이터 제거
    if (sanitized.parsedData) {
      sanitized.parsedData = {
        ...sanitized.parsedData,
        // pageTexts에서 thumbnail 제거
        pageTexts: (sanitized.parsedData.pageTexts || []).map(page => ({
          ...page,
          thumbnail: null // Base64 이미지 제거
        })),
        // pageImages 전체 제거
        pageImages: []
      };
    }

    return sanitized;
  });

  const sanitizedNotebook = {
    ...notebook,
    sources: sanitizedSources
  };

  // 데이터 크기 계산 (대략적)
  const dataSize = JSON.stringify(sanitizedNotebook).length;
  const dataSizeMB = (dataSize / (1024 * 1024)).toFixed(2);
  console.log('[Sanitize] 정제 후 데이터 크기:', dataSizeMB, 'MB');

  return sanitizedNotebook;
};

// 모든 노트북 가져오기
export const getAllNotebooks = async () => {
  try {
    const { data, error } = await supabase
      .from('notebooks')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Supabase] 노트북 로드 실패:', error);
      return [];
    }

    console.log('[Supabase] 노트북 로드:', data.length, '개');

    // 각 노트북의 메시지와 소스 정보도 함께 로드
    const notebooksWithDetails = await Promise.all(
      data.map(async (notebook) => {
        const messages = await getNotebookMessages(notebook.id);
        const sources = await getNotebookSources(notebook.id);
        return {
          id: notebook.id,
          title: notebook.title,
          emoji: notebook.emoji,
          createdAt: notebook.created_at,
          updatedAt: notebook.updated_at,
          selectedModel: notebook.selected_model,
          systemPromptOverrides: Array.isArray(notebook.system_prompt_overrides)
            ? notebook.system_prompt_overrides
            : [],
          analyzedSourceIds: notebook.analyzed_source_ids || [],
          messages,
          sources
        };
      })
    );

    return notebooksWithDetails;
  } catch (error) {
    console.error('[Supabase] 노트북 로드 실패:', error);
    return [];
  }
};

// ID로 노트북 가져오기
export const getNotebookById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('notebooks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Supabase] 노트북 조회 실패:', error);
      return null;
    }

    // 메시지와 소스 정보도 함께 로드
    const messages = await getNotebookMessages(id);
    const sources = await getNotebookSources(id);

    return {
      id: data.id,
      title: data.title,
      emoji: data.emoji,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      selectedModel: data.selected_model,
      systemPromptOverrides: Array.isArray(data.system_prompt_overrides)
        ? data.system_prompt_overrides
        : [],
      analyzedSourceIds: data.analyzed_source_ids || [],
      messages,
      sources
    };
  } catch (error) {
    console.error('[Supabase] 노트북 조회 실패:', error);
    return null;
  }
};

// 노트북 저장/업데이트
export const saveNotebook = async (notebook) => {
  try {
    // 🔥 저장 전 데이터 정제 (썸네일 제거)
    const sanitizedNotebook = sanitizeNotebookForStorage(notebook);

    // 노트북 기본 정보 저장
    const notebookData = {
      id: sanitizedNotebook.id,
      title: sanitizedNotebook.title || 'Untitled Notebook',
      emoji: sanitizedNotebook.emoji || '📝',
      created_at: sanitizedNotebook.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      selected_model: sanitizedNotebook.selectedModel || 'gpt-5.1-instant',
      system_prompt_overrides: Array.isArray(sanitizedNotebook.systemPromptOverrides)
        ? sanitizedNotebook.systemPromptOverrides
        : [],
      analyzed_source_ids: sanitizedNotebook.analyzedSourceIds || []
    };

    console.log('[Supabase] 저장할 AI 지침:', notebookData.system_prompt_overrides);

    const { error: notebookError } = await supabase
      .from('notebooks')
      .upsert(notebookData, { onConflict: 'id' });

    if (notebookError) {
      console.error('[Supabase] 노트북 저장 실패:', notebookError);
      throw notebookError;
    }

    // 메시지 저장
    if (sanitizedNotebook.messages && sanitizedNotebook.messages.length > 0) {
      await saveNotebookMessages(sanitizedNotebook.id, sanitizedNotebook.messages);
    }

    // 소스 저장
    if (sanitizedNotebook.sources && sanitizedNotebook.sources.length > 0) {
      await saveNotebookSources(sanitizedNotebook.id, sanitizedNotebook.sources);
    }

    console.log('[Supabase] ✅ 노트북 저장 성공:', sanitizedNotebook.id);
    console.log('[Supabase] 저장된 소스 개수:', sanitizedNotebook.sources?.length || 0);

    return sanitizedNotebook;
  } catch (error) {
    console.error('[Supabase] ❌ 노트북 저장 실패:', error);
    throw error;
  }
};

// 노트북 메시지 가져오기
export const getNotebookMessages = async (notebookId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('[Supabase] 메시지 로드 실패:', error);
      return [];
    }

    console.log('[Supabase] 메시지 로드 성공:', data.length, '개');
    return data.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }));
  } catch (error) {
    console.error('[Supabase] 메시지 로드 실패:', error);
    return [];
  }
};

// 노트북 메시지 저장
export const saveNotebookMessages = async (notebookId, messages) => {
  try {
    // 기존 메시지 삭제
    await supabase
      .from('messages')
      .delete()
      .eq('notebook_id', notebookId);

    // 메시지가 없으면 조기 리턴
    if (!messages || messages.length === 0) {
      console.log('[Supabase] 저장할 메시지 없음');
      return;
    }

    // 새 메시지 삽입 (role이 없는 메시지 필터링)
    const messagesToInsert = messages
      .filter(msg => msg.role && msg.content) // role과 content가 있는 메시지만
      .map(msg => ({
        notebook_id: notebookId,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString()
      }));

    if (messagesToInsert.length === 0) {
      console.log('[Supabase] 유효한 메시지 없음');
      return;
    }

    const { error } = await supabase
      .from('messages')
      .insert(messagesToInsert);

    if (error) {
      console.error('[Supabase] 메시지 저장 실패:', error);
      throw error;
    }

    console.log('[Supabase] 메시지 저장 성공:', messagesToInsert.length, '개');
  } catch (error) {
    console.error('[Supabase] 메시지 저장 실패:', error);
  }
};

// 노트북 소스 가져오기
export const getNotebookSources = async (notebookId) => {
  try {
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .eq('notebook_id', notebookId)
      .order('uploaded_at', { ascending: true });

    if (error) {
      console.error('[Supabase] 소스 로드 실패:', error);
      return [];
    }

    // 파일 복원
    const sourcesWithFiles = await Promise.all(
      data.map(async (source) => {
        let file = null;

        // Supabase Storage에서 파일 다운로드
        if (source.file_path) {
          const { data: fileData, error: fileError } = await supabase
            .storage
            .from(BUCKET_NAME)
            .download(source.file_path);

          if (!fileError && fileData) {
            // Blob을 File 객체로 변환
            file = new File([fileData], source.name, { type: source.type });
          }
        }

        return {
          id: source.id,
          name: source.name,
          type: source.type,
          size: source.size,
          file: file,
          fileBuffer: null, // Supabase에서는 fileBuffer 불필요
          fileMetadata: {
            name: source.name,
            type: source.type,
            size: source.size
          },
          parsedData: source.page_texts ? {
            fileType: source.file_type || 'pdf',
            fileName: source.file_name || source.name,
            fileSize: source.file_size || source.size,
            extractedText: source.extracted_text || '',
            pageTexts: source.page_texts,
            numPages: source.page_count || 0,
            pageCount: source.page_count || 0,
            pageImages: [] // 썸네일은 저장하지 않음
          } : null
        };
      })
    );

    return sourcesWithFiles;
  } catch (error) {
    console.error('[Supabase] 소스 로드 실패:', error);
    return [];
  }
};

// 노트북 소스 저장
export const saveNotebookSources = async (notebookId, sources) => {
  try {
    // 소스가 없으면 조기 리턴
    if (!sources || sources.length === 0) {
      console.log('[Supabase] 저장할 소스 없음');
      return;
    }

    // 🔥 데이터 검증: ID와 notebook_id가 있는지 확인
    const validSources = sources.filter(source => {
      if (!source.id || !source.name || !source.type) {
        console.warn('[Supabase] 잘못된 소스 데이터 건너뜀:', source);
        return false;
      }
      return true;
    });

    if (validSources.length === 0) {
      console.log('[Supabase] 유효한 소스 없음');
      return;
    }

    // 소스 메타데이터 배열 생성 (파일 업로드 전에 한꺼번에 준비)
    const sourcesData = [];

    for (const source of validSources) {
      let filePath = null;

      // 파일이 있으면 Supabase Storage에 업로드
      if (source.file || source.fileBuffer) {
        const fileName = `${notebookId}/${source.id}_${source.name}`;

        let fileToUpload;
        if (source.file) {
          fileToUpload = source.file;
        } else if (source.fileBuffer) {
          // ArrayBuffer를 Blob으로 변환
          fileToUpload = new Blob([source.fileBuffer], { type: source.type });
        }

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, fileToUpload, {
            contentType: source.type,
            upsert: true // 기존 파일 덮어쓰기
          });

        if (!uploadError) {
          filePath = fileName;
        } else {
          console.error('[Supabase] 파일 업로드 실패:', uploadError);
        }
      }

      // 소스 메타데이터 추가
      sourcesData.push({
        id: source.id,
        notebook_id: notebookId,
        name: source.name,
        type: source.type,
        size: source.size || 0,
        uploaded_at: new Date().toISOString(),
        file_path: filePath,
        page_count: source.parsedData?.numPages || source.parsedData?.pageCount || null,
        page_texts: source.parsedData?.pageTexts || null,
        file_type: source.parsedData?.fileType || null,
        file_name: source.parsedData?.fileName || source.name,
        file_size: source.parsedData?.fileSize || source.size || 0,
        extracted_text: source.parsedData?.extractedText || null
      });
    }

    // 🔥 upsert로 한꺼번에 저장 (ID 충돌 시 업데이트)
    const { error } = await supabase
      .from('sources')
      .upsert(sourcesData, { onConflict: 'id' });

    if (error) {
      console.error('[Supabase] 소스 저장 실패:', error);
      console.error('[Supabase] 실패한 소스 데이터:', sourcesData);
      throw error;
    }

    console.log('[Supabase] ✅ 소스 저장 성공:', sourcesData.length, '개');
  } catch (error) {
    console.error('[Supabase] ❌ 소스 저장 실패:', error);
  }
};

// 노트북 삭제
export const deleteNotebook = async (id) => {
  try {
    // 소스에 연결된 파일 삭제
    const { data: sources } = await supabase
      .from('sources')
      .select('file_path')
      .eq('notebook_id', id);

    if (sources && sources.length > 0) {
      const filePaths = sources.map(s => s.file_path).filter(Boolean);
      if (filePaths.length > 0) {
        await supabase.storage.from(BUCKET_NAME).remove(filePaths);
      }
    }

    // 노트북 삭제 (CASCADE로 messages, sources도 자동 삭제)
    const { error } = await supabase
      .from('notebooks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Supabase] 노트북 삭제 실패:', error);
      return false;
    }

    console.log('[Supabase] 노트북 삭제 성공:', id);
    return true;
  } catch (error) {
    console.error('[Supabase] 노트북 삭제 실패:', error);
    return false;
  }
};

// 전체 데이터베이스 초기화
export const clearAllNotebooks = async () => {
  try {
    // 모든 노트북 삭제 (CASCADE로 messages, sources도 자동 삭제)
    const { error } = await supabase
      .from('notebooks')
      .delete()
      .neq('id', ''); // 모든 레코드 삭제

    if (error) {
      console.error('[Supabase] 전체 데이터 삭제 실패:', error);
      return false;
    }

    // Storage의 모든 파일 삭제
    const { data: files } = await supabase.storage.from(BUCKET_NAME).list();
    if (files && files.length > 0) {
      const filePaths = files.map(f => f.name);
      await supabase.storage.from(BUCKET_NAME).remove(filePaths);
    }

    console.log('[Supabase] 전체 데이터 삭제 완료');
    return true;
  } catch (error) {
    console.error('[Supabase] 데이터 삭제 실패:', error);
    return false;
  }
};

// IndexedDB에서 Supabase로 마이그레이션
export const migrateFromIndexedDB = async () => {
  try {
    console.log('[Migration] IndexedDB → Supabase 마이그레이션 시작');

    // IndexedDB 열기
    const DB_NAME = 'NotebookLM_DB';
    const STORE_NAME = 'notebooks';

    const request = indexedDB.open(DB_NAME);

    return new Promise((resolve, reject) => {
      request.onsuccess = async (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          console.log('[Migration] IndexedDB에 데이터 없음');
          resolve(false);
          return;
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const getAllRequest = objectStore.getAll();

        getAllRequest.onsuccess = async () => {
          const notebooks = getAllRequest.result;

          if (!notebooks || notebooks.length === 0) {
            console.log('[Migration] IndexedDB에 노트북 없음');
            resolve(false);
            return;
          }

          console.log('[Migration] IndexedDB에서 발견:', notebooks.length, '개 노트북');

          // Supabase로 이동
          for (const notebook of notebooks) {
            try {
              await saveNotebook(notebook);
            } catch (error) {
              console.error('[Migration] 노트북 마이그레이션 실패:', notebook.id, error);
            }
          }

          console.log('[Migration] Supabase로 마이그레이션 완료');
          resolve(true);
        };

        getAllRequest.onerror = () => {
          console.error('[Migration] IndexedDB 읽기 실패');
          reject(getAllRequest.error);
        };
      };

      request.onerror = () => {
        console.error('[Migration] IndexedDB 연결 실패');
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[Migration] 마이그레이션 실패:', error);
    return false;
  }
};
