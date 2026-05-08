import type { AppendFileHistoryEntryInput, FileHistoryDocument, FileHistoryEntry } from '../../features/history/types';
import { HISTORY_STORE, createWebId, promisifyRequest, withStore } from './shared';

type WebHistoryRecord = {
  filePath: string;
  version: number;
  entries: FileHistoryEntry[];
};

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

export async function loadFileHistoryWeb(path: string) {
  const record = await ensureHistoryRecord(path);
  return {
    filePath: record.filePath,
    version: record.version,
    entries: record.entries,
  } satisfies FileHistoryDocument;
}

export async function appendFileHistoryEntryWeb(entry: AppendFileHistoryEntryInput) {
  const history = await ensureHistoryRecord(entry.filePath);
  const nextEntry: FileHistoryEntry = {
    id: createWebId(),
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

export async function truncateFileHistoryAfterWeb(path: string, entryId: string) {
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
