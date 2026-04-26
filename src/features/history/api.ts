import { platform } from '../../platform';
import type { AppendFileHistoryEntryInput, FileHistoryDocument, FileHistoryEntry } from './types';

const { invoke } = platform;

export async function loadFileHistory(path: string) {
  return invoke<FileHistoryDocument>('load_file_history', { path });
}

export async function appendFileHistoryEntry(entry: AppendFileHistoryEntryInput) {
  return invoke<FileHistoryEntry>('append_file_history_entry', { entry });
}

export async function truncateFileHistoryAfter(path: string, entryId: string) {
  return invoke<FileHistoryDocument>('truncate_file_history_after', { path, entryId });
}
