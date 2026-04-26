import { X } from 'lucide-react';
import type { FileHistoryEntry } from '../../features/history/types';
import { formatDateTime } from '../utils/format';

type RestoreConfirmModalProps = {
  restoreTargetEntry: FileHistoryEntry;
  onClose: () => void;
  onConfirm: () => void;
};

export function RestoreConfirmModal({ restoreTargetEntry, onClose, onConfirm }: RestoreConfirmModalProps) {
  return (
    <div className="new-file-dialog">
      <div className="settings-modal-header">
        <p className="status-label">restore snapshot</p>
        <button aria-label="close restore dialog" className="toolbar-icon-button settings-modal-close-button" onClick={onClose} title="Close restore dialog" type="button">
          <X aria-hidden="true" className="toolbar-icon" size={16} />
        </button>
      </div>
      <p className="new-file-dialog-target">Restore {formatDateTime(restoreTargetEntry.savedAtMs)}?</p>
      <p className="status-value">This rewrites the file on disk, discards every newer snapshot, and creates a new latest restore entry with this content.</p>
      <div className="overlay-actions">
        <button className="ghost-button" onClick={onClose} type="button">
          Cancel
        </button>
        <button className="primary-button" onClick={onConfirm} type="button">
          Confirm restore
        </button>
      </div>
    </div>
  );
}
