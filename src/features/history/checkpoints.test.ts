import { describe, expect, it } from 'vitest';
import { shouldAppendCheckpoint } from './checkpoints';
import type { FileHistoryEntry } from './types';

function createEntry(overrides: Partial<FileHistoryEntry> = {}): FileHistoryEntry {
  return {
    id: 'entry-1',
    filePath: 'C:/drafts/chapter-1.md',
    savedAtMs: 1,
    reason: 'checkpoint',
    text: 'hello',
    encoding: 'utf-8',
    bom: null,
    modifiedAtMs: 1,
    fileSize: 5,
    editorSnapshot: null,
    ...overrides,
  };
}

describe('shouldAppendCheckpoint', () => {
  it('appends when there is no prior history entry', () => {
    expect(shouldAppendCheckpoint(null, { text: 'hello', encoding: 'utf-8', bom: null })).toBe(true);
  });

  it('skips when the text, encoding, and bom are unchanged', () => {
    expect(shouldAppendCheckpoint(createEntry(), { text: 'hello', encoding: 'utf-8', bom: null })).toBe(false);
  });

  it('appends when the text changed', () => {
    expect(shouldAppendCheckpoint(createEntry(), { text: 'hello world', encoding: 'utf-8', bom: null })).toBe(true);
  });
});
