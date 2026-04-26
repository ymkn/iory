import type { WorkspaceSummary } from './types';
import { loadLastOpenedFile, saveLastOpenedFile } from '../history/persistence';

const RECENT_WORKSPACES_STORAGE_KEY = 'iory.recent-workspaces';
const LAST_WORKSPACE_STORAGE_KEY = 'iory.last-workspace';

export type RestorePersistenceState = {
  isReady: boolean;
  workspaceRootPath: string | null;
  filePath: string | null;
};

function getStorage() {
  return window.localStorage;
}

export function loadRecentWorkspaces() {
  const raw = getStorage().getItem(RECENT_WORKSPACES_STORAGE_KEY);

  if (!raw) {
    return [] as WorkspaceSummary[];
  }

  try {
    return JSON.parse(raw) as WorkspaceSummary[];
  } catch {
    return [] as WorkspaceSummary[];
  }
}

export function saveRecentWorkspaces(workspaces: WorkspaceSummary[]) {
  getStorage().setItem(RECENT_WORKSPACES_STORAGE_KEY, JSON.stringify(workspaces));
}

export function loadLastWorkspace() {
  return getStorage().getItem(LAST_WORKSPACE_STORAGE_KEY);
}

export function saveLastWorkspace(rootPath: string | null) {
  if (!rootPath) {
    getStorage().removeItem(LAST_WORKSPACE_STORAGE_KEY);
    return;
  }

  getStorage().setItem(LAST_WORKSPACE_STORAGE_KEY, rootPath);
}

export { loadLastOpenedFile, saveLastOpenedFile };

export function persistRestoreTargets({ isReady, workspaceRootPath, filePath }: RestorePersistenceState) {
  if (!isReady) {
    return;
  }

  saveLastWorkspace(workspaceRootPath);
  saveLastOpenedFile(filePath);
}
