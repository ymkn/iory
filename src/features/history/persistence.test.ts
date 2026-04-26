import { beforeEach, describe, expect, it } from 'vitest';
import { loadLastOpenedFile, loadRecentFiles, rememberRecentFile, removeRecentFile, saveLastOpenedFile } from './persistence';

describe('history persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores and loads the last opened file', () => {
    saveLastOpenedFile('C:/drafts/chapter-1.md');

    expect(loadLastOpenedFile()).toBe('C:/drafts/chapter-1.md');
  });

  it('keeps recent files unique and newest-first', () => {
    rememberRecentFile('C:/drafts/chapter-1.md');
    const files = rememberRecentFile('C:/drafts/chapter-2.md');
    const deduped = rememberRecentFile('C:/drafts/chapter-1.md');

    expect(files).toHaveLength(2);
    expect(deduped.map((item) => item.path)).toEqual(['C:/drafts/chapter-1.md', 'C:/drafts/chapter-2.md']);
  });

  it('removes a file from recents', () => {
    rememberRecentFile('C:/drafts/chapter-1.md');
    rememberRecentFile('C:/drafts/chapter-2.md');

    const nextFiles = removeRecentFile('C:/drafts/chapter-1.md');

    expect(nextFiles.map((item) => item.path)).toEqual(['C:/drafts/chapter-2.md']);
    expect(loadRecentFiles().map((item) => item.path)).toEqual(['C:/drafts/chapter-2.md']);
  });
});
