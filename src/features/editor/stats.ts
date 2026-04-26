export type DocumentStats = {
  characters: number;
  words: number;
  lines: number;
  paragraphs: number;
};

export function calculateDocumentStats(text: string): DocumentStats {
  const words = text.trim().length > 0 ? text.trim().split(/\s+/).filter(Boolean).length : 0;

  return {
    characters: text.length,
    words,
    lines: text.split('\n').length,
    paragraphs: text
      .split(/\n\s*\n/g)
      .map((segment) => segment.trim())
      .filter(Boolean).length,
  };
}
