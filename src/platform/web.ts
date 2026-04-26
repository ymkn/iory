import type { AppendFileHistoryEntryInput, FileHistoryDocument, FileHistoryEntry } from '../features/history/types';
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from '../features/settings/types';
import type { ReadTextFileResult, TextFileMetadata } from '../features/workspace/types';
import type { OpenFileDialogOptions, Platform, PlatformPath, SaveFileDialogOptions } from './types';

type WebDocumentRecord = {
  id: string;
  path: PlatformPath;
  name: string;
  text: string;
  encoding: 'utf-8';
  bom: string | null;
  modifiedAtMs: number;
  fileSize: number;
  updatedAtMs: number;
};

type WebHistoryRecord = {
  filePath: string;
  version: number;
  entries: FileHistoryEntry[];
};

type SettingsWire = {
  version: number;
  themeId: string;
  backgroundMode: string;
  showBackgroundImage?: boolean;
  uiFontFamily: string;
  editorFontFamily: string;
  countMode: string;
  fontSize: number;
  lineHeight: number;
  editorWidth: number;
  showStats: boolean;
  checkpointIntervalMs?: number;
};

const SETTINGS_STORAGE_KEY = 'iory.web.settings';
const DB_NAME = 'iory-web-demo';
const DB_VERSION = 1;
const DOCUMENT_STORE = 'documents';
const HISTORY_STORE = 'history';
const APP_LOGO_SRC = new URL('../../src-tauri/icons/128x128.png', import.meta.url).href;

function sanitizeName(name: string) {
  const trimmed = name.trim();
  const fallback = 'untitled.txt';
  return (trimmed || fallback).replace(/[\\/]+/g, '-');
}

function toBasename(name: string | null | undefined) {
  if (!name) {
    return 'untitled.txt';
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return 'untitled.txt';
  }

  return trimmed.split(/[/\\]/).filter(Boolean).at(-1) ?? 'untitled.txt';
}

function createDocumentId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDocumentPath(id: string, name: string) {
  return `web-document://${id}/${sanitizeName(name)}`;
}

function parseDocumentId(path: string) {
  const match = /^web-document:\/\/([^/]+)\//.exec(path);
  return match?.[1] ?? null;
}

function getStorage() {
  return window.localStorage;
}

function getPathFromArgs(args?: Record<string, unknown>) {
  const path = args?.path;
  if (typeof path !== 'string') {
    throw new Error('A file path was required.');
  }

  return path;
}

function sniffBom(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { bom: 'utf-8' as const, offset: 3 };
  }

  if (bytes.length >= 2 && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff))) {
    throw new Error('The web demo supports UTF-8 text files only. Please use the desktop app for other encodings.');
  }

  return { bom: null, offset: 0 };
}

function decodeUtf8Text(bytes: Uint8Array): ReadTextFileResult {
  const { offset, bom } = sniffBom(bytes);
  const decoder = new TextDecoder('utf-8', { fatal: true });

  try {
    const text = decoder.decode(bytes.subarray(offset));
    return {
      text,
      encoding: 'utf-8',
      bom,
      hadDecodingErrors: false,
    };
  } catch {
    throw new Error('The web demo supports UTF-8 text files only. Please use the desktop app for other encodings.');
  }
}

function encodeUtf8Text(text: string, bom?: string | null) {
  const body = new TextEncoder().encode(text);

  if (!bom) {
    return body;
  }

  if (bom !== 'utf-8') {
    throw new Error('The web demo can only export UTF-8 files.');
  }

  const bytes = new Uint8Array(body.length + 3);
  bytes.set([0xef, 0xbb, 0xbf], 0);
  bytes.set(body, 3);
  return bytes;
}

function utf8ByteLength(text: string, bom?: string | null) {
  return encodeUtf8Text(text, bom).byteLength;
}

function promisifyRequest<T>(request: IDBRequest<T>) {
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

async function withStore<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => Promise<T>) {
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

async function getDocumentRecord(path: string) {
  const id = parseDocumentId(path);

  if (!id) {
    throw new Error('This browser document reference is invalid.');
  }

  const record = await withStore(DOCUMENT_STORE, 'readonly', async (store) => {
    return promisifyRequest(store.get(id) as IDBRequest<WebDocumentRecord | undefined>);
  });

  if (!record) {
    throw new Error('This browser document is no longer available.');
  }

  return record;
}

async function saveDocumentRecord(record: WebDocumentRecord) {
  await withStore(DOCUMENT_STORE, 'readwrite', async (store) => {
    await promisifyRequest(store.put(record));
  });
}

async function registerLocalDocument(name: string, text = '', bom: string | null = null, metadata?: Partial<TextFileMetadata>) {
  const safeName = sanitizeName(name);
  const id = createDocumentId();
  const path = createDocumentPath(id, safeName);
  const now = Date.now();
  const record: WebDocumentRecord = {
    id,
    path,
    name: safeName,
    text,
    encoding: 'utf-8',
    bom,
    modifiedAtMs: metadata?.modifiedAtMs ?? now,
    fileSize: metadata?.fileSize ?? utf8ByteLength(text, bom),
    updatedAtMs: now,
  };

  await saveDocumentRecord(record);
  return path;
}

async function readBrowserFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = decodeUtf8Text(bytes);

  return {
    result,
    metadata: {
      modifiedAtMs: file.lastModified || Date.now(),
      fileSize: file.size,
    } satisfies TextFileMetadata,
  };
}

