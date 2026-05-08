import { Suspense, lazy, useCallback, useMemo, useRef, type CSSProperties } from 'react';
import type { WritingEditorHandle } from '../features/editor/components/WritingEditor';
import { calculateDocumentStats } from '../features/editor/stats';
import { useEditorStore } from '../features/editor/store';
import { useEditorPersistence } from '../features/editor/useEditorPersistence';
import { OverlayRoot } from '../features/focus/overlays/OverlayRoot';
import { useFocusStore } from '../features/focus/store';
import { toFileName } from '../features/history/persistence';
import { useSettingsStore } from '../features/settings/store';
import { AppBanner } from './components/AppBanner';
import { CheckpointTimelinePane } from './components/CheckpointTimelinePane';
import { ConflictOverlayContent } from './components/ConflictOverlayContent';
import { EmptyState } from './components/EmptyState';
import { HistoryPreviewModal } from './components/HistoryPreviewModal';
import { LeftPane } from './components/LeftPane';
import { RestoreConfirmModal } from './components/RestoreConfirmModal';
import { SettingsOverlay } from './components/SettingsOverlay';
import { Titlebar } from './components/Titlebar';
import { WritingLayout } from './components/WritingLayout';
import { useAppEnvironment } from './hooks/useAppEnvironment';
import { useAppHotkeys } from './hooks/useAppHotkeys';
import { useEditorViewportBehavior } from './hooks/useEditorViewportBehavior';
import { useFileSession } from './hooks/useFileSession';
import { useHistoryController } from './hooks/useHistoryController';
import { useTransientBanner } from './hooks/useTransientBanner';
import { useWindowChrome } from './hooks/useWindowChrome';
import { platform } from '../platform';

const WritingEditor = lazy(async () => {
  const module = await import('../features/editor/components/WritingEditor');
  return { default: module.WritingEditor };
});

