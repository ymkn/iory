import { useEffect, useState } from 'react';
import { useEditorStore } from '../../features/editor/store';

const TRANSIENT_BANNER_DURATION_MS = 4000;
const BANNER_FADE_DURATION_MS = 1000;

type UseTransientBannerArgs = {
  loadError: string | null;
  saveStatus: 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict';
  setLoadError: (message: string | null) => void;
};

export function useTransientBanner({ loadError, saveStatus, setLoadError }: UseTransientBannerArgs) {
  const [renderedBannerMessage, setRenderedBannerMessage] = useState<string | null>(null);
  const [isBannerVisible, setIsBannerVisible] = useState(false);

  useEffect(() => {
    if (!loadError) {
      return;
    }

    if (saveStatus === 'error' || saveStatus === 'conflict') {
      return;
    }

    const timer = window.setTimeout(() => {
      const currentState = useEditorStore.getState();

      if (currentState.loadError === loadError && currentState.saveStatus === saveStatus) {
        setLoadError(null);
      }
    }, TRANSIENT_BANNER_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadError, saveStatus, setLoadError]);

  useEffect(() => {
    let visibilityTimer: number | undefined;
    let unmountTimer: number | undefined;

    if (loadError) {
      visibilityTimer = window.setTimeout(() => {
        setRenderedBannerMessage(loadError);
      }, 0);

      const showTimer = window.setTimeout(() => {
        setIsBannerVisible(true);
      }, 10);

      return () => {
        window.clearTimeout(visibilityTimer);
        window.clearTimeout(showTimer);
      };
    }

    if (renderedBannerMessage) {
      visibilityTimer = window.setTimeout(() => {
        setIsBannerVisible(false);
      }, 0);

      unmountTimer = window.setTimeout(() => {
        setRenderedBannerMessage(null);
      }, BANNER_FADE_DURATION_MS);
    }

    return () => {
      if (visibilityTimer !== undefined) {
        window.clearTimeout(visibilityTimer);
      }

      if (unmountTimer !== undefined) {
        window.clearTimeout(unmountTimer);
      }
    };
  }, [loadError, renderedBannerMessage]);

  return {
    renderedBannerMessage,
    isBannerVisible,
  };
}
