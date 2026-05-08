import { useCallback, useEffect, useRef } from 'react';
import {
  cancelAutosave,
  scheduleAutosave,
  shouldScheduleAutosave,
} from './autosave';
import type {
  ConflictSnapshot,
  FileMetadataSnapshot,
  SaveStatus,
} from './store';
import { getTextFileMetadata, saveDocumentAtomic } from '../files/api';
import { useExternalFileSync } from './useExternalFileSync';

export type SaveReason = 'manual' | 'autosave' | 'blur' | 'switch' | 'close';

export function getSaveFailureMessage(reason: SaveReason) {
  return reason === 'autosave'
    ? '自動保存に失敗しました。'
    : '保存に失敗しました。';
}

type UseEditorPersistenceParams = {
  text: string;
  isComposing: boolean;
  currentFilePath: string | null;
  currentFileName: string | null;
  currentEncoding: string | null;
  currentBom: string | null;
  currentMetadata: FileMetadataSnapshot | null;
  hasLocalEditsSinceOpen: boolean;
  lastSavedText: string | null;
  saveStatus: SaveStatus;
  isDirty: boolean;
  autosaveIntervalMs?: number;
  shouldDeferBlurSave?: () => boolean;
  shouldPauseExternalSync?: () => boolean;
  openDocument: (params: {
    path: string;
    name: string;
    text: string;
    encoding: string;
    bom: string | null;
    metadata: FileMetadataSnapshot;
  }) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setLoadError: (message: string | null) => void;
  setLastEvent: (event: string) => void;
  markSaved: (text: string, metadata: FileMetadataSnapshot) => void;
  updateCurrentMetadata: (metadata: FileMetadataSnapshot) => void;
  setConflictSnapshot: (conflict: ConflictSnapshot | null) => void;
};

export function useEditorPersistence({
  text,
  isComposing,
  currentFilePath,
  currentFileName,
  currentEncoding,
  currentBom,
  currentMetadata,
  hasLocalEditsSinceOpen,
  lastSavedText,
  saveStatus,
  isDirty,
  autosaveIntervalMs,
  shouldDeferBlurSave,
  shouldPauseExternalSync,
  openDocument,
  setSaveStatus,
  setLoadError,
  setLastEvent,
  markSaved,
  updateCurrentMetadata,
  setConflictSnapshot,
}: UseEditorPersistenceParams) {
  const savePromiseRef = useRef<Promise<void> | null>(null);

  const handleSaveFile = useCallback(
    async (reason: SaveReason = 'manual') => {
      if (!currentFilePath) {
        setLastEvent('file:save:no-active-file');
        return;
      }

      if (savePromiseRef.current) {
        return savePromiseRef.current;
      }

      if (reason !== 'manual' && !isDirty) {
        return;
      }

      setSaveStatus('saving');
      setLoadError(null);
      setLastEvent(`file:save:start:${reason}`);

      const promise = saveDocumentAtomic(
        currentFilePath,
        text,
        currentEncoding ?? undefined,
        currentBom,
      )
        .then(async () => {
          const metadata = await getTextFileMetadata(currentFilePath);
          markSaved(text, metadata);

          setLastEvent(`file:save:success:${reason}`);
        })
        .catch((error: unknown) => {
          const message =
            typeof error === 'string'
              ? error
              : error instanceof Error
                ? error.message
                : 'Failed to save the file.';
          console.error(`Failed to save file (${reason})`, message);
          setLoadError(getSaveFailureMessage(reason));
          setSaveStatus('error');
          setLastEvent(`file:save:error:${reason}`);
        })
        .finally(() => {
          savePromiseRef.current = null;
        });

      savePromiseRef.current = promise;
      return promise;
    },
    [
      currentBom,
      currentEncoding,
      currentFilePath,
      isDirty,
      markSaved,
      setLastEvent,
      setLoadError,
      setSaveStatus,
      text,
    ],
  );

  const { handleExternalFileChange } = useExternalFileSync({
    currentFilePath,
    currentFileName,
    currentEncoding,
    currentBom,
    currentMetadata,
    hasLocalEditsSinceOpen,
    lastSavedText,
    isDirty,
    isComposing,
    saveStatus,
    savePromiseRef,
    shouldPauseExternalSync,
    openDocument,
    setLoadError,
    setLastEvent,
    updateCurrentMetadata,
    setConflictSnapshot,
  });

  useEffect(() => {
    if (!shouldScheduleAutosave({ currentFilePath, isDirty, isComposing })) {
      return;
    }

    const timer = scheduleAutosave(() => {
      if (!savePromiseRef.current) {
        void handleSaveFile('autosave');
      }
    }, autosaveIntervalMs);

    return () => {
      cancelAutosave(timer);
    };
  }, [
    autosaveIntervalMs,
    currentFilePath,
    handleSaveFile,
    isDirty,
    isComposing,
  ]);

  useEffect(() => {
    const handleWindowBlur = () => {
      if (shouldDeferBlurSave?.()) {
        setLastEvent('file:save:blur-skipped');
        return;
      }

      if (isDirty && !savePromiseRef.current && currentFilePath) {
        void handleSaveFile('blur');
      }
    };

    const handleBeforeUnload = () => {
      if (isDirty && !savePromiseRef.current && currentFilePath) {
        void handleSaveFile('close');
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [
    currentFilePath,
    handleSaveFile,
    isDirty,
    setLastEvent,
    shouldDeferBlurSave,
  ]);

  return {
    handleSaveFile,
    handleExternalFileChange,
  };
}
