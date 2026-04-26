import { beforeEach, describe, expect, it } from 'vitest';
import { loadLastOpenedFile, loadLastWorkspace, persistRestoreTargets, saveLastOpenedFile, saveLastWorkspace } from './persistence';

describe('workspace persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores and loads the last workspace and file', () => {
    saveLastWorkspace('C:/work/book');
    saveLastOpenedFile('C:/work/book/chapter-1.md');

    expect(loadLastWorkspace()).toBe('C:/work/book');
    expect(loadLastOpenedFile()).toBe('C:/work/book/chapter-1.md');
  });

  it('does not wipe restore targets before persistence is ready', () => {
    saveLastWorkspace('C:/work/book');
    saveLastOpenedFile('C:/work/book/chapter-1.md');

    persistRestoreTargets({
      isReady: false,
      workspaceRootPath: null,
      filePath: null,
    });

    expect(loadLastWorkspace()).toBe('C:/work/book');
    expect(loadLastOpenedFile()).toBe('C:/work/book/chapter-1.md');
  });

  it('updates restore targets after persistence becomes ready', () => {
    persistRestoreTargets({
      isReady: true,
      workspaceRootPath: 'C:/work/book',
      filePath: 'C:/work/book/chapter-2.md',
    });

    expect(loadLastWorkspace()).toBe('C:/work/book');
    expect(loadLastOpenedFile()).toBe('C:/work/book/chapter-2.md');
  });

  it('clears restore targets when ready state saves nulls explicitly', () => {
    saveLastWorkspace('C:/work/book');
    saveLastOpenedFile('C:/work/book/chapter-1.md');

    persistRestoreTargets({
      isReady: true,
      workspaceRootPath: null,
      filePath: null,
    });

    expect(loadLastWorkspace()).toBeNull();
    expect(loadLastOpenedFile()).toBeNull();
  });
});
