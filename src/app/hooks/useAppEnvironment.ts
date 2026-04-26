import { useEffect } from 'react';

type UseAppEnvironmentArgs = {
  isFocusMode: boolean;
  closeHoverOverlayPanel: () => void;
  hydrate: () => Promise<void>;
  themeId: string;
  backgroundMode: string;
  showBackgroundImage: boolean;
  uiFontFamily: string;
  editorFontFamily: string;
  fontSize: number;
  lineHeight: number;
  editorMaxWidth: number;
};

export function useAppEnvironment({
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
}: UseAppEnvironmentArgs) {
  useEffect(() => {
    if (!isFocusMode) {
      closeHoverOverlayPanel();
    }
  }, [closeHoverOverlayPanel, isFocusMode]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
    document.documentElement.dataset.backgroundMode = backgroundMode;
    document.documentElement.dataset.backgroundImage = showBackgroundImage ? 'visible' : 'hidden';
    document.documentElement.style.setProperty('--ui-font-family', uiFontFamily);
    document.documentElement.style.setProperty('--editor-font-family', editorFontFamily);
    document.documentElement.style.setProperty('--editor-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--editor-line-height', String(lineHeight));
    document.documentElement.style.setProperty('--editor-max-width', `${editorMaxWidth}px`);
  }, [backgroundMode, editorFontFamily, editorMaxWidth, fontSize, lineHeight, showBackgroundImage, themeId, uiFontFamily]);
}
