import { supabase } from './supabase';

const DB_NAME = 'aao_offline';
const STORE_NAME = 'pending_sightings';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'localId', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueSighting(entry: Record<string, any>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({ ...entry, queuedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCount(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

export async function syncPending(): Promise<number> {
  let synced = 0;
  try {
    const db = await openDB();
    const entries: any[] = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve([]);
    });

    for (const entry of entries) {
      const { localId, queuedAt, ...data } = entry;
      const { error } = await supabase.from('sighting_entries').insert(data);
      if (!error) {
        // Remove from queue on success
        const delTx = db.transaction(STORE_NAME, 'readwrite');
        delTx.objectStore(STORE_NAME).delete(localId);
        await new Promise<void>((resolve) => { delTx.oncomplete = () => resolve(); });
        synced++;
      }
      // On error, leave in queue for next try
    }
  } catch {
    // IndexedDB not available or other error
  }
  return synced;
}
