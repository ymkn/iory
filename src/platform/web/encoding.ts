import type { ReadTextFileResult } from '../../features/files/types';

function sniffBom(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { bom: 'utf-8' as const, offset: 3 };
  }

  if (bytes.length >= 2 && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff))) {
    throw new Error('The web demo supports UTF-8 text files only. Please use the desktop app for other encodings.');
  }

  return { bom: null, offset: 0 };
}

export function decodeUtf8Text(bytes: Uint8Array): ReadTextFileResult {
  const { offset, bom } = sniffBom(bytes);
  const decoder = new TextDecoder('utf-8', { fatal: true });

  try {
    const text = decoder.decode(bytes.subarray(offset));
    return {
      text,
      encoding: 'utf-8',
      bom,
      hadDecodingErrors: false,
    };
  } catch {
    throw new Error('The web demo supports UTF-8 text files only. Please use the desktop app for other encodings.');
  }
}

export function encodeUtf8Text(text: string, bom?: string | null) {
  const body = new TextEncoder().encode(text);

  if (!bom) {
    return body;
  }

  if (bom !== 'utf-8') {
    throw new Error('The web demo can only export UTF-8 files.');
  }

  const bytes = new Uint8Array(body.length + 3);
  bytes.set([0xef, 0xbb, 0xbf], 0);
  bytes.set(body, 3);
  return bytes;
}

export function utf8ByteLength(text: string, bom?: string | null) {
  return encodeUtf8Text(text, bom).byteLength;
}
