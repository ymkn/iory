export type WorkspaceStatus = 'idle' | 'ready';

export type WorkspaceSummary = {
  rootPath: string;
  name: string;
};

export type WorkspaceNodeKind = 'file' | 'directory';

export type WorkspaceNode = {
  name: string;
  path: string;
  relativePath: string;
  kind: WorkspaceNodeKind;
  children?: WorkspaceNode[] | null;
};

export type WorkspaceScanResult = {
  rootPath: string;
  name: string;
  nodes: WorkspaceNode[];
};

export type ReadTextFileResult = {
  text: string;
  encoding: string;
  bom: string | null;
  hadDecodingErrors: boolean;
};

export type TextFileMetadata = {
  modifiedAtMs: number;
  fileSize: number;
};

export type WorkspaceFileChangedEvent = {
  rootPath: string;
  paths: string[];
};
