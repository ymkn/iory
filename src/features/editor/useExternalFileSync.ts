import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { platform } from '../../platform';
import type {
  ConflictSnapshot,
  FileMetadataSnapshot,
  SaveStatus,
} from './store';
import { getTextFileMetadata, readTextFile } from '../files/api';

export function isMetadataOnlyExternalChange(
  diskText: string,
  lastSavedText: string | null,
  diskEncoding: string,
  currentEncoding: string | null,
  diskBom: string | null,
  currentBom: string | null,
) {
  return (
    lastSavedText !== null &&
    diskText === lastSavedText &&
    diskEncoding === currentEncoding &&
    diskBom === currentBom
  );
}

type UseExternalFileSyncParams = {
  currentFilePath: string | null;
  currentFileName: string | null;
  currentEncoding: string | null;
  currentBom: string | null;
  currentMetadata: FileMetadataSnapshot | null;
  hasLocalEditsSinceOpen: boolean;
  lastSavedText: string | null;
  isDirty: boolean;
  isComposing: boolean;
  saveStatus: SaveStatus;
  savePromiseRef: MutableRefObject<Promise<void> | null>;
  shouldPauseExternalSync?: () => boolean;
  openDocument: (params: {
    path: string;
    name: string;
    text: string;
    encoding: string;
    bom: string | null;
    metadata: FileMetadataSnapshot;
  }) => void;
  setLoadError: (message: string | null) => void;
  setLastEvent: (event: string) => void;
  updateCurrentMetadata: (metadata: FileMetadataSnapshot) => void;
  setConflictSnapshot: (conflict: ConflictSnapshot | null) => void;
};

export function useExternalFileSync({
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
}: UseExternalFileSyncParams) {
  const externalChangeInFlightRef = useRef(false);
  const currentFilePathRef = useRef(currentFilePath);
  const currentFileNameRef = useRef(currentFileName);
  const currentEncodingRef = useRef(currentEncoding);
  const currentBomRef = useRef(currentBom);
  const currentMetadataRef = useRef(currentMetadata);
  const hasLocalEditsSinceOpenRef = useRef(hasLocalEditsSinceOpen);
  const lastSavedTextRef = useRef(lastSavedText);
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
    currentEncodingRef.current = currentEncoding;
  }, [currentEncoding]);

  useEffect(() => {
    currentBomRef.current = currentBom;
  }, [currentBom]);

  useEffect(() => {
    currentMetadataRef.current = currentMetadata;
  }, [currentMetadata]);

  useEffect(() => {
    hasLocalEditsSinceOpenRef.current = hasLocalEditsSinceOpen;
  }, [hasLocalEditsSinceOpen]);

  useEffect(() => {
    lastSavedTextRef.current = lastSavedText;
  }, [lastSavedText]);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    isComposingRef.current = isComposing;
  }, [isComposing]);

  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);

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

    if (
      !activeFilePath ||
      !metadataBefore ||
      isComposingRef.current ||
      savePromiseRef.current ||
      saveStatusRef.current === 'conflict'
    ) {
      return;
    }

    externalChangeInFlightRef.current = true;

    try {
      const canApplyExternalChange = () =>
        currentFilePathRef.current === activeFilePath &&
        !savePromiseRef.current &&
        saveStatusRef.current !== 'conflict' &&
        shouldPauseExternalSync?.() !== true;

      const metadata = await getTextFileMetadata(activeFilePath);

      if (!canApplyExternalChange()) {
        return;
      }

      if (
        metadata.modifiedAtMs === metadataBefore.modifiedAtMs &&
        metadata.fileSize === metadataBefore.fileSize
      ) {
        return;
      }

      const result = await readTextFile(activeFilePath);

      if (!canApplyExternalChange()) {
        return;
      }

      if (
        isMetadataOnlyExternalChange(
          result.text,
          lastSavedTextRef.current,
          result.encoding,
          currentEncodingRef.current,
          result.bom,
          currentBomRef.current,
        )
      ) {
        updateCurrentMetadata(metadata);
        currentMetadataRef.current = metadata;
        setLastEvent('file:external-change:metadata-refreshed');
        return;
      }

      if (!isDirtyRef.current && !hasLocalEditsSinceOpenRef.current) {
        openDocument({
          path: activeFilePath,
          name:
            activeFileName ??
            activeFilePath.split(/[/\\]/).at(-1) ??
            activeFilePath,
          text: result.text,
          encoding: result.encoding,
          bom: result.bom,
          metadata,
        });
        currentMetadataRef.current = metadata;
        currentEncodingRef.current = result.encoding;
        currentBomRef.current = result.bom;
        lastSavedTextRef.current = result.text;
        saveStatusRef.current = 'saved';
        setLoadError(
          result.hadDecodingErrors
            ? `Reloaded external changes as ${result.encoding}, but some characters were replaced.`
            : 'Reloaded external changes.',
        );
        setLastEvent('file:external-change:auto-reloaded');
        return;
      }

      setConflictSnapshot({
        externalText: result.text,
        externalEncoding: result.encoding,
        externalBom: result.bom,
        externalMetadata: metadata,
      });
      setLoadError(
        'This file changed outside the app. Auto-overwrite was stopped so you can choose what to keep.',
      );
      setLastEvent('file:external-change:conflict');
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : 'Failed to check for external changes.';
      setLoadError(message);
      setLastEvent('file:external-change:error');
    } finally {
      externalChangeInFlightRef.current = false;
    }
  }, [
    openDocument,
    savePromiseRef,
    setConflictSnapshot,
    setLastEvent,
    setLoadError,
    shouldPauseExternalSync,
    updateCurrentMetadata,
  ]);

  useEffect(() => {
    if (!platform.supportsExternalFileSync) {
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

  return {
    handleExternalFileChange,
  };
}
