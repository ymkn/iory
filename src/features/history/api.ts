import { platform } from '../../platform';
import type { AppendFileHistoryEntryInput } from './types';

export async function loadFileHistory(path: string) {
  return platform.history.loadFileHistory(path);
}

export async function appendFileHistoryEntry(entry: AppendFileHistoryEntryInput) {
  return platform.history.appendFileHistoryEntry(entry);
}

export async function truncateFileHistoryAfter(path: string, entryId: string) {
  return platform.history.truncateFileHistoryAfter(path, entryId);
}
