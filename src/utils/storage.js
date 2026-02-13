// Supabase Storage - 노트북 데이터 관리 최적화 및 보안 필터링 적용 최종 버전
import { supabase } from './supabaseClient';
import * as localDB from './idb';

const BUCKET_NAME = 'notebook-files';

// 마스터 계정 확인
const isMasterAccount = (email) => {
  const adminEmails = ['admin@test.com', 'demo-admin'];
  if (!email) return false;
  return adminEmails.includes(email) || email.startsWith('admin.master@');
};

// 데이터 정제 (무거운 필드 제거)
const sanitizeNotebookForStorage = (notebook) => {
  if (!notebook.sources) return notebook;
  const sanitizedSources = notebook.sources.map(s => {
    const sc = { ...s };
    if (sc.parsedData) {
      sc.parsedData = {
        ...sc.parsedData,
        pageTexts: (sc.parsedData.pageTexts || []).map(p => ({ ...p, thumbnail: null })),
        pageImages: []
      };
    }
    return sc;
  });
  return { ...notebook, sources: sanitizedSources };
};

// ALL 노트북 로드
export const getAllNotebooks = async (ownerId) => {
  try {
    const isMaster = isMasterAccount(ownerId);

    // 1. 서버 데이터와 백그라운드 동기화 수행
    const syncInternal = async () => {
      try {
        let query = supabase.from('notebooks').select('*');
        const userEmail = ownerId.includes('@') ? ownerId : `${ownerId}@gptko.co.kr`;
        const userDomain = userEmail.split('@')[1];

        if (!isMaster) {
          query = query.or(`ownerId.eq.${ownerId},sharingSettings->sharedWith.cs.{"${userEmail}"},sharingSettings->allDomainAccess.eq.true`);
        }

        const { data, error } = await query.order('updated_at', { ascending: false });
        if (!error && data) {
          const currentLocal = await localDB.localGetAllNotebooks(ownerId);
          const serverIds = new Set(data.map(nb => nb.id));
          for (const nb of currentLocal) {
            if (!serverIds.has(nb.id)) await localDB.localDeleteNotebook(nb.id);
          }
          for (const nb of data) {
            await localDB.localSaveNotebook({
              ...nb,
              createdAt: nb.created_at || nb.createdAt,
              updatedAt: nb.updated_at || nb.updatedAt,
              selectedModel: nb.selected_model || nb.selectedModel,
              systemPromptOverrides: nb.system_prompt_overrides || [],
              analyzed_source_ids: nb.analyzed_source_ids || [],
              ownerId: nb.ownerId || nb.metadata?.ownerId
            });
          }
        }
      } catch (e) { }
    };

    syncInternal();

    // 2. 로컬 데이터 반환 (UI 속도 우선)
    const localData = await localDB.localGetAllNotebooks(ownerId);
    return localData || [];
  } catch (error) {
    return [];
  }
};

// 단일 노트북 상세 로드 (개인 소유자 보호 로직 강화)
export const getNotebookById = async (id, ownerId) => {
  try {
    console.log(`[Storage] 📖 노트북 상세 조회 시작: ${id}, 사용자: ${ownerId}`);

    // 1. 서버에서 최신 데이터 조회 (서버 데이터 우선주의 정책 적용)
    const { data: serverData, error } = await supabase.from('notebooks').select('*').eq('id', id).maybeSingle();

    if (error || !serverData) {
      console.log('[Storage] 서버 데이터 조회 실패 또는 없음, 로컬 캐시 사용');
      return await localDB.localGetNotebookById(id, ownerId);
    }

    // 실제 소유자 식별
    const actualOwnerId = serverData.ownerId || serverData.metadata?.ownerId;
    const isOwner = actualOwnerId === ownerId || isMasterAccount(ownerId);

    // 2. 메시지 및 소스 로드 (서버 동기화)
    const [messages, sources] = await Promise.all([
      getNotebookMessages(id, ownerId, actualOwnerId),
      getNotebookSources(id)
    ]);

    const fullNotebook = {
      id: serverData.id,
      title: serverData.title,
      emoji: serverData.emoji,
      createdAt: serverData.created_at || serverData.createdAt,
      updatedAt: serverData.updated_at || serverData.updatedAt,
      selectedModel: serverData.selected_model || serverData.selectedModel,
      systemPromptOverrides: serverData.system_prompt_overrides || [],
      analyzedSourceIds: serverData.analyzed_source_ids || [],
      ownerId: actualOwnerId,
      sharingSettings: serverData.sharingSettings || {},
      chatPrompt: serverData.chatPrompt || serverData.metadata?.chatPrompt,
      summaryPrompt: serverData.summaryPrompt || serverData.metadata?.summaryPrompt,
      messages,
      sources
    };

    // 3. 🔥 서버의 필터링된 데이터로 로컬 캐시 강제 최신화 (순서 중요)
    await localDB.localSaveNotebook(fullNotebook);
    // 채팅 내역도 서버에서 받아온 최신(필터링된) 내역으로 로컬 저장소 덮어쓰기
    await localDB.localSaveChatHistory(id, ownerId, messages);

    console.log(`[Storage] ✅ 노트북 상세 로딩 완료 및 캐시 갱신 (메시지: ${messages.length}개)`);
    return fullNotebook;
  } catch (error) {
    console.error('[Storage] getNotebookById 에러:', error);
    return await localDB.localGetNotebookById(id, ownerId);
  }
};

