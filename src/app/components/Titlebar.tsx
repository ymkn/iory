import { Columns3, Download, FilePlus, FolderOpen, Maximize, Settings } from 'lucide-react';
import type { MouseEvent as ReactMouseEvent } from 'react';

type TitlebarProps = {
  showDownloadButton: boolean;
  showWindowControls: boolean;
  isFullscreen: boolean;
  isFullscreenChromeVisible: boolean;
  currentFileName: string | null;
  isFocusMode: boolean;
  appLogoSrc: string;
  onMouseLeave: () => void;
  onTitlebarMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onNewFile: () => void;
  onOpenFile: () => void;
  onDownloadFile: () => void;
  onToggleFocusMode: () => void;
  onOpenSettings: () => void;
  onToggleFullscreen: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onCloseWindow: () => void;
};

function renderToolbarIcon(icon: 'focus' | 'settings' | 'fullscreen') {
  switch (icon) {
    case 'focus':
      return <Columns3 aria-hidden="true" className="toolbar-icon" size={16} />;
    case 'settings':
      return <Settings aria-hidden="true" className="toolbar-icon" size={16} />;
    case 'fullscreen':
      return <Maximize aria-hidden="true" className="toolbar-icon" size={16} />;
  }
}

export function Titlebar({
  showDownloadButton,
  showWindowControls,
  isFullscreen,
  isFullscreenChromeVisible,
  currentFileName,
  isFocusMode,
  appLogoSrc,
  onMouseLeave,
  onTitlebarMouseDown,
  onNewFile,
  onOpenFile,
  onDownloadFile,
  onToggleFocusMode,
  onOpenSettings,
  onToggleFullscreen,
  onMinimize,
  onToggleMaximize,
  onCloseWindow,
}: TitlebarProps) {
  return (
    <header className={`titlebar${isFullscreen ? ' is-fullscreen' : ''}${isFullscreenChromeVisible ? ' is-visible' : ''}`} onMouseLeave={onMouseLeave}>
      <div className="titlebar-surface">
        <div aria-label="window drag handle" className="titlebar-drag-handle" onMouseDown={onTitlebarMouseDown}>
          <div className="titlebar-copy">
            <span aria-hidden="true" className="titlebar-app-icon-wrap">
              <img alt="" className="titlebar-app-icon" src={appLogoSrc} />
            </span>
            <p className={`titlebar-title${currentFileName ? '' : ' titlebar-title-app-name'}`}>{currentFileName ?? 'IORY'}</p>
          </div>
        </div>

        <div className="titlebar-actions">
          <button aria-label="create new file" className="toolbar-icon-button" onClick={onNewFile} title="New file" type="button">
            <FilePlus aria-hidden="true" className="toolbar-icon" size={16} />
          </button>
          <button aria-label="open file" className="toolbar-icon-button" onClick={onOpenFile} title="Open file" type="button">
            <FolderOpen aria-hidden="true" className="toolbar-icon" size={16} />
          </button>
          {showDownloadButton ? (
            <button aria-label="download file" className="toolbar-icon-button" onClick={onDownloadFile} title="Download file" type="button">
              <Download aria-hidden="true" className="toolbar-icon" size={16} />
            </button>
          ) : null}
          <button aria-label={isFocusMode ? 'turn focus off' : 'turn focus on'} className={`toolbar-icon-button${!isFocusMode ? ' is-active' : ''}`} onClick={onToggleFocusMode} title={isFocusMode ? 'focus off' : 'focus on'} type="button">
            {renderToolbarIcon('focus')}
          </button>
          <button aria-label="open settings" className="toolbar-icon-button" onClick={onOpenSettings} title="Settings" type="button">
            {renderToolbarIcon('settings')}
          </button>
          <button aria-label="toggle fullscreen" className="toolbar-icon-button" onClick={onToggleFullscreen} title="Fullscreen" type="button">
            {renderToolbarIcon('fullscreen')}
          </button>
        </div>
      </div>

      {showWindowControls ? (
        <div className="window-controls" aria-label="window controls">
          <button className="window-control" onClick={onMinimize} type="button">
            —
          </button>
          <button className="window-control" onClick={onToggleMaximize} type="button">
            □
          </button>
          <button className="window-control window-control-close" onClick={onCloseWindow} type="button">
            ×
          </button>
        </div>
      ) : null}
    </header>
  );
}
