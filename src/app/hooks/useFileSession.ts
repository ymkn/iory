import { platform } from '../../platform';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

const { openDialog, saveDialog } = platform;
import type { WritingEditorSnapshot } from '../../features/editor/components/WritingEditor';
import type { FileMetadataSnapshot, SaveStatus } from '../../features/editor/store';
import { loadLastOpenedFile, loadRecentFiles, rememberRecentFile, removeRecentFile, saveLastOpenedFile, toFileName, type RecentFileSummary } from '../../features/history/persistence';
import { createEmptyTextFile, getTextFileMetadata, readTextFile } from '../../features/files/api';

type UseFileSessionArgs = {
  currentFilePath: string | null;
  isDirty: boolean;
  isHydrated: boolean;
  handleSaveFile: (reason: 'switch' | 'close') => Promise<void> | void;
  openDocument: (params: { path: string; name: string; text: string; encoding: string; bom: string | null; metadata: FileMetadataSnapshot }) => void;
  setLoadError: (message: string | null) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setLastEvent: (event: string) => void;
  reset: () => void;
  refocusTextarea: (reason: string) => void;
  requestEditorRemount: (reason: string, snapshot?: WritingEditorSnapshot | null) => void;
  loadHistoryForPath: (path: string) => Promise<void>;
  resetHistoryState: () => void;
  isNativeFileDialogOpenRef: RefObject<boolean>;
  isFileTransitioningRef: RefObject<boolean>;
};

async function pickTextFile() {
  const selected = await openDialog({
    directory: false,
    multiple: false,
    filters: [
      {
        name: 'Text documents',
        extensions: ['md', 'markdown', 'txt'],
      },
    ],
  });

  return typeof selected === 'string' ? selected : null;
}

