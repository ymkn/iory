export type RecentFileSummary = {
  path: string;
  name: string;
  lastOpenedAtMs: number;
};

const RECENT_FILES_STORAGE_KEY = 'iory.recent-files';
const LAST_FILE_STORAGE_KEY = 'iory.last-file';
const MAX_RECENT_FILES = 8;

function getStorage() {
  return window.localStorage;
}

export function toFileName(path: string) {
  return path.split(/[/\\]/).filter(Boolean).at(-1) ?? path;
}

export function isBrowserDocumentPath(path: string) {
  return path.startsWith('web-document://');
}

export function toRecentFileLocationLabel(path: string) {
  if (isBrowserDocumentPath(path)) {
    return 'In this browser';
  }

  const name = toFileName(path);
  return path.slice(0, Math.max(0, path.length - name.length));
}

export function loadRecentFiles() {
  const raw = getStorage().getItem(RECENT_FILES_STORAGE_KEY);

  if (!raw) {
    return [] as RecentFileSummary[];
  }

  try {
    const parsed = JSON.parse(raw) as RecentFileSummary[];
    return parsed.filter((item) => typeof item.path === 'string' && typeof item.name === 'string' && typeof item.lastOpenedAtMs === 'number');
  } catch {
    return [] as RecentFileSummary[];
  }
}

export function saveRecentFiles(files: RecentFileSummary[]) {
  getStorage().setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(files));
}

export function rememberRecentFile(path: string) {
  const nextFiles = [
    {
      path,
      name: toFileName(path),
      lastOpenedAtMs: Date.now(),
    },
    ...loadRecentFiles().filter((item) => item.path !== path),
  ].slice(0, MAX_RECENT_FILES);

  saveRecentFiles(nextFiles);
  return nextFiles;
}

export function removeRecentFile(path: string) {
  const nextFiles = loadRecentFiles().filter((item) => item.path !== path);
  saveRecentFiles(nextFiles);
  return nextFiles;
}

export function loadLastOpenedFile() {
  return getStorage().getItem(LAST_FILE_STORAGE_KEY);
}

export function saveLastOpenedFile(filePath: string | null) {
  if (!filePath) {
    getStorage().removeItem(LAST_FILE_STORAGE_KEY);
    return;
  }

  getStorage().setItem(LAST_FILE_STORAGE_KEY, filePath);
}