function createFileInput(accept?: string) {
  return new Promise<File | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) {
      input.accept = accept;
    }

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(file);
    };

    input.addEventListener('change', () => finish(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => finish(null), { once: true });
    input.click();
  });
}

async function openDialogWeb(options?: OpenFileDialogOptions) {
  if (options?.directory) {
    throw new Error('The web demo does not support folders. Please use the desktop app for workspace features.');
  }

  const accept = options?.filters?.flatMap((filter) => filter.extensions.map((extension) => `.${extension.replace(/^\./, '')}`)).join(',');
  const file = await createFileInput(accept);

  if (!file) {
    return null;
  }

  const { result, metadata } = await readBrowserFile(file);
  return registerLocalDocument(file.name, result.text, result.bom, metadata);
}

async function saveDialogWeb(options?: SaveFileDialogOptions) {
  const safeName = sanitizeName(options?.defaultPath ?? 'untitled.txt');
  return registerLocalDocument(safeName, '');
}

async function createEmptyTextFileWeb(path: string) {
  const record = await getDocumentRecord(path);
  await saveDocumentRecord({
    ...record,
    text: '',
    bom: null,
    modifiedAtMs: Date.now(),
    updatedAtMs: Date.now(),
    fileSize: 0,
  });
}

async function readTextFileWeb(path: string) {
  const record = await getDocumentRecord(path);
  return {
    text: record.text,
    encoding: record.encoding,
    bom: record.bom,
    hadDecodingErrors: false,
  } satisfies ReadTextFileResult;
}

async function getTextFileMetadataWeb(path: string) {
  const record = await getDocumentRecord(path);
  return {
    modifiedAtMs: record.modifiedAtMs,
    fileSize: record.fileSize,
  } satisfies TextFileMetadata;
}

async function saveDocumentAtomicWeb(path: string, contents: string, encoding?: string | null, bom?: string | null) {
  if (encoding && encoding !== 'utf-8') {
    throw new Error('The web demo can only save UTF-8 text. Please use the desktop app for other encodings.');
  }

  const record = await getDocumentRecord(path);
  const now = Date.now();

  await saveDocumentRecord({
    ...record,
    text: contents,
    encoding: 'utf-8',
    bom: bom ?? null,
    modifiedAtMs: now,
    updatedAtMs: now,
    fileSize: utf8ByteLength(contents, bom),
  });
}

function toDefaultSettingsWire(): SettingsWire {
  return {
    version: SETTINGS_VERSION,
    themeId: DEFAULT_SETTINGS.themeId,
    backgroundMode: DEFAULT_SETTINGS.backgroundMode,
    showBackgroundImage: DEFAULT_SETTINGS.showBackgroundImage,
    uiFontFamily: DEFAULT_SETTINGS.uiFontFamily,
    editorFontFamily: DEFAULT_SETTINGS.editorFontFamily,
    countMode: DEFAULT_SETTINGS.countMode,
    fontSize: DEFAULT_SETTINGS.fontSize,
    lineHeight: DEFAULT_SETTINGS.lineHeight,
    editorWidth: DEFAULT_SETTINGS.editorMaxWidth,
    showStats: DEFAULT_SETTINGS.showStats,
    checkpointIntervalMs: DEFAULT_SETTINGS.checkpointIntervalMs,
  };
}

function readSettingsWeb() {
  const raw = getStorage().getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return toDefaultSettingsWire();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SettingsWire>;
    return {
      ...toDefaultSettingsWire(),
      ...parsed,
      version: SETTINGS_VERSION,
    } satisfies SettingsWire;
  } catch {
    return toDefaultSettingsWire();
  }
}

function saveSettingsWeb(settings: SettingsWire) {
  const nextSettings: SettingsWire = {
    ...toDefaultSettingsWire(),
    ...settings,
    version: SETTINGS_VERSION,
  };

  getStorage().setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
  return nextSettings;
}

