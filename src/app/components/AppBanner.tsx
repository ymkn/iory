import type { SaveStatus } from '../../features/editor/store';

type AppBannerProps = {
  message: string;
  isVisible: boolean;
  saveStatus: SaveStatus;
  isConflictOpen: boolean;
};

export function AppBanner({ message, isVisible, saveStatus, isConflictOpen }: AppBannerProps) {
  return (
    <div
      aria-live={saveStatus === 'error' || isConflictOpen ? 'assertive' : 'polite'}
      className={`editor-error-banner-layer${isVisible ? ' is-visible' : ''}`}
      role={saveStatus === 'error' || isConflictOpen ? 'alert' : 'status'}
    >
      <p className={`editor-error-banner${isConflictOpen ? ' is-conflict' : ''}`}>{message}</p>
    </div>
  );
}