export function App() {
  const editorRef = useRef<WritingEditorHandle | null>(null);
  const isNativeFileDialogOpenRef = useRef(false);
  const isFileTransitioningRef = useRef(false);

  const {
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
    loadError,
    conflictSnapshot,
    setText,
    setComposing,
    setLastEvent,
    openDocument,
    setSaveStatus,
    setLoadError,
    markSaved,
    updateCurrentMetadata,
    setConflictSnapshot,
    reset,
  } = useEditorStore();
  const { isFocusMode, overlayPanel, overlaySource, toggleFocusMode, openOverlayPanel, openOverlayPanelFromHover, closeOverlayPanel, closeHoverOverlayPanel, toggleOverlayPanel } = useFocusStore();
  const { isHydrated, themeId, backgroundMode, showBackgroundImage, uiFontFamily, editorFontFamily, countMode, cursorStyle, fontSize, lineHeight, editorMaxWidth, autosaveIntervalMs, checkpointIntervalMs, hydrate } = useSettingsStore();

  const stats = useMemo(() => calculateDocumentStats(text), [text]);
  const isDirty = Boolean(currentFilePath) && saveStatus === 'dirty';
  const isConflictOpen = saveStatus === 'conflict' && Boolean(conflictSnapshot);
  const isOverlayOpen = overlayPanel !== 'none';
  const isDesktopSettingsPane = typeof window !== 'undefined' ? window.innerWidth > 900 : true;
  const isSidePaneOverlayOpen = overlayPanel === 'files' || overlayPanel === 'stats';
  const isSettingsDialogOpen = overlayPanel === 'settings';
  const isSidePanesVisible = !isConflictOpen && (!isFocusMode || isSidePaneOverlayOpen);
  const isHoverOverlayOpen = isFocusMode && overlaySource === 'hover';
  const canOpenHoverSidePane = isFocusMode && !isConflictOpen && overlayPanel === 'none';

  const { editorEpoch, editorRestoreState, refocusTextarea, requestEditorRemount } = useEditorViewportBehavior({
    editorRef,
    isComposing,
    setLastEvent,
  });

  const { handleSaveFile } = useEditorPersistence({
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
    shouldDeferBlurSave: () => isNativeFileDialogOpenRef.current,
    shouldPauseExternalSync: () => isNativeFileDialogOpenRef.current || isFileTransitioningRef.current,
    openDocument,
    setSaveStatus,
    setLoadError,
    setLastEvent,
    markSaved,
    updateCurrentMetadata,
    setConflictSnapshot,
  });

  const {
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
  } = useHistoryController({
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
  });

  const { recentFiles, handleOpenFileDialog, handleNewFile, handleOpenRecentFile, handleCloseCurrentFile, forgetRecentFile } = useFileSession({
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
  });

  const {
    supportsNativeWindowControls,
    isFullscreen,
    isFullscreenChromeVisible,
    showFullscreenChrome,
    hideFullscreenChrome,
    handleFullscreen,
    handleExitFullscreen,
    handleTitlebarMouseDown,
    handleMinimize,
    handleToggleMaximize,
    handleCloseWindow,
  } = useWindowChrome({
    isDirty,
    handleSaveFile,
    setLastEvent,
    editorRef,
  });

  const { renderedBannerMessage, isBannerVisible } = useTransientBanner({
    loadError,
    saveStatus,
    setLoadError,
  });

  useAppEnvironment({
    isFocusMode,
    closeHoverOverlayPanel,
    hydrate,
    themeId,
    backgroundMode,
    showBackgroundImage,
    uiFontFamily,
    editorFontFamily,
    fontSize,
    lineHeight,
    editorMaxWidth,
  });

  useAppHotkeys({
    restoreTargetEntry,
    previewEntry,
    isOverlayOpen,
    closeOverlayPanel,
    refocusTextarea,
    isComposing,
    saveStatus,
    handleOpenFileDialog,
    handleNewFile,
    isFullscreen,
    supportsNativeWindowControls,
    handleExitFullscreen,
    toggleOverlayPanel,
    setRestoreTargetEntry,
    setPreviewEntry,
  });

  const handleFilesPaneHoverEnter = useCallback(() => {
    if (canOpenHoverSidePane) {
      openOverlayPanelFromHover('files');
    }
  }, [canOpenHoverSidePane, openOverlayPanelFromHover]);

  const handleStatsPaneHoverEnter = useCallback(() => {
    if (canOpenHoverSidePane) {
      openOverlayPanelFromHover('stats');
    }
  }, [canOpenHoverSidePane, openOverlayPanelFromHover]);

  const saveStatusLabel = useMemo(() => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving';
      case 'saved':
        return 'Saved';
      case 'dirty':
        return 'Unsaved changes';
      case 'error':
        return 'Save error';
      case 'conflict':
        return 'External change';
      default:
        return 'Idle';
    }
  }, [saveStatus]);

  const editorFrameStyle = useMemo(
    () => ({
      '--editor-max-width': `${editorMaxWidth}px`,
    }) as CSSProperties,
    [editorMaxWidth],
  );

  const appLogoSrc = useMemo(() => platform.getAppLogoSrc(), []);
  const supportsDownloadExport = platform.supportsDownloadExport;

  const handleDownloadFile = useCallback(async () => {
    if (!currentFilePath) {
      return;
    }

    try {
      await platform.downloadDocument(currentFilePath, currentFileName ?? toFileName(currentFilePath), text, currentBom);
      setLoadError('Downloaded a copy of the current draft.');
      setLastEvent('file:download');
    } catch (error) {
      const message = typeof error === 'string' ? error : error instanceof Error ? error.message : 'Could not download the current draft.';
      setLoadError(message);
      setSaveStatus('error');
      setLastEvent('file:download:error');
    }
  }, [currentBom, currentFileName, currentFilePath, setLastEvent, setLoadError, setSaveStatus, text]);

  function renderBody() {
    if (!currentFilePath) {
      return (
        <EmptyState
          appLogoSrc={appLogoSrc}
          onNewFile={() => {
            void handleNewFile();
          }}
          onOpenFile={() => {
            void handleOpenFileDialog();
          }}
          onOpenRecentFile={(path) => {
            void handleOpenRecentFile(path);
          }}
          recentFiles={recentFiles}
        />
      );
    }

    return (
      <WritingLayout
        editor={(
          <>
            <Suspense fallback={<div aria-label="loading editor" className="writing-editor-fallback"><span className="loading-spinner" /></div>}>
              <WritingEditor
                cursorStyle={cursorStyle}
                fontSize={fontSize}
                initialSnapshot={editorRestoreState?.epoch === editorEpoch ? editorRestoreState.snapshot : null}
                key={editorEpoch}
                lineHeight={lineHeight}
                onBlur={() => {
                  setLastEvent('blur');
                  if (isDirty) {
                    void handleSaveFile('blur');
                  }
                }}
                onChange={(value) => {
                  setText(value);
                  setLastEvent('input/change');
                }}
                onCompositionEnd={() => {
                  setComposing(false);
                  setLastEvent('compositionend');
                }}
                onCompositionStart={() => {
                  setComposing(true);
                  setLastEvent('compositionstart');
                }}
                onFocus={() => {
                  setLastEvent('focus');
                }}
                onManualSave={() => {
                  void handleExplicitManualSave();
                }}
                ref={editorRef}
                value={text}
              />
            </Suspense>

            <div className="editor-word-count" aria-label="character and line count">
              {countMode === 'words' ? `${stats.words.toLocaleString('en-US')} words` : `${stats.characters.toLocaleString('en-US')} chars`} · {stats.lines.toLocaleString('en-US')} lines
            </div>
          </>
        )}
        editorFrameStyle={editorFrameStyle}
        isFocusMode={isFocusMode}
        isSidePanesVisible={isSidePanesVisible}
        leftPane={(
          <LeftPane
            currentFileName={currentFileName ?? toFileName(currentFilePath)}
            currentFilePath={currentFilePath}
            onCloseCurrentFile={() => {
              void handleCloseCurrentFile();
            }}
            onForgetRecentFile={forgetRecentFile}
            onOpenRecentFile={(path) => {
              void handleOpenRecentFile(path);
            }}
            recentFiles={recentFiles}
            saveStatus={saveStatus}
            saveStatusLabel={saveStatusLabel}
          />
        )}
        onEditorColumnMouseEnter={() => {
          if (isHoverOverlayOpen) {
            closeHoverOverlayPanel();
          }
        }}
        onEditorFrameMouseDownCapture={(event) => {
          const target = event.target;

          if (isSettingsDialogOpen) {
            closeOverlayPanel();
          }

          if (target instanceof Element && target.closest('.editor-side-pane')) {
            return;
          }

          if (isSidePanesVisible && overlaySource === 'manual') {
            closeOverlayPanel();
          }
        }}
        onLeftPaneHoverEnter={handleFilesPaneHoverEnter}
        onOpenLeftPane={() => {
          openOverlayPanel('files');
        }}
        onOpenRightPane={() => {
          openOverlayPanel('stats');
        }}
        onRightPaneHoverEnter={handleStatsPaneHoverEnter}
        onLayoutMouseLeave={() => {
          if (isHoverOverlayOpen) {
            closeHoverOverlayPanel();
            editorRef.current?.focus();
            setLastEvent('after-hover-overlay-close');
          }
        }}
        rightPane={<CheckpointTimelinePane currentFilePath={currentFilePath} historyEntriesDescending={historyEntriesDescending} historyError={historyError} onPreviewEntry={setPreviewEntry} />}
      />
    );
  }

  return (
    <main className={`spike-shell${isFullscreen ? ' is-fullscreen' : ''}${isFullscreenChromeVisible ? ' is-fullscreen-chrome-visible' : ''}`}>
      {isFullscreen ? <div aria-hidden="true" className="fullscreen-top-reveal" onMouseEnter={showFullscreenChrome} /> : null}
      <Titlebar
        appLogoSrc={appLogoSrc}
        currentFileName={currentFileName}
        isFocusMode={isFocusMode}
        isFullscreen={isFullscreen}
        isFullscreenChromeVisible={isFullscreenChromeVisible}
        showDownloadButton={supportsDownloadExport && Boolean(currentFilePath)}
        showWindowControls={supportsNativeWindowControls}
        onCloseWindow={() => {
          void handleCloseWindow();
        }}
        onMinimize={() => {
          void handleMinimize();
        }}
        onMouseLeave={() => {
          if (isFullscreen) {
            hideFullscreenChrome();
          }
        }}
        onNewFile={() => {
          void handleNewFile();
        }}
        onOpenFile={() => {
          void handleOpenFileDialog();
        }}
        onDownloadFile={() => {
          void handleDownloadFile();
        }}
        onOpenSettings={() => {
          openOverlayPanel('settings');
        }}
        onTitlebarMouseDown={(event) => {
          void handleTitlebarMouseDown(event);
        }}
        onToggleFocusMode={toggleFocusMode}
        onToggleFullscreen={handleFullscreen}
        onToggleMaximize={() => {
          void handleToggleMaximize();
        }}
      />

      {renderedBannerMessage ? <AppBanner isConflictOpen={isConflictOpen} isVisible={isBannerVisible} message={renderedBannerMessage} saveStatus={saveStatus} /> : null}

      <div className={`spike-scroll-body${isFullscreen ? ' is-fullscreen' : ''}`}>
        {renderBody()}
        <OverlayRoot isOpen={isConflictOpen}>
          {isConflictOpen ? <ConflictOverlayContent onOverwriteWithCurrent={() => {
            void handleOverwriteFromConflict();
          }} onReloadExternal={() => {
            void handleReloadFromConflict();
          }} /> : null}
        </OverlayRoot>
        <OverlayRoot className="overlay-root-centered" isOpen={Boolean(previewEntry)} panelClassName="overlay-panel-history-preview">
          {previewEntry ? <HistoryPreviewModal onClose={() => {
            setPreviewEntry(null);
          }} onRestore={() => {
            setRestoreTargetEntry(previewEntry);
          }} previewEntry={previewEntry} /> : null}
        </OverlayRoot>
        <OverlayRoot className="overlay-root-centered" isOpen={Boolean(restoreTargetEntry)} panelClassName="overlay-panel-create-file">
          {restoreTargetEntry ? <RestoreConfirmModal onClose={() => {
            setRestoreTargetEntry(null);
          }} onConfirm={() => {
            void handleRestoreHistoryEntry();
          }} restoreTargetEntry={restoreTargetEntry} /> : null}
        </OverlayRoot>
        <OverlayRoot className={isDesktopSettingsPane ? 'overlay-root-docked-right' : 'overlay-root-centered'} isOpen={isSettingsDialogOpen} onBackdropClick={closeOverlayPanel} panelClassName="overlay-panel-settings">
          <SettingsOverlay isDesktopSettingsPane={isDesktopSettingsPane} onClose={closeOverlayPanel} />
        </OverlayRoot>
      </div>
    </main>
  );
}
