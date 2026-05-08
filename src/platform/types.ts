/**
 * Platform abstraction boundary.
 *
 * Every capability the app needs from the runtime is declared here.
 * The Tauri implementation lives in tauri.ts; a future Web implementation
 * will satisfy the same interface.
 *
 * Path identity is `string` for now. The seam for a future `FileSystemFileHandle`
 * migration is captured in the `PlatformPath` type alias — flipping it later
 * will produce targeted type errors rather than silent semantics changes.
 */

import type {
  ReadTextFileResult,
  TextFileMetadata,
} from '../features/files/types';
import type {
  AppendFileHistoryEntryInput,
  FileHistoryDocument,
  FileHistoryEntry,
} from '../features/history/types';

export type PlatformPath = string;

export type DialogFilter = {
  name: string;
  extensions: string[];
};

export type OpenFileDialogOptions = {
  directory?: boolean;
  multiple?: boolean;
  filters?: DialogFilter[];
};

export type SaveFileDialogOptions = {
  title?: string;
  defaultPath?: string;
  filters?: DialogFilter[];
  canCreateDirectories?: boolean;
};

export type AppWindowHandle = {
  startDragging: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  minimize: () => Promise<void>;
  close: () => Promise<void>;
  setFullscreen: (fullscreen: boolean) => Promise<void>;
  isFullscreen: () => Promise<boolean>;
  onResized: (handler: () => void) => Promise<() => void>;
};

export type SettingsWire = {
  version: number;
  themeId: string;
  backgroundMode: string;
  showBackgroundImage?: boolean;
  uiFontFamily: string;
  editorFontFamily: string;
  countMode: string;
  cursorStyle?: string;
  fontSize: number;
  lineHeight: number;
  editorWidth: number;
  autosaveIntervalMs?: number;
  checkpointIntervalMs?: number;
};

export type FilePlatform = {
  readTextFile: (path: PlatformPath) => Promise<ReadTextFileResult>;
  getTextFileMetadata: (path: PlatformPath) => Promise<TextFileMetadata>;
  createEmptyTextFile: (path: PlatformPath) => Promise<void>;
  saveDocumentAtomic: (
    path: PlatformPath,
    contents: string,
    encoding?: string,
    bom?: string | null,
  ) => Promise<void>;
};

export type HistoryPlatform = {
  loadFileHistory: (path: PlatformPath) => Promise<FileHistoryDocument>;
  appendFileHistoryEntry: (
    entry: AppendFileHistoryEntryInput,
  ) => Promise<FileHistoryEntry>;
  truncateFileHistoryAfter: (
    path: PlatformPath,
    entryId: string,
  ) => Promise<FileHistoryDocument>;
};

export type SettingsPlatform = {
  loadSettings: () => Promise<SettingsWire>;
  saveSettings: (settings: SettingsWire) => Promise<SettingsWire>;
};

export type Platform = {
  kind: 'tauri' | 'web';
  supportsNativeWindowControls: boolean;
  supportsExternalFileSync: boolean;
  supportsDownloadExport: boolean;
  files: FilePlatform;
  history: HistoryPlatform;
  settings: SettingsPlatform;
  openDialog: (options?: OpenFileDialogOptions) => Promise<PlatformPath | null>;
  saveDialog: (options?: SaveFileDialogOptions) => Promise<PlatformPath | null>;
  getAppWindow: () => AppWindowHandle | null;
  getAppLogoSrc: () => string;
  downloadDocument: (
    path: PlatformPath,
    name: string,
    text: string,
    bom?: string | null,
  ) => Promise<void>;
};
