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

export const localGetAllNotebooks = async () => {
    try {
        const db = await initDB();
        const tx = db.transaction(NOTEBOOK_STORE, 'readonly');
        const store = tx.objectStore(NOTEBOOK_STORE);

        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
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
            request.onsuccess = () => resolve(request.result);
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
