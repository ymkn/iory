import { platform } from '../../platform';
import type { ReadTextFileResult, TextFileMetadata, WorkspaceNode } from './types';
export { loadLastOpenedFile, loadLastWorkspace, loadRecentWorkspaces, persistRestoreTargets, saveLastOpenedFile, saveLastWorkspace, saveRecentWorkspaces } from './persistence';

const { invoke, openDialog } = platform;

export async function pickWorkspaceFolder() {
  return openDialog({ directory: true });
}

export async function readTextFile(path: string) {
  return invoke<ReadTextFileResult>('read_text_file', { path });
}

export async function getTextFileMetadata(path: string) {
  return invoke<TextFileMetadata>('get_text_file_metadata', { path });
}

export async function writeTextFile(path: string, contents: string, encoding?: string, bom?: string | null) {
  return invoke<void>('write_text_file', { path, contents, encoding: encoding ?? null, bom: bom ?? null });
}

export async function createEmptyTextFile(path: string) {
  return invoke<void>('create_empty_text_file', { path });
}

export async function createTextFile(rootPath: string, relativePath: string) {
  return invoke<string>('create_text_file', { rootPath, relativePath });
}

export async function createFolder(rootPath: string, relativePath: string) {
  return invoke<string>('create_folder', { rootPath, relativePath });
}

export async function renameWorkspaceEntry(rootPath: string, fromRelativePath: string, toRelativePath: string) {
  return invoke<string>('rename_workspace_entry', { rootPath, fromRelativePath, toRelativePath });
}

export async function deleteWorkspaceEntry(rootPath: string, relativePath: string) {
  return invoke<void>('delete_workspace_entry', { rootPath, relativePath });
}

export async function saveDocumentAtomic(path: string, contents: string, encoding?: string, bom?: string | null) {
  return invoke<void>('save_document_atomic', { path, contents, encoding: encoding ?? null, bom: bom ?? null });
}

export async function scanWorkspaceChildren(rootPath: string, relativePath?: string) {
  return invoke<WorkspaceNode[]>('scan_workspace_children', { rootPath, relativePath: relativePath ?? null });
}

export async function startWorkspaceWatcher(rootPath: string) {
  return invoke<void>('start_workspace_watcher', { rootPath });
}

export async function stopWorkspaceWatcher() {
  return invoke<void>('stop_workspace_watcher');
}
