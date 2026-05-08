import { platform } from '../../platform';

export async function readTextFile(path: string) {
  return platform.files.readTextFile(path);
}

export async function getTextFileMetadata(path: string) {
  return platform.files.getTextFileMetadata(path);
}

export async function createEmptyTextFile(path: string) {
  return platform.files.createEmptyTextFile(path);
}

export async function saveDocumentAtomic(path: string, contents: string, encoding?: string, bom?: string | null) {
  return platform.files.saveDocumentAtomic(path, contents, encoding, bom);
}
