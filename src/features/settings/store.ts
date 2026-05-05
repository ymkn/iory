import { create } from 'zustand';
import { loadSettings, saveSettings } from './api';
import { DEFAULT_SETTINGS, SETTINGS_VERSION, type BackgroundMode, type CountMode, type CursorStyle, type PersistedSettings, type SettingsValues, type ThemeId } from './types';

type SettingsState = SettingsValues & {
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setThemeId: (themeId: ThemeId) => Promise<void>;
  setBackgroundMode: (backgroundMode: BackgroundMode) => Promise<void>;
  setShowBackgroundImage: (showBackgroundImage: boolean) => Promise<void>;
  setUiFontFamily: (uiFontFamily: string) => Promise<void>;
  setEditorFontFamily: (editorFontFamily: string) => Promise<void>;
  setCountMode: (countMode: CountMode) => Promise<void>;
  setCursorStyle: (cursorStyle: CursorStyle) => Promise<void>;
  setFontSize: (fontSize: number) => Promise<void>;
  setLineHeight: (lineHeight: number) => Promise<void>;
  setEditorMaxWidth: (editorMaxWidth: number) => Promise<void>;
  setShowStats: (showStats: boolean) => Promise<void>;
  setAutosaveIntervalMs: (autosaveIntervalMs: number) => Promise<void>;
  setCheckpointIntervalMs: (checkpointIntervalMs: number) => Promise<void>;
};

function toPersistedSettings(values: SettingsValues): PersistedSettings {
  return {
    version: SETTINGS_VERSION,
    ...values,
  };
}

async function persistSnapshot(values: SettingsValues) {
  await saveSettings(toPersistedSettings(values));
}

function withPersistence(set: (partial: Partial<SettingsState>) => void, get: () => SettingsState) {
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let queuedValues: SettingsValues | null = null;
  let activePersist: Promise<void> | null = null;

  const flushPersist = async () => {
    if (activePersist) {
      await activePersist;
    }

    while (queuedValues) {
      const nextValues = queuedValues;
      queuedValues = null;

      activePersist = persistSnapshot(nextValues).catch((error) => {
        console.error('Failed to persist settings', error);
      });

      await activePersist;
      activePersist = null;
    }
  };

  return async (partial: Partial<SettingsValues>) => {
    const nextValues = { ...get(), ...partial } satisfies SettingsValues;
    set(partial);

    queuedValues = nextValues;

    if (persistTimer !== null) {
      clearTimeout(persistTimer);
    }

    persistTimer = setTimeout(() => {
      persistTimer = null;
      void flushPersist();
    }, 240);
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const persist = withPersistence(
    (partial) => set(partial),
    get,
  );

  return {
    ...DEFAULT_SETTINGS,
    isHydrated: false,
    hydrate: async () => {
      if (get().isHydrated) {
        return;
      }

      try {
        const settings = await loadSettings();
        set({
          themeId: settings.themeId,
          backgroundMode: settings.backgroundMode,
          showBackgroundImage: settings.showBackgroundImage,
          uiFontFamily: settings.uiFontFamily,
          editorFontFamily: settings.editorFontFamily,
          countMode: settings.countMode,
          cursorStyle: settings.cursorStyle,
          fontSize: settings.fontSize,
          lineHeight: settings.lineHeight,
          editorMaxWidth: settings.editorMaxWidth,
          showStats: settings.showStats,
          autosaveIntervalMs: settings.autosaveIntervalMs,
          checkpointIntervalMs: settings.checkpointIntervalMs,
          isHydrated: true,
        });
      } catch (error) {
        console.error('Failed to load settings', error);
        set({ isHydrated: true });
      }
    },
    setThemeId: async (themeId) => {
      await persist({ themeId });
    },
    setBackgroundMode: async (backgroundMode) => {
      await persist({ backgroundMode });
    },
    setShowBackgroundImage: async (showBackgroundImage) => {
      await persist({ showBackgroundImage });
    },
    setUiFontFamily: async (uiFontFamily) => {
      await persist({ uiFontFamily });
    },
    setEditorFontFamily: async (editorFontFamily) => {
      await persist({ editorFontFamily });
    },
    setCountMode: async (countMode) => {
      await persist({ countMode });
    },
    setCursorStyle: async (cursorStyle) => {
      await persist({ cursorStyle });
    },
    setFontSize: async (fontSize) => {
      await persist({ fontSize });
    },
    setLineHeight: async (lineHeight) => {
      await persist({ lineHeight });
    },
    setEditorMaxWidth: async (editorMaxWidth) => {
      await persist({ editorMaxWidth });
    },
    setShowStats: async (showStats) => {
      await persist({ showStats });
    },
    setAutosaveIntervalMs: async (autosaveIntervalMs) => {
      await persist({ autosaveIntervalMs });
    },
    setCheckpointIntervalMs: async (checkpointIntervalMs) => {
      await persist({ checkpointIntervalMs });
    },
  };
});
