import { EditorState } from '@codemirror/state';
import { SearchQuery } from '@codemirror/search';
import { describe, expect, it } from 'vitest';
import { applyExactCodepointSearch } from './search-patch';

applyExactCodepointSearch();

type SearchMatch = {
  from: number;
  to: number;
};

function collectMatches(query: SearchQuery, state: EditorState) {
  const matches: SearchMatch[] = [];
  for (const match of query.getCursor(state) as unknown as Iterable<SearchMatch & { precise: boolean }>) {
    matches.push({ from: match.from, to: match.to });
  }
  return matches;
}

describe('applyExactCodepointSearch', () => {
  it('does not match half-width space against full-width space', () => {
    const state = EditorState.create({ doc: 'a b\na　b' });

    expect(collectMatches(new SearchQuery({ search: 'a b' }), state)).toEqual([{ from: 0, to: 3 }]);
    expect(collectMatches(new SearchQuery({ search: 'a　b' }), state)).toEqual([{ from: 4, to: 7 }]);
  });

  it('does not fold other compatibility characters into ascii equivalents', () => {
    const state = EditorState.create({ doc: 'x,y\nx，y' });

    expect(collectMatches(new SearchQuery({ search: 'x,y' }), state)).toEqual([{ from: 0, to: 3 }]);
    expect(collectMatches(new SearchQuery({ search: 'x，y' }), state)).toEqual([{ from: 4, to: 7 }]);
  });

  it('preserves case-insensitive plain string search', () => {
    const state = EditorState.create({ doc: 'Alpha\nalpha' });

    expect(collectMatches(new SearchQuery({ search: 'alpha', caseSensitive: false }), state)).toEqual([
      { from: 0, to: 5 },
      { from: 6, to: 11 },
    ]);
  });

  it('leaves regular expression search behavior unchanged', () => {
    const state = EditorState.create({ doc: 'abc\naXc' });

    expect(collectMatches(new SearchQuery({ search: 'a.c', regexp: true }), state)).toEqual([
      { from: 0, to: 3 },
      { from: 4, to: 7 },
    ]);
  });
});