// 메시지 로딩 로직 (사용자 문제 진단 반영: 소유자 vs 공유자 분리)
export const getNotebookMessages = async (notebookId, userId, notebookOwnerId = null) => {
  try {
    const { data, error } = await supabase.from('messages').select('*').eq('notebook_id', notebookId).order('timestamp', { ascending: true });
    if (error || !data) return [];

    const formattedMessages = data.map(msg => ({
      ...msg,
      ...(msg.metadata || {}),
      role: msg.role || msg.type || 'assistant',
      type: msg.type || msg.role || 'assistant'
    }));

    // 🔥 사용자 권한 확인 (Master 계정 또는 실제 노트북 소유자)
    const isOwner = userId === notebookOwnerId || isMasterAccount(userId);

    // 1. 소유자(Owner) 권한 처리
    if (isOwner) {
      // 소유자인 경우 모든 메시지를 가져온다 (user-minseok 등 레거시 포함)
      console.log(`[Storage] 소유자(${userId}) 확인됨: 전체 메시지 로드 (레거시 포함)`);
      return formattedMessages;
    }

    // 2. 공유받은 노트북(Guest) 처리
    // 수신자인 경우, 본인의 ID와 일치하는 대화 내용만 필터링
    const guestMessages = formattedMessages.filter(msg => {
      const msgUserId = msg.userId || msg.user_id;
      return msgUserId === userId;
    });

    console.log(`[Storage] 공유 사용자(${userId}) 필터링: ${guestMessages.length}개 대화 로드`);
    return guestMessages;

  } catch (e) {
    console.error('[Storage] getNotebookMessages 실패:', e);
    return [];
  }
};

// 데이터 각인(Write) 로직 점검 및 무결성 강화
export const saveNotebookMessages = async (notebookId, messages, userId) => {
  try {
    if (!userId) {
      console.error('[Storage] 유효하지 않은 userId로 메시지 저장 중단');
      return;
    }

    // 1. 기존 내역 삭제 (현재 사용자의 기록 또는 소유자가 레거시를 다루는 경우)
    const { data: existing } = await supabase.from('messages').select('id, metadata').eq('notebook_id', notebookId);
    if (existing) {
      const idsToDelete = existing.filter(m => {
        const mUid = m.user_id || m.metadata?.userId;
        // 본인 ID거나, 소유자가 레거시(minseok) 데이터를 정리하는 경우
        return mUid === userId || (mUid === 'user-minseok' && userId !== 'user-minseok');
      }).map(m => m.id);

      if (idsToDelete.length > 0) {
        await supabase.from('messages').delete().in('id', idsToDelete);
      }
    }

    if (!messages || messages.length === 0) return;

    // 2. 데이터 각인 강화
    const itemsToInsert = messages
      .filter(m => m.content && m.content.trim() !== '')
      .map(m => ({
        notebook_id: notebookId,
        role: m.role || m.type,
        content: m.content,
        timestamp: m.timestamp || new Date().toISOString(),
        metadata: {
          ...m.metadata,
          userId: userId // 강제 기입하여 데이터 무결성 확보
        }
      }));

    if (itemsToInsert.length > 0) {
      const { error } = await supabase.from('messages').insert(itemsToInsert);
      if (error && error.code === '42703') {
        const fallback = itemsToInsert.map(({ user_id, ...rest }) => rest);
        await supabase.from('messages').insert(fallback);
      }
    }

    // 로컬 캐시 즉시 업데이트 (동기화)
    await localDB.localSaveChatHistory(notebookId, userId, itemsToInsert);

  } catch (e) {
    console.error('[Storage] saveNotebookMessages 에러:', e);
  }
};