export function useFileSession({
  currentFilePath,
  isDirty,
  isHydrated,
  handleSaveFile,
  openDocument,
  setLoadError,
  setSaveStatus,
  setLastEvent,
  reset,
  refocusTextarea,
  requestEditorRemount,
  loadHistoryForPath,
  resetHistoryState,
  isNativeFileDialogOpenRef,
  isFileTransitioningRef,
}: UseFileSessionArgs) {
  const openRequestIdRef = useRef(0);
  const hasTriedInitialRestoreRef = useRef(false);
  const [recentFiles, setRecentFiles] = useState<RecentFileSummary[]>(() => loadRecentFiles());

  const openFileByPath = useCallback(async (path: string, reason: string, snapshot?: WritingEditorSnapshot | null) => {
    const requestId = openRequestIdRef.current + 1;
    openRequestIdRef.current = requestId;
    isFileTransitioningRef.current = true;

    try {
      const result = await readTextFile(path);

      if (openRequestIdRef.current !== requestId) {
        return { remountedEditor: false };
      }

      const metadata = await getTextFileMetadata(path);

      if (openRequestIdRef.current !== requestId) {
        return { remountedEditor: false };
      }

      const shouldRemountEditor = currentFilePath !== path || snapshot !== undefined;

      openDocument({
        path,
        name: toFileName(path),
        text: result.text,
        encoding: result.encoding,
        bom: result.bom,
        metadata,
      });

      if (shouldRemountEditor) {
        requestEditorRemount(reason, snapshot ?? null);
      }

      saveLastOpenedFile(path);
      setRecentFiles(rememberRecentFile(path));
      await loadHistoryForPath(path);

      if (result.hadDecodingErrors) {
        setLoadError(`Loaded as ${result.encoding}, but some characters were replaced.`);
      } else {
        setLoadError(null);
      }

      setSaveStatus('saved');
      setLastEvent(reason);

      return { remountedEditor: shouldRemountEditor };
    } finally {
      if (openRequestIdRef.current === requestId) {
        isFileTransitioningRef.current = false;
      }
    }
  }, [currentFilePath, isFileTransitioningRef, loadHistoryForPath, openDocument, requestEditorRemount, setLastEvent, setLoadError, setSaveStatus]);

  const handleOpenFileDialog = useCallback(async () => {
    isNativeFileDialogOpenRef.current = true;
    const selected = await pickTextFile().finally(() => {
      isNativeFileDialogOpenRef.current = false;
    });

    if (!selected) {
      setLastEvent('file:open-cancelled');
      return;
    }

    if (isDirty && currentFilePath !== selected) {
      await handleSaveFile('switch');
    }

    try {
      const result = await openFileByPath(selected, 'file:open:success');

      if (!result?.remountedEditor) {
        refocusTextarea('after-file-open');
      }
    } catch (error) {
      const message = typeof error === 'string' ? error : error instanceof Error ? error.message : 'Could not open the file.';
      setLoadError(message);
      setSaveStatus('error');
      setLastEvent('file:open:error');
      setRecentFiles(removeRecentFile(selected));
      if (loadLastOpenedFile() === selected) {
        saveLastOpenedFile(null);
      }
    }
  }, [currentFilePath, handleSaveFile, isDirty, isNativeFileDialogOpenRef, openFileByPath, refocusTextarea, setLastEvent, setLoadError, setSaveStatus]);

  const handleNewFile = useCallback(async () => {
    isNativeFileDialogOpenRef.current = true;
    const selected = await saveDialog({
      title: 'New file',
      defaultPath: 'untitled.txt',
      filters: [
        {
          name: 'Text documents',
          extensions: ['md', 'markdown', 'txt'],
        },
      ],
      canCreateDirectories: true,
    }).finally(() => {
      isNativeFileDialogOpenRef.current = false;
    });

    if (typeof selected !== 'string') {
      setLastEvent('file:new-cancelled');
      return;
    }

    if (isDirty && currentFilePath !== selected) {
      await handleSaveFile('switch');
    }

    try {
      await createEmptyTextFile(selected);
      const result = await openFileByPath(selected, 'file:new:success');

      if (!result?.remountedEditor) {
        refocusTextarea('after-new-file');
      }
    } catch (error) {
      const message = typeof error === 'string' ? error : error instanceof Error ? error.message : 'Could not create the file.';
      setLoadError(message);
      setSaveStatus('error');
      setLastEvent('file:new:error');
    }
  }, [currentFilePath, handleSaveFile, isDirty, isNativeFileDialogOpenRef, openFileByPath, refocusTextarea, setLastEvent, setLoadError, setSaveStatus]);

  const handleOpenRecentFile = useCallback(async (path: string) => {
    if (isDirty && currentFilePath !== path) {
      await handleSaveFile('switch');
    }

    try {
      const result = await openFileByPath(path, 'file:open:recent');

      if (!result?.remountedEditor) {
        refocusTextarea('after-recent-file-open');
      }
    } catch (error) {
      const message = typeof error === 'string' ? error : error instanceof Error ? error.message : 'Could not reopen the file.';
      setLoadError(message);
      setSaveStatus('error');
      setLastEvent('file:open:recent:error');
      setRecentFiles(removeRecentFile(path));
      if (loadLastOpenedFile() === path) {
        saveLastOpenedFile(null);
      }
    }
  }, [currentFilePath, handleSaveFile, isDirty, openFileByPath, refocusTextarea, setLastEvent, setLoadError, setSaveStatus]);

  const handleCloseCurrentFile = useCallback(async () => {
    if (isDirty) {
      await handleSaveFile('close');
    }

    reset();
    resetHistoryState();
    saveLastOpenedFile(null);
    setLastEvent('file:close');
  }, [handleSaveFile, isDirty, reset, resetHistoryState, setLastEvent]);

  const forgetRecentFile = useCallback((path: string) => {
    setRecentFiles(removeRecentFile(path));
    if (loadLastOpenedFile() === path) {
      saveLastOpenedFile(currentFilePath === path ? currentFilePath : null);
    }
  }, [currentFilePath]);

  useEffect(() => {
    const restoreLastFile = async () => {
      if (!isHydrated || hasTriedInitialRestoreRef.current) {
        return;
      }

      hasTriedInitialRestoreRef.current = true;

      const lastFile = loadLastOpenedFile();

      if (!lastFile) {
        return;
      }

      try {
        await openFileByPath(lastFile, 'file:restore:last-opened');
        window.setTimeout(() => {
          refocusTextarea('after-last-file-restore');
        }, 0);
      } catch {
        saveLastOpenedFile(null);
        setRecentFiles(removeRecentFile(lastFile));
      }
    };

    void restoreLastFile();
  }, [isHydrated, openFileByPath, refocusTextarea]);

  return {
    recentFiles,
    handleOpenFileDialog,
    handleNewFile,
    handleOpenRecentFile,
    handleCloseCurrentFile,
    forgetRecentFile,
  };
}