async function ensureHistoryRecord(filePath: string) {
  const existing = await withStore(HISTORY_STORE, 'readonly', async (store) => {
    return promisifyRequest(store.get(filePath) as IDBRequest<WebHistoryRecord | undefined>);
  });

  if (existing) {
    return existing;
  }

  const emptyRecord: WebHistoryRecord = {
    filePath,
    version: 1,
    entries: [],
  };

  await withStore(HISTORY_STORE, 'readwrite', async (store) => {
    await promisifyRequest(store.put(emptyRecord));
  });

  return emptyRecord;
}

async function loadFileHistoryWeb(path: string) {
  const record = await ensureHistoryRecord(path);
  return {
    filePath: record.filePath,
    version: record.version,
    entries: record.entries,
  } satisfies FileHistoryDocument;
}

async function appendFileHistoryEntryWeb(entry: AppendFileHistoryEntryInput) {
  const history = await ensureHistoryRecord(entry.filePath);
  const nextEntry: FileHistoryEntry = {
    id: createDocumentId(),
    savedAtMs: Date.now(),
    ...entry,
  };
  const nextHistory: WebHistoryRecord = {
    ...history,
    entries: [...history.entries, nextEntry],
  };

  await withStore(HISTORY_STORE, 'readwrite', async (store) => {
    await promisifyRequest(store.put(nextHistory));
  });

  return nextEntry;
}

async function truncateFileHistoryAfterWeb(path: string, entryId: string) {
  const history = await ensureHistoryRecord(path);
  const index = history.entries.findIndex((entry) => entry.id === entryId);

  if (index === -1) {
    return {
      filePath: history.filePath,
      version: history.version,
      entries: history.entries,
    } satisfies FileHistoryDocument;
  }

  const nextHistory: WebHistoryRecord = {
    ...history,
    entries: history.entries.slice(0, index + 1),
  };

  await withStore(HISTORY_STORE, 'readwrite', async (store) => {
    await promisifyRequest(store.put(nextHistory));
  });

  return {
    filePath: nextHistory.filePath,
    version: nextHistory.version,
    entries: nextHistory.entries,
  } satisfies FileHistoryDocument;
}

async function downloadDocumentWeb(path: PlatformPath, name: string, text: string, bom?: string | null) {
  const record = await getDocumentRecord(path);
  const downloadName = sanitizeName(toBasename(name || record.name));
  const bytes = encodeUtf8Text(text, bom);
  const blob = new Blob([bytes], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 0);
  }
}

async function invokeWeb<T>(command: string, args?: Record<string, unknown>) {
  switch (command) {
    case 'read_text_file':
      return readTextFileWeb(getPathFromArgs(args)) as Promise<T>;
    case 'get_text_file_metadata':
      return getTextFileMetadataWeb(getPathFromArgs(args)) as Promise<T>;
    case 'write_text_file':
    case 'save_document_atomic':
      return saveDocumentAtomicWeb(
        getPathFromArgs(args),
        typeof args?.contents === 'string' ? args.contents : '',
        typeof args?.encoding === 'string' ? args.encoding : null,
        typeof args?.bom === 'string' ? args.bom : null,
      ) as Promise<T>;
    case 'create_empty_text_file':
      return createEmptyTextFileWeb(getPathFromArgs(args)) as Promise<T>;
    case 'load_settings':
      return Promise.resolve(readSettingsWeb() as T);
    case 'save_settings': {
      const settings = args?.settings;
      if (!settings || typeof settings !== 'object') {
        throw new Error('Settings payload was missing.');
      }

      return Promise.resolve(saveSettingsWeb(settings as SettingsWire) as T);
    }
    case 'load_file_history':
      return loadFileHistoryWeb(getPathFromArgs(args)) as Promise<T>;
    case 'append_file_history_entry': {
      const entry = args?.entry;
      if (!entry || typeof entry !== 'object') {
        throw new Error('History entry payload was missing.');
      }

      return appendFileHistoryEntryWeb(entry as AppendFileHistoryEntryInput) as Promise<T>;
    }
    case 'truncate_file_history_after': {
      const path = getPathFromArgs(args);
      const entryId = args?.entryId;
      if (typeof entryId !== 'string') {
        throw new Error('A history entry id was required.');
      }

      return truncateFileHistoryAfterWeb(path, entryId) as Promise<T>;
    }
    default:
      throw new Error(`The web demo does not support '${command}'. Please use the desktop app for that feature.`);
  }
}

export const platform: Platform = {
  kind: 'web',
  supportsNativeWindowControls: false,
  supportsExternalWatch: false,
  supportsDownloadExport: true,
  invoke: invokeWeb,
  openDialog: openDialogWeb,
  saveDialog: saveDialogWeb,
  getAppWindow: () => null,
  getAppLogoSrc: () => APP_LOGO_SRC,
  downloadDocument: downloadDocumentWeb,
};
