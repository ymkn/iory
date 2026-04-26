import { X } from 'lucide-react';
import type { RecentFileSummary } from '../../features/history/persistence';
import type { SaveStatus } from '../../features/editor/store';

type LeftPaneProps = {
  recentFiles: RecentFileSummary[];
  currentFilePath: string | null;
  currentFileName: string | null;
  saveStatus: SaveStatus;
  saveStatusLabel: string;
  onOpenRecentFile: (path: string) => void;
  onForgetRecentFile: (path: string) => void;
  onCloseCurrentFile: () => void;
};

export function LeftPane({
  recentFiles,
  currentFilePath,
  currentFileName,
  saveStatus,
  saveStatusLabel,
  onOpenRecentFile,
  onForgetRecentFile,
  onCloseCurrentFile,
}: LeftPaneProps) {
  return (
    <div className="side-pane-stack">
      {currentFilePath ? (
        <div className="history-current-card">
          <div className="history-current-header">
            <p className="status-label">current</p>
            <div className={`save-indicator is-${saveStatus}`}>
              <span className="save-indicator-dot" />
              <span>{saveStatusLabel}</span>
            </div>
          </div>
          <div className="history-current-row">
            <button className="workspace-tree-button is-active" type="button">
              {currentFileName}
            </button>
            <button aria-label="close current file" className="toolbar-icon-button history-inline-action" onClick={onCloseCurrentFile} title="Close file" type="button">
              <X aria-hidden="true" className="toolbar-icon" size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <section className="side-pane-card">
        <p className="status-label">recent files</p>
        {recentFiles.length > 0 ? (
          <div className="history-list">
            {recentFiles.map((file) => (
              <div className="history-recent-row" key={file.path}>
                <button className={`workspace-tree-button${currentFilePath === file.path ? ' is-active' : ''}`} onClick={() => {
                  onOpenRecentFile(file.path);
                }} type="button">
                  {file.name}
                </button>
                <button aria-label={`forget ${file.name}`} className="toolbar-icon-button history-inline-action" onClick={() => {
                  onForgetRecentFile(file.path);
                }} title="Forget file" type="button">
                  <X aria-hidden="true" className="toolbar-icon" size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : <p className="status-value history-empty-copy">Recent files will appear here.</p>}
      </section>
    </div>
  );
}
