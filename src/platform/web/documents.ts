import type { ReadTextFileResult, TextFileMetadata } from '../../features/files/types';
import type { OpenFileDialogOptions, PlatformPath, SaveFileDialogOptions } from '../types';
import { decodeUtf8Text, encodeUtf8Text, utf8ByteLength } from './encoding';
import { DOCUMENT_STORE, createWebId, promisifyRequest, sanitizeName, toBasename, withStore } from './shared';

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

function createDocumentPath(id: string, name: string) {
  return `web-document://${id}/${sanitizeName(name)}`;
}

function parseDocumentId(path: string) {
  const match = /^web-document:\/\/([^/]+)\//.exec(path);
  return match?.[1] ?? null;
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
  const id = createWebId();
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

export async function openDialogWeb(options?: OpenFileDialogOptions) {
  if (options?.directory) {
    throw new Error('The web demo does not support folders. Please use the desktop app for folder access.');
  }

  const accept = options?.filters?.flatMap((filter) => filter.extensions.map((extension) => `.${extension.replace(/^\./, '')}`)).join(',');
  const file = await createFileInput(accept);

  if (!file) {
    return null;
  }

  const { result, metadata } = await readBrowserFile(file);
  return registerLocalDocument(file.name, result.text, result.bom, metadata);
}

export async function saveDialogWeb(options?: SaveFileDialogOptions) {
  const safeName = sanitizeName(options?.defaultPath ?? 'untitled.txt');
  return registerLocalDocument(safeName, '');
}

export async function createEmptyTextFileWeb(path: string) {
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

export async function readTextFileWeb(path: string) {
  const record = await getDocumentRecord(path);
  return {
    text: record.text,
    encoding: record.encoding,
    bom: record.bom,
    hadDecodingErrors: false,
  } satisfies ReadTextFileResult;
}

export async function getTextFileMetadataWeb(path: string) {
  const record = await getDocumentRecord(path);
  return {
    modifiedAtMs: record.modifiedAtMs,
    fileSize: record.fileSize,
  } satisfies TextFileMetadata;
}

export async function saveDocumentAtomicWeb(path: string, contents: string, encoding?: string | null, bom?: string | null) {
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

export async function downloadDocumentWeb(path: PlatformPath, name: string, text: string, bom?: string | null) {
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
