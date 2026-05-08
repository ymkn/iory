export const DOCUMENT_STORE = 'documents';
export const HISTORY_STORE = 'history';

const DB_NAME = 'iory-web-demo';
const DB_VERSION = 1;

export function sanitizeName(name: string) {
  const trimmed = name.trim();
  const fallback = 'untitled.txt';
  return (trimmed || fallback).replace(/[\\/]+/g, '-');
}

export function toBasename(name: string | null | undefined) {
  if (!name) {
    return 'untitled.txt';
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return 'untitled.txt';
  }

  return trimmed.split(/[/\\]/).filter(Boolean).at(-1) ?? 'untitled.txt';
}

export function createWebId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getStorage() {
  return window.localStorage;
}

export function promisifyRequest<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error ?? new Error('IndexedDB request failed.')));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.addEventListener('upgradeneeded', () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(DOCUMENT_STORE)) {
        database.createObjectStore(DOCUMENT_STORE, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(HISTORY_STORE)) {
        database.createObjectStore(HISTORY_STORE, { keyPath: 'filePath' });
      }
    });

    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => reject(request.error ?? new Error('Could not open IndexedDB.')));
  });

  return dbPromise;
}

export async function withStore<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => Promise<T>) {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);

  const result = await action(store);

  await new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve());
    transaction.addEventListener('error', () => reject(transaction.error ?? new Error('IndexedDB transaction failed.')));
    transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.')));
  });

  return result;
}
