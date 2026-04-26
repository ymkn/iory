import { useEffect } from 'react';
import type { FileHistoryEntry } from '../../features/history/types';
import type { OverlayPanel } from '../../features/focus/store';
import type { SaveStatus } from '../../features/editor/store';

type UseAppHotkeysArgs = {
  restoreTargetEntry: FileHistoryEntry | null;
  previewEntry: FileHistoryEntry | null;
  isOverlayOpen: boolean;
  closeOverlayPanel: () => void;
  refocusTextarea: (reason: string) => void;
  isComposing: boolean;
  saveStatus: SaveStatus;
  handleOpenFileDialog: () => Promise<void>;
  handleNewFile: () => Promise<void>;
  toggleOverlayPanel: (panel: Exclude<OverlayPanel, 'none'>) => void;
  setRestoreTargetEntry: (entry: FileHistoryEntry | null) => void;
  setPreviewEntry: (entry: FileHistoryEntry | null) => void;
};

export function useAppHotkeys({
  restoreTargetEntry,
  previewEntry,
  isOverlayOpen,
  closeOverlayPanel,
  refocusTextarea,
  isComposing,
  saveStatus,
  handleOpenFileDialog,
  handleNewFile,
  toggleOverlayPanel,
  setRestoreTargetEntry,
  setPreviewEntry,
}: UseAppHotkeysArgs) {
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (restoreTargetEntry) {
          event.preventDefault();
          setRestoreTargetEntry(null);
          return;
        }

        if (previewEntry) {
          event.preventDefault();
          setPreviewEntry(null);
          return;
        }

        if (isOverlayOpen) {
          event.preventDefault();
          closeOverlayPanel();
          refocusTextarea('after-overlay-close');
        }

        return;
      }

      if (isComposing || saveStatus === 'conflict') {
        return;
      }

      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'o') {
        event.preventDefault();
        void handleOpenFileDialog();
        return;
      }

      if (key === 'n') {
        event.preventDefault();
        void handleNewFile();
        return;
      }

      if (key === 'p') {
        event.preventDefault();
        toggleOverlayPanel('files');
        return;
      }

      if (key === 'i') {
        event.preventDefault();
        toggleOverlayPanel('stats');
        return;
      }

      if (key === ',') {
        event.preventDefault();
        toggleOverlayPanel('settings');
      }
    };

    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [closeOverlayPanel, handleNewFile, handleOpenFileDialog, isComposing, isOverlayOpen, previewEntry, refocusTextarea, restoreTargetEntry, saveStatus, setPreviewEntry, setRestoreTargetEntry, toggleOverlayPanel]);
}
