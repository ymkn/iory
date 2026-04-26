import type { FileHistoryEntry } from '../../features/history/types';
import { countChangedLines, formatDateTime } from '../utils/format';

type CheckpointTimelinePaneProps = {
  currentFilePath: string | null;
  historyError: string | null;
  historyEntriesDescending: FileHistoryEntry[];
  onPreviewEntry: (entry: FileHistoryEntry) => void;
};

export function CheckpointTimelinePane({ currentFilePath, historyError, historyEntriesDescending, onPreviewEntry }: CheckpointTimelinePaneProps) {
  return (
    <div className="side-pane-card">
      {currentFilePath ? (
        <div>
          <p className="status-label">checkpoint timeline</p>
          {historyError ? <p className="new-file-error">{historyError}</p> : null}
          {historyEntriesDescending.length > 0 ? (
            <div className="history-list">
              {historyEntriesDescending.map((entry, index) => {
                const previousEntry = historyEntriesDescending[index + 1] ?? null;
                const changedLines = previousEntry ? countChangedLines(previousEntry.text, entry.text) : null;

                return <button className="history-entry-button" key={entry.id} onClick={() => {
                  onPreviewEntry(entry);
                }} type="button">
                  <span className="history-entry-timestamp">{formatDateTime(entry.savedAtMs)}</span>
                  {changedLines !== null ? <span className="history-entry-meta">Δ {changedLines.toLocaleString('en-US')} lines</span> : null}
                </button>;
              })}
            </div>
          ) : <p className="status-value history-empty-copy">No checkpoints yet. A new entry is added on the checkpoint timer only when the draft changed.</p>}
        </div>
      ) : (
        <p className="status-value history-empty-copy">Open a text file to start a local timeline keyed by its path.</p>
      )}
    </div>
  );
}
