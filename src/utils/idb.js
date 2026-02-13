// IndexedDB Wrapper for Local Cache
const DB_NAME = 'NotebookLM_LocalDB';
const DB_VERSION = 3;
const NOTEBOOK_STORE = 'notebooks';
const CHAT_STORE = 'chat_history'; // 신규: 사용자별 채팅 내역 저장소

export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(NOTEBOOK_STORE)) {
                db.createObjectStore(NOTEBOOK_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(CHAT_STORE)) {
                db.createObjectStore(CHAT_STORE, { keyPath: 'historyId' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * 사용자별 채팅 내역 저장
 */
export const localSaveChatHistory = async (notebookId, userId, messages) => {
    try {
        const db = await initDB();
        const tx = db.transaction(CHAT_STORE, 'readwrite');
        const store = tx.objectStore(CHAT_STORE);
        const historyId = `${notebookId}_${userId}`;

        await new Promise((resolve, reject) => {
            const request = store.put({ historyId, notebookId, userId, messages, updatedAt: new Date().toISOString() });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('[IDB] Chat history save failed:', error);
    }
};

/**
 * 사용자별 채팅 내역 로드 (Fallback 포함)
 */
export const localGetChatHistory = async (notebookId, userId) => {
    try {
        const db = await initDB();
        const tx = db.transaction(CHAT_STORE, 'readonly');
        const store = tx.objectStore(CHAT_STORE);

        // 1. 현재 사용자 ID로 조회
        const historyId = `${notebookId}_${userId}`;
        const result = await new Promise((resolve) => {
            const request = store.get(historyId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });

        if (result && result.messages && result.messages.length > 0) {
            return result.messages;
        }

        // 2. [Fallback] 결과가 없으면 레거시(user-minseok) 데이터 확인 (로그인 전환 대응)
        if (userId !== 'user-minseok') {
            const legacyId = `${notebookId}_user-minseok`;
            const legacyResult = await new Promise((resolve) => {
                const request = store.get(legacyId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(null);
            });
            if (legacyResult && legacyResult.messages) return legacyResult.messages;
        }

        return [];
    } catch (error) {
        return [];
    }
};

export const localSaveNotebook = async (notebook) => {
    try {
        const db = await initDB();
        const tx = db.transaction(NOTEBOOK_STORE, 'readwrite');
        const store = tx.objectStore(NOTEBOOK_STORE);
        const { messages, ...notebookData } = notebook;
        await new Promise((resolve, reject) => {
            const request = store.put(notebookData);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) { }
};

export const localGetAllNotebooks = async (ownerId) => {
    try {
        const db = await initDB();
        const tx = db.transaction(NOTEBOOK_STORE, 'readonly');
        const store = tx.objectStore(NOTEBOOK_STORE);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = async () => {
                const results = request.result || [];
                const userEmail = (ownerId && typeof ownerId === 'string' && ownerId.startsWith('demo-')) ? ownerId.replace('demo-', '') : (ownerId || '');
                const userDomain = userEmail.split('@')[1];

                const processed = await Promise.all(results.map(async (nb) => {
                    const actualOwnerId = nb.ownerId || nb.metadata?.ownerId;
                    const isOwner = actualOwnerId === ownerId;
                    const isShared = nb.sharingSettings?.sharedWith?.some(m => (typeof m === 'string' ? m === userEmail : m.email === userEmail));
                    const isDomain = nb.sharingSettings?.allDomainAccess && actualOwnerId?.includes(`@${userDomain}`);

                    if (isOwner || isShared || isDomain || !actualOwnerId) {
                        const history = await localGetChatHistory(nb.id, ownerId);
                        return { ...nb, messages: history };
                    }
                    return null;
                }));
                resolve(processed.filter(Boolean));
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        return [];
    }
};

export const localGetNotebookById = async (id, userId) => {
    try {
        const db = await initDB();
        const tx = db.transaction(NOTEBOOK_STORE, 'readonly');
        const store = tx.objectStore(NOTEBOOK_STORE);

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = async () => {
                const nb = request.result;
                if (!nb) { resolve(null); return; }
                const history = await localGetChatHistory(nb.id, userId);
                resolve({ ...nb, messages: history });
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        return null;
    }
};

export const localDeleteNotebook = async (id) => {
    try {
        const db = await initDB();
        const tx = db.transaction([NOTEBOOK_STORE, CHAT_STORE], 'readwrite');
        tx.objectStore(NOTEBOOK_STORE).delete(id);
        // 연관 채팅 내역 삭제는 생략 (복구 가능성 대비)
    } catch (error) { }
};

export const localClearAllNotebooks = async () => {
    try {
        const db = await initDB();
        const tx = db.transaction([NOTEBOOK_STORE, CHAT_STORE], 'readwrite');
        tx.objectStore(NOTEBOOK_STORE).clear();
        tx.objectStore(CHAT_STORE).clear();
    } catch (error) { }
};
