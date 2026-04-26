import { platform as tauriPlatform } from './tauri';
import { platform as webPlatform } from './web';

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export const platform = isTauriRuntime() ? tauriPlatform : webPlatform;
export type { AppWindowHandle, DialogFilter, OpenFileDialogOptions, Platform, PlatformPath, SaveFileDialogOptions } from './types';