// 노트북 저장 (메타데이터 및 소유권)
export const saveNotebook = async (notebook, userId) => {
  if (!notebook || !notebook.id) return notebook;
  try {
    // 1. 로컬 우선 저장
    await localDB.localSaveNotebook(notebook);

    const syncTask = async () => {
      try {
        const sanitized = sanitizeNotebookForStorage(notebook);
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = userId || user?.email || notebook.ownerId;
        const isMaster = isMasterAccount(currentUserId);
        const isOwner = notebook.ownerId === currentUserId;

        if (isOwner || isMaster) {
          const shared = sanitized.sharingSettings?.sharedWith || [];
          const normalizedShared = Array.isArray(shared) ? shared.map(m => typeof m === 'string' ? m : m.email) : [];

          const dbData = {
            id: sanitized.id,
            title: sanitized.title,
            emoji: sanitized.emoji,
            ownerId: sanitized.ownerId,
            updated_at: new Date().toISOString(),
            selected_model: sanitized.selectedModel || 'gpt-5.1-instant',
            system_prompt_overrides: sanitized.systemPromptOverrides || [],
            analyzed_source_ids: sanitized.analyzedSourceIds || [],
            sharingSettings: { ...sanitized.sharingSettings, sharedWith: normalizedShared },
            metadata: { ...sanitized, sharingSettings: { ...sanitized.sharingSettings, sharedWith: normalizedShared } }
          };

          await supabase.from('notebooks').upsert(dbData, { onConflict: 'id' });
        }

        // 메시지 및 소스 동기화
        if (sanitized.messages) await saveNotebookMessages(sanitized.id, sanitized.messages, currentUserId);
        if ((isOwner || isMaster) && sanitized.sources?.length > 0) await saveNotebookSources(sanitized.id, sanitized.sources);
      } catch (e) { }
    };

    syncTask();
    return notebook;
  } catch (e) { return notebook; }
};

// 소스 로딩 및 상세 내역(다운로드 제외)
export const getNotebookSources = async (notebookId) => {
  try {
    const { data, error } = await supabase.from('sources').select('*').eq('notebook_id', notebookId).order('uploaded_at', { ascending: true });
    if (error || !data) return [];
    return data.map(s => ({
      id: s.id, name: s.name, type: s.type, size: s.size, file_path: s.file_path,
      parsedData: (s.page_texts || s.extracted_text) ? {
        fileType: s.file_type || (s.type === 'web' ? 'web' : 'pdf'),
        fileName: s.file_name || s.name,
        fileSize: s.file_size || s.size,
        extractedText: s.extracted_text || '',
        pageTexts: s.type === 'web' ? (s.page_texts?.items || []) : (s.page_texts || []),
        numPages: s.page_count || 0,
        summary: s.type === 'web' ? s.page_texts?.summary : null,
        metadata: s.type === 'web' ? (s.page_texts?.metadata || {}) : { title: s.name }
      } : null
    }));
  } catch (e) { return []; }
};

// 소스 내역 저장
export const saveNotebookSources = async (notebookId, sources) => {
  try {
    if (!sources || sources.length === 0) return;
    const rows = [];
    for (const s of sources) {
      let fPath = s.file_path;
      if ((s.file || s.fileBuffer) && !fPath) {
        const name = `${notebookId}/${s.id}_${s.name}`;
        const blob = s.file || new Blob([s.fileBuffer], { type: s.type });
        const { error } = await supabase.storage.from(BUCKET_NAME).upload(name, blob, { contentType: s.type, upsert: true });
        if (!error) fPath = name;
      }
      rows.push({
        id: s.id, notebook_id: notebookId, name: s.name, type: s.type, size: s.size || 0,
        uploaded_at: new Date().toISOString(), file_path: fPath,
        page_count: s.parsedData?.numPages || null,
        page_texts: s.type === 'web' ? {
          summary: s.parsedData?.summary || null,
          metadata: s.parsedData?.metadata || {},
          items: s.parsedData?.pageTexts || []
        } : (s.parsedData?.pageTexts || null),
        file_type: s.parsedData?.fileType || null,
        file_name: s.parsedData?.fileName || s.name,
        file_size: s.parsedData?.fileSize || 0,
        extracted_text: s.parsedData?.extractedText || null
      });
    }
    await supabase.from('sources').upsert(rows, { onConflict: 'id' });
  } catch (e) { }
};

// 노트북 삭제
export const deleteNotebook = async (id) => {
  try {
    await localDB.localDeleteNotebook(id);
    const { data } = await supabase.from('sources').select('file_path').eq('notebook_id', id);
    if (data?.length > 0) await supabase.storage.from(BUCKET_NAME).remove(data.map(s => s.file_path).filter(Boolean));
    await supabase.from('notebooks').delete().eq('id', id);
    return true;
  } catch (e) { return false; }
};

// 노트북 개수 조회
export const getNotebookCount = async (userId) => {
  try {
    const isMaster = isMasterAccount(userId);
    let query = supabase.from('notebooks').select('id', { count: 'exact', head: true });
    if (!isMaster) {
      const email = userId.includes('@') ? userId : `${userId}@gptko.co.kr`;
      query = query.or(`ownerId.eq.${userId},sharingSettings->sharedWith.cs.{"${email}"},sharingSettings->allDomainAccess.eq.true`);
    }
    const { count } = await query;
    return count || 0;
  } catch (e) { return 0; }
};

export const localClearAllNotebooks = () => localDB.localClearAllNotebooks();
export const clearAllNotebooks = () => Promise.all([localClearAllNotebooks(), supabase.from('notebooks').delete().neq('id', '')]);
export const migrateFromIndexedDB = async () => { };
