import type { FileHistoryEntry } from './types';

export const DEFAULT_CHECKPOINT_INTERVAL_MS = 300000;

type CheckpointCandidate = {
  text: string;
  encoding: string;
  bom: string | null;
};

export function shouldAppendCheckpoint(lastEntry: FileHistoryEntry | null, nextEntry: CheckpointCandidate) {
  if (!lastEntry) {
    return true;
  }

  return lastEntry.text !== nextEntry.text || lastEntry.encoding !== nextEntry.encoding || lastEntry.bom !== nextEntry.bom;
}
