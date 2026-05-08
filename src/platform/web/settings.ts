import {
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
} from '../../features/settings/types';
import type { SettingsWire } from '../types';
import { getStorage } from './shared';

const SETTINGS_STORAGE_KEY = 'iory.web.settings';

function toDefaultSettingsWire(): SettingsWire {
  return {
    version: SETTINGS_VERSION,
    themeId: DEFAULT_SETTINGS.themeId,
    backgroundMode: DEFAULT_SETTINGS.backgroundMode,
    showBackgroundImage: DEFAULT_SETTINGS.showBackgroundImage,
    uiFontFamily: DEFAULT_SETTINGS.uiFontFamily,
    editorFontFamily: DEFAULT_SETTINGS.editorFontFamily,
    countMode: DEFAULT_SETTINGS.countMode,
    fontSize: DEFAULT_SETTINGS.fontSize,
    lineHeight: DEFAULT_SETTINGS.lineHeight,
    editorWidth: DEFAULT_SETTINGS.editorMaxWidth,
    checkpointIntervalMs: DEFAULT_SETTINGS.checkpointIntervalMs,
  };
}

export function readSettingsWeb() {
  const raw = getStorage().getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return toDefaultSettingsWire();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SettingsWire>;
    return {
      ...toDefaultSettingsWire(),
      ...parsed,
      version: SETTINGS_VERSION,
    } satisfies SettingsWire;
  } catch {
    return toDefaultSettingsWire();
  }
}

export function saveSettingsWeb(settings: SettingsWire) {
  const nextSettings: SettingsWire = {
    ...toDefaultSettingsWire(),
    ...settings,
    version: SETTINGS_VERSION,
  };

  getStorage().setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
  return nextSettings;
}
