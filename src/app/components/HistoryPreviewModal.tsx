import { X } from 'lucide-react';
import type { FileHistoryEntry } from '../../features/history/types';
import { formatDateTime } from '../utils/format';

type HistoryPreviewModalProps = {
  previewEntry: FileHistoryEntry;
  onClose: () => void;
  onRestore: () => void;
};

export function HistoryPreviewModal({ previewEntry, onClose, onRestore }: HistoryPreviewModalProps) {
  return (
    <div className="new-file-dialog">
      <div className="settings-modal-header">
        <div>
          <p className="status-label">history preview</p>
          <p className="new-file-dialog-target">{formatDateTime(previewEntry.savedAtMs)} · {previewEntry.reason}</p>
        </div>
        <button aria-label="close history preview" className="toolbar-icon-button settings-modal-close-button" onClick={onClose} title="Close history preview" type="button">
          <X aria-hidden="true" className="toolbar-icon" size={16} />
        </button>
      </div>
      <pre className="history-preview-text">{previewEntry.text}</pre>
      <div className="overlay-actions">
        <button className="ghost-button" onClick={onClose} type="button">
          Close
        </button>
        <button className="primary-button" onClick={onRestore} type="button">
          Restore this point
        </button>
      </div>
    </div>
  );
}
