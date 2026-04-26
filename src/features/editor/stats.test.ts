import { describe, expect, it } from 'vitest';
import { calculateDocumentStats } from './stats';

describe('calculateDocumentStats', () => {
  it('calculates characters, lines, and paragraphs for simple text', () => {
    expect(calculateDocumentStats('雪\n空')).toEqual({
      characters: 3,
      words: 2,
      lines: 2,
      paragraphs: 1,
    });
  });

  it('counts paragraphs separated by blank lines while ignoring whitespace-only segments', () => {
    expect(calculateDocumentStats('第一段落\n\n  \n第二段落\n\n第三段落')).toEqual({
      characters: 19,
      words: 3,
      lines: 6,
      paragraphs: 3,
    });
  });

  it('treats empty text as one empty line and zero paragraphs', () => {
    expect(calculateDocumentStats('')).toEqual({
      characters: 0,
      words: 0,
      lines: 1,
      paragraphs: 0,
    });
  });

  it('counts words by whitespace-separated segments', () => {
    expect(calculateDocumentStats('one two\nthree   four')).toEqual({
      characters: 20,
      words: 4,
      lines: 2,
      paragraphs: 1,
    });
  });
});
