import { create } from 'zustand';

export type OverlayPanel = 'none' | 'files' | 'stats' | 'settings';
export type OverlaySource = 'manual' | 'hover' | null;

type FocusState = {
  isFocusMode: boolean;
  overlayPanel: OverlayPanel;
  overlaySource: OverlaySource;
  toggleFocusMode: () => void;
  openOverlayPanel: (panel: Exclude<OverlayPanel, 'none'>) => void;
  openOverlayPanelFromHover: (panel: Exclude<OverlayPanel, 'none'>) => void;
  closeOverlayPanel: () => void;
  closeHoverOverlayPanel: () => void;
  toggleOverlayPanel: (panel: Exclude<OverlayPanel, 'none'>) => void;
};

export const useFocusStore = create<FocusState>((set) => ({
  isFocusMode: true,
  overlayPanel: 'none',
  overlaySource: null,
  toggleFocusMode: () =>
    set((state) => {
      const nextIsFocusMode = !state.isFocusMode;

      if (nextIsFocusMode) {
        return {
          isFocusMode: true,
          overlayPanel: state.overlaySource === 'hover' ? 'none' : state.overlayPanel,
          overlaySource: state.overlaySource === 'hover' ? null : state.overlaySource,
        };
      }

      return { isFocusMode: false };
    }),
  openOverlayPanel: (panel) => set({ overlayPanel: panel, overlaySource: 'manual' }),
  openOverlayPanelFromHover: (panel) => set({ overlayPanel: panel, overlaySource: 'hover' }),
  closeOverlayPanel: () => set({ overlayPanel: 'none', overlaySource: null }),
  closeHoverOverlayPanel: () =>
    set((state) => ({
      overlayPanel: state.overlaySource === 'hover' ? 'none' : state.overlayPanel,
      overlaySource: state.overlaySource === 'hover' ? null : state.overlaySource,
    })),
  toggleOverlayPanel: (panel) =>
    set((state) => ({
      overlayPanel: state.overlayPanel === panel ? 'none' : panel,
      overlaySource: state.overlayPanel === panel ? null : 'manual',
    })),
}));
