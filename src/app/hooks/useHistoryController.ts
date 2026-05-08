import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { WritingEditorHandle, WritingEditorSnapshot } from '../../features/editor/components/WritingEditor';
import { useEditorStore, type ConflictSnapshot, type FileMetadataSnapshot, type SaveStatus } from '../../features/editor/store';
import { appendFileHistoryEntry, loadFileHistory, truncateFileHistoryAfter } from '../../features/history/api';
import { DEFAULT_CHECKPOINT_INTERVAL_MS, shouldAppendCheckpoint } from '../../features/history/checkpoints';
import type { FileHistoryEntry } from '../../features/history/types';
import { getTextFileMetadata, saveDocumentAtomic } from '../../features/files/api';
import { toFileName } from '../../features/history/persistence';

type UseHistoryControllerArgs = {
  text: string;
  currentFilePath: string | null;
  currentFileName: string | null;
  currentEncoding: string | null;
  currentBom: string | null;
  currentMetadata: FileMetadataSnapshot | null;
  checkpointIntervalMs: number;
  conflictSnapshot: ConflictSnapshot | null;
  handleSaveFile: (reason: 'manual') => Promise<void> | void;
  openDocument: (params: { path: string; name: string; text: string; encoding: string; bom: string | null; metadata: FileMetadataSnapshot }) => void;
  setLoadError: (message: string | null) => void;
  setLastEvent: (event: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setConflictSnapshot: (conflict: ConflictSnapshot | null) => void;
  refocusTextarea: (reason: string) => void;
  requestEditorRemount: (reason: string, snapshot?: WritingEditorSnapshot | null) => void;
  editorRef: RefObject<WritingEditorHandle | null>;
  isNativeFileDialogOpenRef: RefObject<boolean>;
  isFileTransitioningRef: RefObject<boolean>;
};

export function useHistoryController({
  text,
  currentFilePath,
  currentFileName,
  currentEncoding,
  currentBom,
  currentMetadata,
  checkpointIntervalMs,
  conflictSnapshot,
  handleSaveFile,
  openDocument,
  setLoadError,
  setLastEvent,
  setSaveStatus,
  setConflictSnapshot,
  refocusTextarea,
  requestEditorRemount,
  editorRef,
  isNativeFileDialogOpenRef,
  isFileTransitioningRef,
}: UseHistoryControllerArgs) {
  const checkpointStateRef = useRef({
    filePath: null as string | null,
    text: '',
    encoding: 'utf-8',
    bom: null as string | null,
    snapshot: null as WritingEditorSnapshot | null,
    metadata: null as FileMetadataSnapshot | null,
    latestEntry: null as FileHistoryEntry | null,
  });
  const [historyEntries, setHistoryEntries] = useState<FileHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [previewEntry, setPreviewEntry] = useState<FileHistoryEntry | null>(null);
  const [restoreTargetEntry, setRestoreTargetEntry] = useState<FileHistoryEntry | null>(null);

  const historyEntriesDescending = useMemo(() => [...historyEntries].sort((left, right) => right.savedAtMs - left.savedAtMs), [historyEntries]);

  const loadHistoryForPath = useCallback(async (path: string) => {
    try {
      const document = await loadFileHistory(path);
      setHistoryEntries(document.entries);
      setHistoryError(null);
    } catch (error) {
      setHistoryEntries([]);
      setHistoryError(typeof error === 'string' ? error : error instanceof Error ? error.message : 'Could not load file history.');
    }
  }, []);

  const resetHistoryState = useCallback(() => {
    setHistoryEntries([]);
    setHistoryError(null);
    setPreviewEntry(null);
    setRestoreTargetEntry(null);
  }, []);

  const appendManualCheckpoint = useCallback(async () => {
    if (!currentFilePath) {
      return;
    }

    const metadata = await getTextFileMetadata(currentFilePath);
    const latestEntry = checkpointStateRef.current.latestEntry;

    if (!shouldAppendCheckpoint(latestEntry, {
      text,
      encoding: currentEncoding ?? 'utf-8',
      bom: currentBom,
    })) {
      await loadHistoryForPath(currentFilePath);
      return;
    }

    await appendFileHistoryEntry({
      filePath: currentFilePath,
      reason: 'manual',
      text,
      encoding: currentEncoding ?? 'utf-8',
      bom: currentBom,
      modifiedAtMs: metadata.modifiedAtMs,
      fileSize: text.length,
      editorSnapshot: editorRef.current?.captureSnapshot() ?? null,
    });

    await loadHistoryForPath(currentFilePath);
  }, [currentBom, currentEncoding, currentFilePath, editorRef, loadHistoryForPath, text]);

  const handleExplicitManualSave = useCallback(async () => {
    await handleSaveFile('manual');

    if (!currentFilePath) {
      return;
    }

    if (useEditorStore.getState().saveStatus !== 'saved') {
      return;
    }

    try {
      await appendManualCheckpoint();
      setLastEvent('file:checkpoint:manual');
    } catch (error) {
      console.error('Failed to append manual checkpoint', error);
      setLoadError('The file was saved, but the manual checkpoint could not be written.');
      setLastEvent('file:checkpoint:manual:error');
    }
  }, [appendManualCheckpoint, currentFilePath, handleSaveFile, setLastEvent, setLoadError]);

  const handleReloadFromConflict = useCallback(async () => {
    if (!currentFilePath || !currentFileName || !conflictSnapshot) {
      return;
    }

    openDocument({
      path: currentFilePath,
      name: currentFileName,
      text: conflictSnapshot.externalText,
      encoding: conflictSnapshot.externalEncoding,
      bom: conflictSnapshot.externalBom,
      metadata: conflictSnapshot.externalMetadata,
    });
    setLoadError('Reloaded the external version.');
    setLastEvent('file:conflict:reload');
    refocusTextarea('after-conflict-reload');
  }, [conflictSnapshot, currentFileName, currentFilePath, openDocument, refocusTextarea, setLastEvent, setLoadError]);

  const handleOverwriteFromConflict = useCallback(async () => {
    if (!currentFilePath) {
      return;
    }

    setConflictSnapshot(null);
    setSaveStatus('dirty');
    await handleSaveFile('manual');
    setLoadError('Saved by overwriting with the current content.');
    setLastEvent('file:conflict:overwrite');
  }, [currentFilePath, handleSaveFile, setConflictSnapshot, setLastEvent, setLoadError, setSaveStatus]);

  const handleRestoreHistoryEntry = useCallback(async () => {
    if (!currentFilePath || !restoreTargetEntry) {
      return;
    }

    try {
      await saveDocumentAtomic(currentFilePath, restoreTargetEntry.text, restoreTargetEntry.encoding, restoreTargetEntry.bom);
      const truncatedDocument = await truncateFileHistoryAfter(currentFilePath, restoreTargetEntry.id);
      const metadata = await getTextFileMetadata(currentFilePath);

      openDocument({
        path: currentFilePath,
        name: currentFileName ?? toFileName(currentFilePath),
        text: restoreTargetEntry.text,
        encoding: restoreTargetEntry.encoding,
        bom: restoreTargetEntry.bom,
        metadata,
      });

      requestEditorRemount('history-restore', restoreTargetEntry.editorSnapshot);
      setHistoryEntries(truncatedDocument.entries);
      setHistoryError(null);
      setPreviewEntry(null);
      setRestoreTargetEntry(null);
      setLoadError('Restored the selected snapshot and discarded later history.');
      setLastEvent('file:history:restore');
      refocusTextarea('after-history-restore');
    } catch (error) {
      const message = typeof error === 'string' ? error : error instanceof Error ? error.message : 'Could not restore this snapshot.';
      setLoadError(message);
      setSaveStatus('error');
      setLastEvent('file:history:restore:error');
    }
  }, [currentFileName, currentFilePath, openDocument, refocusTextarea, requestEditorRemount, restoreTargetEntry, setLastEvent, setLoadError, setSaveStatus]);

  useEffect(() => {
    checkpointStateRef.current = {
      filePath: currentFilePath,
      text,
      encoding: currentEncoding ?? 'utf-8',
      bom: currentBom,
      snapshot: editorRef.current?.captureSnapshot() ?? null,
      metadata: currentMetadata,
      latestEntry: historyEntries.at(-1) ?? null,
    };
  }, [currentBom, currentEncoding, currentFilePath, currentMetadata, editorRef, historyEntries, text]);

  useEffect(() => {
    if (!currentFilePath) {
      return;
    }

    const timer = window.setInterval(() => {
      if (isFileTransitioningRef.current || isNativeFileDialogOpenRef.current) {
        return;
      }

      const checkpointState = checkpointStateRef.current;

      if (!checkpointState.filePath || !checkpointState.metadata) {
        return;
      }

      if (!shouldAppendCheckpoint(checkpointState.latestEntry, {
        text: checkpointState.text,
        encoding: checkpointState.encoding,
        bom: checkpointState.bom,
      })) {
        return;
      }

      void appendFileHistoryEntry({
        filePath: checkpointState.filePath,
        reason: 'checkpoint',
        text: checkpointState.text,
        encoding: checkpointState.encoding,
        bom: checkpointState.bom,
        modifiedAtMs: checkpointState.metadata.modifiedAtMs,
        fileSize: checkpointState.text.length,
        editorSnapshot: checkpointState.snapshot,
      }).then(() => loadHistoryForPath(checkpointState.filePath!)).catch((error) => {
        console.error('Failed to append checkpoint', error);
        setLoadError('The file stayed open, but the local checkpoint could not be written.');
        setLastEvent('file:checkpoint:error');
      });
    }, Math.max(60000, checkpointIntervalMs || DEFAULT_CHECKPOINT_INTERVAL_MS));

    return () => {
      window.clearInterval(timer);
    };
  }, [checkpointIntervalMs, currentFilePath, isFileTransitioningRef, isNativeFileDialogOpenRef, loadHistoryForPath, setLastEvent, setLoadError]);

  return {
    historyEntriesDescending,
    historyError,
    previewEntry,
    setPreviewEntry,
    restoreTargetEntry,
    setRestoreTargetEntry,
    loadHistoryForPath,
    resetHistoryState,
    handleExplicitManualSave,
    handleReloadFromConflict,
    handleOverwriteFromConflict,
    handleRestoreHistoryEntry,
  };
}
