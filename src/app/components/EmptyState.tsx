import { FilePlus, FolderOpen } from 'lucide-react';
import { toRecentFileLocationLabel, type RecentFileSummary } from '../../features/history/persistence';

type EmptyStateProps = {
  recentFiles: RecentFileSummary[];
  appLogoSrc: string;
  onNewFile: () => void;
  onOpenFile: () => void;
  onOpenRecentFile: (path: string) => void;
};

function renderEmptyStateLogo(appLogoSrc: string) {
  return (
    <div aria-hidden="true" className="empty-state-logo" title="IORY">
      <img alt="" className="empty-state-logo-mark" src={appLogoSrc} />
      <span className="empty-state-logo-wordmark">IORY</span>
    </div>
  );
}

export function EmptyState({ recentFiles, appLogoSrc, onNewFile, onOpenFile, onOpenRecentFile }: EmptyStateProps) {
  return (
    <section className={`empty-state${recentFiles.length === 0 ? ' is-centered' : ''}`} aria-label="empty file state">
      {renderEmptyStateLogo(appLogoSrc)}

      <div className="empty-state-actions">
        <button className="empty-state-action-button" onClick={onNewFile} type="button">
          <FilePlus aria-hidden="true" className="empty-state-action-icon" size={16} />
          <span>New File</span>
        </button>
        <button className="empty-state-action-button" onClick={onOpenFile} type="button">
          <FolderOpen aria-hidden="true" className="empty-state-action-icon" size={16} />
          <span>Open File</span>
        </button>
      </div>

      {recentFiles.length > 0 ? (
        <div className="recent-files">
          <p className="status-label">Recent files</p>
          <div className="recent-file-list">
            {recentFiles.map((file) => (
              <button className="recent-file-button" key={file.path} onClick={() => {
                onOpenRecentFile(file.path);
              }} type="button">
                <span className="recent-file-name">{file.name}</span>
                <span>{toRecentFileLocationLabel(file.path)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
