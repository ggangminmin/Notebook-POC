// IndexedDB Wrapper for Local Cache
const DB_NAME = 'NotebookLM_LocalDB';
const DB_VERSION = 2;
const NOTEBOOK_STORE = 'notebooks';

export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(NOTEBOOK_STORE)) {
                db.createObjectStore(NOTEBOOK_STORE, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const localSaveNotebook = async (notebook) => {
    try {
        const db = await initDB();
        const tx = db.transaction(NOTEBOOK_STORE, 'readwrite');
        const store = tx.objectStore(NOTEBOOK_STORE);

        // Ensure non-serializable objects like File are handled or removed if necessary
        // Actually IDB can store Blobs/Files.

        await new Promise((resolve, reject) => {
            const request = store.put(notebook);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        console.log('[IDB] Local save success:', notebook.id);
    } catch (error) {
        console.error('[IDB] Local save failed:', error);
    }
};

export const localGetAllNotebooks = async (ownerId) => {
    try {
        const db = await initDB();
        const tx = db.transaction(NOTEBOOK_STORE, 'readonly');
        const store = tx.objectStore(NOTEBOOK_STORE);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const results = request.result || [];
                // 사용자별 필터링: 소유자가 본인이거나, 공유 목록(sharedWith)에 본인이 포함된 경우
                // ownerId는 'demo-email' 형식일 수 있으므로 email과 함께 체크
                const userEmail = ownerId.startsWith('demo-') ? ownerId.replace('demo-', '') : ownerId;

                const filtered = results.map(nb => {
                    const isOwner = nb.ownerId === ownerId;
                    const isSharedToMe = nb.sharingSettings?.sharedWith?.includes(userEmail);
                    const isLegacyMaster = !nb.ownerId && (ownerId === 'admin@test.com' || ownerId === 'demo-admin');

                    if (isOwner || isSharedToMe || isLegacyMaster) {
                        // 본인 소유가 아니면(공유받은 경우) 메시지 내역 비우기
                        if (!isOwner && !isLegacyMaster) {
                            return { ...nb, messages: [] };
                        }
                        return nb;
                    }
                    return null;
                }).filter(Boolean);
                resolve(filtered);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('[IDB] Local load failed:', error);
        return [];
    }
};

export const localGetNotebookById = async (id) => {
    try {
        const db = await initDB();
        const tx = db.transaction(NOTEBOOK_STORE, 'readonly');
        const store = tx.objectStore(NOTEBOOK_STORE);

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => {
                const nb = request.result;
                if (!nb) {
                    resolve(null);
                    return;
                }

                // ownerId를 알 수 없으므로, storage.js에서 최종 필터링하도록 원본 반환
                // (이 함수는 주로 단일 조회 시 사용되며 storage.js에서 후처리를 함)
                resolve(nb);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('[IDB] Local get failed:', error);
        return null;
    }
};

export const localDeleteNotebook = async (id) => {
    try {
        const db = await initDB();
        const tx = db.transaction(NOTEBOOK_STORE, 'readwrite');
        const store = tx.objectStore(NOTEBOOK_STORE);

        await new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('[IDB] Local delete failed:', error);
    }
};
