import { platform } from '../../platform';
import { SETTINGS_VERSION, type PersistedSettings, type SettingsValues } from './types';

const { invoke } = platform;

type SettingsWire = {
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
  showStats: boolean;
  autosaveIntervalMs?: number;
  checkpointIntervalMs?: number;
};

const MIN_AUTOSAVE_INTERVAL_MS = 10000;

function normalizeAutosaveIntervalMs(value: number | undefined) {
  return Math.max(MIN_AUTOSAVE_INTERVAL_MS, value ?? MIN_AUTOSAVE_INTERVAL_MS);
}

function normalizeThemeId(themeId: string): PersistedSettings['themeId'] {
  switch (themeId) {
    case 'snow':
    case 'ash':
    case 'warm-paper':
    case 'night-blue':
      return themeId;
    default:
      return 'night-blue';
  }
}

function normalizeCursorStyle(cursorStyle: string | undefined): PersistedSettings['cursorStyle'] {
  switch (cursorStyle) {
    case 'block':
    case 'line':
      return cursorStyle;
    default:
      return 'line';
  }
}

function fromWire(settings: SettingsWire): PersistedSettings {
  return {
    version: settings.version,
    themeId: normalizeThemeId(settings.themeId),
    backgroundMode: settings.backgroundMode as PersistedSettings['backgroundMode'],
    showBackgroundImage: settings.showBackgroundImage ?? true,
    uiFontFamily: settings.uiFontFamily,
    editorFontFamily: settings.editorFontFamily,
    countMode: settings.countMode as PersistedSettings['countMode'],
    cursorStyle: normalizeCursorStyle(settings.cursorStyle),
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    editorMaxWidth: settings.editorWidth,
    showStats: settings.showStats,
    autosaveIntervalMs: normalizeAutosaveIntervalMs(settings.autosaveIntervalMs),
    checkpointIntervalMs: settings.checkpointIntervalMs ?? 600000,
  };
}

function toWire(settings: SettingsValues): SettingsWire {
  return {
    version: SETTINGS_VERSION,
    themeId: settings.themeId,
    backgroundMode: settings.backgroundMode,
    showBackgroundImage: settings.showBackgroundImage,
    uiFontFamily: settings.uiFontFamily,
    editorFontFamily: settings.editorFontFamily,
    countMode: settings.countMode,
    cursorStyle: settings.cursorStyle,
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    editorWidth: settings.editorMaxWidth,
    showStats: settings.showStats,
    autosaveIntervalMs: settings.autosaveIntervalMs,
    checkpointIntervalMs: settings.checkpointIntervalMs,
  };
}

export async function loadSettings() {
  const settings = await invoke<SettingsWire>('load_settings');
  return fromWire(settings);
}

export async function saveSettings(settings: SettingsValues) {
  const saved = await invoke<SettingsWire>('save_settings', { settings: toWire(settings) });
  return fromWire(saved);
}
