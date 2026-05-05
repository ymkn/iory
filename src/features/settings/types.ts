export type ThemeId = 'night-blue' | 'snow' | 'ash' | 'warm-paper';
export type BackgroundMode = 'soft' | 'plain';
export type CountMode = 'characters' | 'words';
export type CursorStyle = 'line' | 'block';

export type SettingsValues = {
  themeId: ThemeId;
  backgroundMode: BackgroundMode;
  showBackgroundImage: boolean;
  uiFontFamily: string;
  editorFontFamily: string;
  countMode: CountMode;
  cursorStyle: CursorStyle;
  fontSize: number;
  lineHeight: number;
  editorMaxWidth: number;
  showStats: boolean;
  autosaveIntervalMs: number;
  checkpointIntervalMs: number;
};

export type PersistedSettings = SettingsValues & {
  version: number;
};

export const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS: SettingsValues = {
  themeId: 'night-blue',
  backgroundMode: 'soft',
  showBackgroundImage: true,
  uiFontFamily: 'Inter, "Noto Sans JP", system-ui, sans-serif',
  editorFontFamily: 'Inter, "Noto Sans JP", system-ui, sans-serif',
  countMode: 'characters',
  cursorStyle: 'line',
  fontSize: 14,
  lineHeight: 2,
  editorMaxWidth: 820,
  showStats: true,
  autosaveIntervalMs: 10000,
  checkpointIntervalMs: 600000,
};

export const THEME_OPTIONS: Array<{ id: ThemeId; label: string; swatch: [string, string, string] }> = [
  { id: 'night-blue', label: 'Night Blue', swatch: ['#101418', '#9ec3d9', '#d8e1ea'] },
  { id: 'snow', label: 'Snow', swatch: ['#f4f7fb', '#79a1cc', '#1b2733'] },
  { id: 'ash', label: 'Ash', swatch: ['#1a1d20', '#99b1c7', '#eceff1'] },
  { id: 'warm-paper', label: 'Warm Paper', swatch: ['#ede6db', '#b6946c', '#5d4a3b'] },
];
