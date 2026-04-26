export type HistoryEntrySelectionRange = {
  anchor: number;
  head: number;
};

export type HistoryEntryEditorSnapshot = {
  selection: HistoryEntrySelectionRange[];
  mainIndex: number;
  scrollTop: number;
  scrollLeft: number;
};

export type FileHistoryEntry = {
  id: string;
  filePath: string;
  savedAtMs: number;
  reason: string;
  text: string;
  encoding: string;
  bom: string | null;
  modifiedAtMs: number;
  fileSize: number;
  editorSnapshot: HistoryEntryEditorSnapshot | null;
};

export type FileHistoryDocument = {
  version: number;
  filePath: string;
  entries: FileHistoryEntry[];
};

export type AppendFileHistoryEntryInput = {
  filePath: string;
  reason: string;
  text: string;
  encoding: string;
  bom: string | null;
  modifiedAtMs: number;
  fileSize: number;
  editorSnapshot: HistoryEntryEditorSnapshot | null;
};
