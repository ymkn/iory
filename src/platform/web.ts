import type { Platform } from './types';
import { createEmptyTextFileWeb, downloadDocumentWeb, getTextFileMetadataWeb, openDialogWeb, readTextFileWeb, saveDialogWeb, saveDocumentAtomicWeb } from './web/documents';
import { appendFileHistoryEntryWeb, loadFileHistoryWeb, truncateFileHistoryAfterWeb } from './web/history';
import { readSettingsWeb, saveSettingsWeb } from './web/settings';

const APP_LOGO_SRC = new URL('../../src-tauri/icons/128x128.png', import.meta.url).href;

export const platform: Platform = {
  kind: 'web',
  supportsNativeWindowControls: false,
  supportsExternalFileSync: false,
  supportsDownloadExport: true,
  files: {
    readTextFile: readTextFileWeb,
    getTextFileMetadata: getTextFileMetadataWeb,
    createEmptyTextFile: createEmptyTextFileWeb,
    saveDocumentAtomic: saveDocumentAtomicWeb,
  },
  history: {
    loadFileHistory: loadFileHistoryWeb,
    appendFileHistoryEntry: appendFileHistoryEntryWeb,
    truncateFileHistoryAfter: truncateFileHistoryAfterWeb,
  },
  settings: {
    loadSettings: async () => readSettingsWeb(),
    saveSettings: async (settings) => saveSettingsWeb(settings),
  },
  openDialog: openDialogWeb,
  saveDialog: saveDialogWeb,
  getAppWindow: () => null,
  getAppLogoSrc: () => APP_LOGO_SRC,
  downloadDocument: downloadDocumentWeb,
};
