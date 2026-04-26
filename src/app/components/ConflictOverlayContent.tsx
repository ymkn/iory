type ConflictOverlayContentProps = {
  onReloadExternal: () => void;
  onOverwriteWithCurrent: () => void;
};

export function ConflictOverlayContent({ onReloadExternal, onOverwriteWithCurrent }: ConflictOverlayContentProps) {
  return (
    <>
      <p className="status-label">external change conflict</p>
      <p className="status-value">This file changed outside the app. Auto-merge is paused so your current draft stays safe.</p>
      <div className="overlay-actions">
        <button className="primary-button" onClick={onReloadExternal} type="button">
          Reload external version
        </button>
        <button className="ghost-button" onClick={onOverwriteWithCurrent} type="button">
          Overwrite with current draft
        </button>
      </div>
    </>
  );
}
