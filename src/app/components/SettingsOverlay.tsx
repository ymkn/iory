import { X } from 'lucide-react';
import { SettingsPanel } from '../../features/settings/components/SettingsPanel';

type SettingsOverlayProps = {
  isDesktopSettingsPane: boolean;
  onClose: () => void;
};

export function SettingsOverlay({ isDesktopSettingsPane, onClose }: SettingsOverlayProps) {
  return (
    <div className={`settings-modal${isDesktopSettingsPane ? ' settings-modal-docked' : ''}`}>
      <div className="settings-modal-header">
        <p className="status-label">settings</p>
        <button aria-label="close settings" className="toolbar-icon-button settings-modal-close-button" onClick={onClose} title="Close settings" type="button">
          <X aria-hidden="true" className="toolbar-icon" size={16} />
        </button>
      </div>
      <SettingsPanel compact={isDesktopSettingsPane} />
    </div>
  );
}
