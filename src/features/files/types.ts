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
