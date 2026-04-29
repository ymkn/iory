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

export type Platform = {
  kind: 'tauri' | 'web';
  supportsNativeWindowControls: boolean;
  supportsExternalWatch: boolean;
  supportsDownloadExport: boolean;
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  openDialog: (options?: OpenFileDialogOptions) => Promise<PlatformPath | null>;
  saveDialog: (options?: SaveFileDialogOptions) => Promise<PlatformPath | null>;
  getAppWindow: () => AppWindowHandle | null;
  getAppLogoSrc: () => string;
  downloadDocument: (path: PlatformPath, name: string, text: string, bom?: string | null) => Promise<void>;
};
