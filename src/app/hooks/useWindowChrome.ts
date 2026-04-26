import { platform, type AppWindowHandle } from '../../platform';
import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import type { WritingEditorHandle } from '../../features/editor/components/WritingEditor';

type UseWindowChromeArgs = {
  isDirty: boolean;
  handleSaveFile: (reason: 'close') => Promise<void>;
  setLastEvent: (event: string) => void;
  editorRef: RefObject<WritingEditorHandle | null>;
};

export function useWindowChrome({ isDirty, handleSaveFile, setLastEvent, editorRef }: UseWindowChromeArgs) {
  const appWindowRef = useRef<AppWindowHandle | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [isFullscreenChromeVisible, setIsFullscreenChromeVisible] = useState(() => !document.fullscreenElement);

  useEffect(() => {
    appWindowRef.current = platform.getAppWindow();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      setIsFullscreenChromeVisible(!active);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const showFullscreenChrome = useCallback(() => {
    setIsFullscreenChromeVisible(true);
  }, []);

  const hideFullscreenChrome = useCallback(() => {
    setIsFullscreenChromeVisible(false);
  }, []);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void document.documentElement.requestFullscreen();
  }, []);

  const handleTitlebarMouseDown = useCallback(async (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    if (event.detail === 2) {
      setLastEvent('titlebar-double-click');
      await appWindowRef.current?.toggleMaximize();
      return;
    }

    setLastEvent('titlebar-start-dragging');
    await appWindowRef.current?.startDragging();
    editorRef.current?.focus();
    setLastEvent('after-dragging');
  }, [editorRef, setLastEvent]);

  const handleMinimize = useCallback(async () => {
    setLastEvent('window-minimize');
    await appWindowRef.current?.minimize();
  }, [setLastEvent]);

  const handleToggleMaximize = useCallback(async () => {
    setLastEvent('window-toggle-maximize');
    await appWindowRef.current?.toggleMaximize();
  }, [setLastEvent]);

  const handleCloseWindow = useCallback(async () => {
    if (isDirty) {
      await handleSaveFile('close');
    }

    setLastEvent('window-close');
    await appWindowRef.current?.close();
  }, [handleSaveFile, isDirty, setLastEvent]);

  return {
    supportsNativeWindowControls: platform.supportsNativeWindowControls,
    isFullscreen,
    isFullscreenChromeVisible,
    showFullscreenChrome,
    hideFullscreenChrome,
    handleFullscreen,
    handleTitlebarMouseDown,
    handleMinimize,
    handleToggleMaximize,
    handleCloseWindow,
  };
}
