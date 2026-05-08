import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { open as tauriOpen, save as tauriSave } from '@tauri-apps/plugin-dialog';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { AppWindowHandle, OpenFileDialogOptions, Platform, SaveFileDialogOptions, SettingsWire } from './types';

const APP_LOGO_SRC = new URL('../../src-tauri/icons/128x128.png', import.meta.url).href;

function createAppWindowHandle(): AppWindowHandle | null {
  try {
    const w = getCurrentWindow();
    return {
      startDragging: () => w.startDragging(),
      toggleMaximize: () => w.toggleMaximize(),
      minimize: () => w.minimize(),
      close: () => w.close(),
      setFullscreen: (fullscreen) => w.setFullscreen(fullscreen),
      isFullscreen: () => w.isFullscreen(),
      onResized: async (handler) => w.onResized(() => handler()),
    };
  } catch {
    return null;
  }
}

export const platform: Platform = {
  kind: 'tauri',
  supportsNativeWindowControls: true,
  supportsExternalFileSync: true,
  supportsDownloadExport: false,

  files: {
    readTextFile: (path) => tauriInvoke('read_text_file', { path }),
    getTextFileMetadata: (path) => tauriInvoke('get_text_file_metadata', { path }),
    createEmptyTextFile: (path) => tauriInvoke('create_empty_text_file', { path }),
    saveDocumentAtomic: (path, contents, encoding, bom) => tauriInvoke('save_document_atomic', { path, contents, encoding: encoding ?? null, bom: bom ?? null }),
  },

  history: {
    loadFileHistory: (path) => tauriInvoke('load_file_history', { path }),
    appendFileHistoryEntry: (entry) => tauriInvoke('append_file_history_entry', { entry }),
    truncateFileHistoryAfter: (path, entryId) => tauriInvoke('truncate_file_history_after', { path, entryId }),
  },

  settings: {
    loadSettings: () => tauriInvoke<SettingsWire>('load_settings'),
    saveSettings: (settings) => tauriInvoke<SettingsWire>('save_settings', { settings }),
  },

  openDialog: async (options?: OpenFileDialogOptions) => {
    const selected = await tauriOpen({
      directory: options?.directory ?? false,
      multiple: false,
      filters: options?.filters,
    });
    return typeof selected === 'string' ? selected : null;
  },

  saveDialog: async (options?: SaveFileDialogOptions) => {
    const selected = await tauriSave({
      title: options?.title,
      defaultPath: options?.defaultPath,
      filters: options?.filters,
      canCreateDirectories: options?.canCreateDirectories,
    });
    return typeof selected === 'string' ? selected : null;
  },

  getAppWindow: () => appWindowHandle,
  getAppLogoSrc: () => APP_LOGO_SRC,
  downloadDocument: async () => {
    throw new Error('Download export is available in the web demo only.');
  },
};

let appWindowHandle: AppWindowHandle | null = null;
try {
  appWindowHandle = createAppWindowHandle();
} catch {
  appWindowHandle = null;
}
