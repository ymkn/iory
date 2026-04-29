import { CharCategory, EditorState, findClusterBreak, Text } from '@codemirror/state';
import { SearchCursor, SearchQuery } from '@codemirror/search';

type SearchRange = {
  from: number;
  to: number;
  precise: boolean;
};

type SearchQueryInternal = SearchQuery & {
  create: () => ExactStringQuery;
};

type ExactStringQuery = {
  spec: SearchQuery;
  nextMatch: (state: EditorState, curFrom: number, curTo: number) => SearchRange | null;
  prevMatch: (state: EditorState, curFrom: number, curTo: number) => SearchRange | null;
  getReplacement: (_result: SearchRange) => string;
  matchAll: (state: EditorState, limit: number) => SearchRange[] | null;
  highlight: (state: EditorState, from: number, to: number, add: (from: number, to: number) => void) => void;
};

type SearchCursorTest = (from: number, to: number, buffer: string, bufferPos: number) => boolean;

const QUERY_TYPE_SCAN_CHUNK_SIZE = 10_000;
let patched = false;

function charBefore(str: string, index: number) {
  return str.slice(findClusterBreak(str, index, false), index);
}

function charAfter(str: string, index: number) {
  return str.slice(index, findClusterBreak(str, index));
}

function stringWordTest(doc: Text, categorizer: (char: string) => CharCategory): SearchCursorTest {
  return (from, to, buffer, bufferPos) => {
    if (bufferPos > from || bufferPos + buffer.length < to) {
      bufferPos = Math.max(0, from - 2);
      buffer = doc.sliceString(bufferPos, Math.min(doc.length, to + 2));
    }

    return (
      (categorizer(charBefore(buffer, from - bufferPos)) !== CharCategory.Word || categorizer(charAfter(buffer, from - bufferPos)) !== CharCategory.Word) &&
      (categorizer(charAfter(buffer, to - bufferPos)) !== CharCategory.Word || categorizer(charBefore(buffer, to - bufferPos)) !== CharCategory.Word)
    );
  };
}

function wrapStringTest(test: NonNullable<SearchQuery['test']>, state: EditorState, inner?: SearchCursorTest): SearchCursorTest {
  return (from, to, buffer, bufferPos) => {
    if (inner && !inner(from, to, buffer, bufferPos)) {
      return false;
    }

    const match = from >= bufferPos && to <= bufferPos + buffer.length ? buffer.slice(from - bufferPos, to - bufferPos) : state.doc.sliceString(from, to);
    return test(match, state, from, to);
  };
}

function unquoteSearchText(text: string, literal: boolean) {
  return literal ? text : text.replace(/\\([nrt\\])/g, (_, ch: string) => (ch === 'n' ? '\n' : ch === 'r' ? '\r' : ch === 't' ? '\t' : '\\'));
}

function getUnquotedSearch(spec: SearchQuery) {
  return unquoteSearchText(spec.search, spec.literal);
}

function createExactSearchCursor(
  text: Text,
  query: string,
  from: number,
  to: number,
  caseSensitive: boolean,
  test?: SearchCursorTest,
) {
  const normalize = caseSensitive ? undefined : (value: string) => value.toLowerCase();
  const cursor = new SearchCursor(text, query, from, to, normalize, test);
  const exactNormalize = normalize ?? ((value: string) => value);
  Reflect.set(cursor as object, 'normalize', exactNormalize);
  Reflect.set(cursor as object, 'query', exactNormalize(query));
  return cursor;
}

function exactStringCursor(spec: SearchQueryInternal, state: EditorState, from: number, to: number) {
  let test: SearchCursorTest | undefined;
  if (spec.wholeWord) {
    test = stringWordTest(state.doc, state.charCategorizer(state.selection.main.head));
  }
  if (spec.test) {
    test = wrapStringTest(spec.test, state, test);
  }

  return createExactSearchCursor(state.doc, getUnquotedSearch(spec), from, to, spec.caseSensitive, test);
}

function createExactStringQuery(spec: SearchQueryInternal): ExactStringQuery {
  return {
    spec,
    nextMatch(state, curFrom, curTo) {
      let cursor = exactStringCursor(spec, state, curTo, state.doc.length).nextOverlapping();
      if (cursor.done) {
        const end = Math.min(state.doc.length, curFrom + getUnquotedSearch(spec).length);
        cursor = exactStringCursor(spec, state, 0, end).nextOverlapping();
      }
      return cursor.done || (cursor.value.from === curFrom && cursor.value.to === curTo) ? null : cursor.value;
    },
    prevMatch(state, curFrom, curTo) {
      const prevMatchInRange = (rangeFrom: number, rangeTo: number) => {
        for (let pos = rangeTo; ; pos -= QUERY_TYPE_SCAN_CHUNK_SIZE) {
          const start = Math.max(rangeFrom, pos - QUERY_TYPE_SCAN_CHUNK_SIZE - getUnquotedSearch(spec).length);
          const cursor = exactStringCursor(spec, state, start, pos);
          let range: SearchRange | null = null;
          while (!cursor.nextOverlapping().done) {
            range = cursor.value;
          }
          if (range) {
            return range;
          }
          if (start === rangeFrom) {
            return null;
          }
        }
      };

      let found = prevMatchInRange(0, curFrom);
      if (!found) {
        found = prevMatchInRange(Math.max(0, curTo - getUnquotedSearch(spec).length), state.doc.length);
      }
      return found && (found.from !== curFrom || found.to !== curTo) ? found : null;
    },
    getReplacement() {
      return unquoteSearchText(spec.replace, spec.literal);
    },
    matchAll(state, limit) {
      const cursor = exactStringCursor(spec, state, 0, state.doc.length);
      const ranges: SearchRange[] = [];
      while (!cursor.next().done) {
        if (ranges.length >= limit) {
          return null;
        }
        ranges.push(cursor.value);
      }
      return ranges;
    },
    highlight(state, from, to, add) {
      const searchText = getUnquotedSearch(spec);
      const cursor = exactStringCursor(spec, state, Math.max(0, from - searchText.length), Math.min(to + searchText.length, state.doc.length));
      while (!cursor.next().done) {
        add(cursor.value.from, cursor.value.to);
      }
    },
  };
}

export function applyExactCodepointSearch() {
  if (patched) {
    return;
  }

  const queryPrototype = SearchQuery.prototype as SearchQueryInternal;
  const originalCreate = queryPrototype.create;
  const originalGetCursor = queryPrototype.getCursor;

  if (typeof originalCreate !== 'function' || typeof originalGetCursor !== 'function') {
    throw new Error('CodeMirror search internals changed unexpectedly.');
  }

  queryPrototype.create = function createExactQueryType(this: SearchQuery) {
    const spec = this as SearchQueryInternal;
    return spec.regexp ? originalCreate.call(spec) : createExactStringQuery(spec);
  };

  queryPrototype.getCursor = function getExactCursor(this: SearchQuery, state: EditorState | Text, from = 0, to?: number) {
    const spec = this as SearchQueryInternal;
    if (spec.regexp) {
      return originalGetCursor.call(spec, state, from, to);
    }

    const editorState = 'doc' in state ? state : EditorState.create({ doc: state });
    const searchTo = to ?? editorState.doc.length;
    return exactStringCursor(spec, editorState, from, searchTo);
  };

  patched = true;
}
