import { useCallback, useEffect, useRef } from 'react';
import { platform } from '../../platform';
import { cancelAutosave, scheduleAutosave, shouldScheduleAutosave } from './autosave';
import type { ConflictSnapshot, FileMetadataSnapshot, SaveStatus } from './store';
import { getTextFileMetadata, readTextFile, saveDocumentAtomic } from '../workspace/api';

export type SaveReason = 'manual' | 'autosave' | 'blur' | 'switch' | 'close';

type UseEditorPersistenceParams = {
  text: string;
  isComposing: boolean;
  currentFilePath: string | null;
  currentFileName: string | null;
  currentEncoding: string | null;
  currentBom: string | null;
  currentMetadata: FileMetadataSnapshot | null;
  hasLocalEditsSinceOpen: boolean;
  saveStatus: SaveStatus;
  isDirty: boolean;
  shouldDeferBlurSave?: () => boolean;
  shouldPauseExternalSync?: () => boolean;
  openDocument: (params: { path: string; name: string; text: string; encoding: string; bom: string | null; metadata: FileMetadataSnapshot }) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setLoadError: (message: string | null) => void;
  setLastEvent: (event: string) => void;
  markSaved: (text: string, metadata: FileMetadataSnapshot) => void;
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
  saveStatus,
  isDirty,
  shouldDeferBlurSave,
  shouldPauseExternalSync,
  openDocument,
  setSaveStatus,
  setLoadError,
  setLastEvent,
  markSaved,
  setConflictSnapshot,
}: UseEditorPersistenceParams) {
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const externalChangeInFlightRef = useRef(false);
  const currentFilePathRef = useRef(currentFilePath);
  const currentFileNameRef = useRef(currentFileName);
  const currentMetadataRef = useRef(currentMetadata);
  const hasLocalEditsSinceOpenRef = useRef(hasLocalEditsSinceOpen);
  const isDirtyRef = useRef(isDirty);
  const isComposingRef = useRef(isComposing);
  const saveStatusRef = useRef(saveStatus);

  useEffect(() => {
    currentFilePathRef.current = currentFilePath;
  }, [currentFilePath]);

  useEffect(() => {
    currentFileNameRef.current = currentFileName;
  }, [currentFileName]);

  useEffect(() => {
    currentMetadataRef.current = currentMetadata;
  }, [currentMetadata]);

  useEffect(() => {
    hasLocalEditsSinceOpenRef.current = hasLocalEditsSinceOpen;
  }, [hasLocalEditsSinceOpen]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    isComposingRef.current = isComposing;
  }, [isComposing]);

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

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

      const promise = saveDocumentAtomic(currentFilePath, text, currentEncoding ?? undefined, currentBom)
        .then(async () => {
          const metadata = await getTextFileMetadata(currentFilePath);
          markSaved(text, metadata);

          setLastEvent(`file:save:success:${reason}`);
        })
        .catch((error: unknown) => {
          const message = typeof error === 'string' ? error : error instanceof Error ? error.message : 'Failed to save the file.';
          setLoadError(message);
          setSaveStatus('error');
          setLastEvent(`file:save:error:${reason}`);
        })
        .finally(() => {
          savePromiseRef.current = null;
        });

      savePromiseRef.current = promise;
      return promise;
    },
    [currentBom, currentEncoding, currentFilePath, isDirty, markSaved, setLastEvent, setLoadError, setSaveStatus, text],
  );

  const handleExternalFileChange = useCallback(async () => {
    if (externalChangeInFlightRef.current) {
      return;
    }

    if (shouldPauseExternalSync?.()) {
      return;
    }

    const activeFilePath = currentFilePathRef.current;
    const activeFileName = currentFileNameRef.current;
    const metadataBefore = currentMetadataRef.current;

    if (!activeFilePath || !metadataBefore || isComposingRef.current || savePromiseRef.current || saveStatusRef.current === 'conflict') {
      return;
    }

    externalChangeInFlightRef.current = true;

    try {
      const metadata = await getTextFileMetadata(activeFilePath);

      if (metadata.modifiedAtMs === metadataBefore.modifiedAtMs && metadata.fileSize === metadataBefore.fileSize) {
        return;
      }

      const result = await readTextFile(activeFilePath);

      if (!isDirtyRef.current && !hasLocalEditsSinceOpenRef.current) {
        openDocument({
          path: activeFilePath,
          name: activeFileName ?? activeFilePath.split(/[/\\]/).at(-1) ?? activeFilePath,
          text: result.text,
          encoding: result.encoding,
          bom: result.bom,
          metadata,
        });
        setLoadError(result.hadDecodingErrors ? `Reloaded external changes as ${result.encoding}, but some characters were replaced.` : 'Reloaded external changes.');
        setLastEvent('file:external-change:auto-reloaded');
        return;
      }

      setConflictSnapshot({
        externalText: result.text,
        externalEncoding: result.encoding,
        externalBom: result.bom,
        externalMetadata: metadata,
      });
      setLoadError('This file changed outside the app. Auto-overwrite was stopped so you can choose what to keep.');
      setLastEvent('file:external-change:conflict');
    } catch (error) {
      const message = typeof error === 'string' ? error : error instanceof Error ? error.message : 'Failed to check for external changes.';
      setLoadError(message);
      setLastEvent('file:external-change:error');
    } finally {
      externalChangeInFlightRef.current = false;
    }
  }, [openDocument, setConflictSnapshot, setLastEvent, setLoadError, shouldPauseExternalSync]);

  useEffect(() => {
    if (!shouldScheduleAutosave({ currentFilePath, isDirty, isComposing })) {
      return;
    }

    const timer = scheduleAutosave(() => {
      if (!savePromiseRef.current) {
        void handleSaveFile('autosave');
      }
    });

    return () => {
      cancelAutosave(timer);
    };
  }, [currentFilePath, handleSaveFile, isDirty, isComposing]);

  useEffect(() => {
    if (!platform.supportsExternalWatch) {
      return;
    }

    if (!currentFilePath) {
      return;
    }

    const timer = window.setInterval(() => {
      void handleExternalFileChange();
    }, 1500);

    return () => {
      window.clearInterval(timer);
    };
  }, [currentFilePath, handleExternalFileChange]);

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
  }, [currentFilePath, handleSaveFile, isDirty, setLastEvent, shouldDeferBlurSave]);

  return {
    handleSaveFile,
    handleExternalFileChange,
  };
}
