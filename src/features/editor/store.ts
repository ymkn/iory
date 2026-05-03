import { create } from 'zustand';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';

export type FileMetadataSnapshot = {
  modifiedAtMs: number;
  fileSize: number;
};

export type ConflictSnapshot = {
  externalText: string;
  externalEncoding: string;
  externalBom: string | null;
  externalMetadata: FileMetadataSnapshot;
};

type EditorState = {
  text: string;
  isComposing: boolean;
  lastEvent: string;
  currentFilePath: string | null;
  currentFileName: string | null;
  currentEncoding: string | null;
  currentBom: string | null;
  currentMetadata: FileMetadataSnapshot | null;
  hasLocalEditsSinceOpen: boolean;
  lastSavedText: string | null;
  saveStatus: SaveStatus;
  loadError: string | null;
  conflictSnapshot: ConflictSnapshot | null;
  setText: (text: string) => void;
  setComposing: (isComposing: boolean) => void;
  setLastEvent: (event: string) => void;
  openDocument: (params: { path: string; name: string; text: string; encoding: string; bom: string | null; metadata: FileMetadataSnapshot }) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setLoadError: (message: string | null) => void;
  markSaved: (text: string, metadata: FileMetadataSnapshot) => void;
  updateCurrentMetadata: (metadata: FileMetadataSnapshot) => void;
  setConflictSnapshot: (conflict: ConflictSnapshot | null) => void;
  reset: () => void;
};

const INITIAL_TEXT = `雪の気配が、まだ見えないうちから部屋の空気を変えていた。

この画面は Phase 2 の writing view 土台です。
まだ textarea ベースですが、以後ここへ editor 実装を載せていきます。`;

export const useEditorStore = create<EditorState>((set) => ({
  text: INITIAL_TEXT,
  isComposing: false,
  lastEvent: 'まだ入力イベントはありません',
  currentFilePath: null,
  currentFileName: null,
  currentEncoding: null,
  currentBom: null,
  currentMetadata: null,
  hasLocalEditsSinceOpen: false,
  lastSavedText: null,
  saveStatus: 'idle',
  loadError: null,
  conflictSnapshot: null,
  setText: (text) =>
    set((state) => ({
      text,
      hasLocalEditsSinceOpen: state.currentFilePath ? state.hasLocalEditsSinceOpen || state.lastSavedText !== text : state.hasLocalEditsSinceOpen,
      saveStatus:
        state.currentFilePath && state.saveStatus !== 'conflict' ? (state.lastSavedText === text ? 'saved' : 'dirty') : state.saveStatus,
    })),
  setComposing: (isComposing) => set({ isComposing }),
  setLastEvent: (event) => set({ lastEvent: event }),
  openDocument: ({ path, name, text, encoding, bom, metadata }) =>
    set({
      text,
      currentFilePath: path,
      currentFileName: name,
      currentEncoding: encoding,
      currentBom: bom,
      currentMetadata: metadata,
      hasLocalEditsSinceOpen: false,
      lastSavedText: text,
      saveStatus: 'saved',
      loadError: null,
      conflictSnapshot: null,
    }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setLoadError: (loadError) => set({ loadError }),
  markSaved: (text, metadata) =>
    set({
      text,
      currentMetadata: metadata,
      lastSavedText: text,
      saveStatus: 'saved',
      loadError: null,
      conflictSnapshot: null,
    }),
  updateCurrentMetadata: (currentMetadata) => set({ currentMetadata }),
  setConflictSnapshot: (conflictSnapshot) =>
    set({
      conflictSnapshot,
      saveStatus: conflictSnapshot ? 'conflict' : 'saved',
    }),
  reset: () =>
    set({
      text: INITIAL_TEXT,
      isComposing: false,
      lastEvent: 'まだ入力イベントはありません',
      currentFilePath: null,
      currentFileName: null,
      currentEncoding: null,
      currentBom: null,
      currentMetadata: null,
      hasLocalEditsSinceOpen: false,
      lastSavedText: null,
      saveStatus: 'idle',
      loadError: null,
      conflictSnapshot: null,
    }),
}));
