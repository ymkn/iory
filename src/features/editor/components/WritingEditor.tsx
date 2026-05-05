import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { search, searchKeymap } from '@codemirror/search';
import { Annotation, Compartment, EditorSelection, EditorState } from '@codemirror/state';
import { drawSelection, EditorView, keymap } from '@codemirror/view';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { applyExactCodepointSearch } from '../search-patch';

applyExactCodepointSearch();

type WritingEditorProps = {
  value: string;
  cursorStyle: 'line' | 'block';
  fontSize: number;
  lineHeight: number;
  initialSnapshot?: WritingEditorSnapshot | null;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
  onManualSave: () => void;
};

export type WritingEditorSnapshot = {
  selection: Array<{
    anchor: number;
    head: number;
  }>;
  mainIndex: number;
  scrollTop: number;
  scrollLeft: number;
};

export type WritingEditorHandle = {
  captureSnapshot: () => WritingEditorSnapshot | null;
  focus: () => void;
  restoreInputAnchor: () => void;
};

const themeCompartment = new Compartment();
const externalChangeAnnotation = Annotation.define<boolean>();

/**
 * Handles Enter on lines whose leading whitespace contains non-ASCII characters
 * (e.g. full-width spaces U+3000). CodeMirror's default insertNewlineAndIndent
 * reconstructs indentation from a column count via indentString, which only
 * produces ASCII spaces/tabs — destroying non-ASCII whitespace.
 */
function handleNewlinePreserveIndent(view: EditorView): boolean {
  const { state } = view;
  if (state.readOnly) return false;

  let hasNonAsciiIndent = false;
  for (const range of state.selection.ranges) {
    const line = state.doc.lineAt(range.from);
    const leading = /^\s*/.exec(line.text)![0];
    if (leading && /[^\t ]/.test(leading)) {
      hasNonAsciiIndent = true;
      break;
    }
  }

  if (!hasNonAsciiIndent) return false;

  view.dispatch(
    state.update(
      state.changeByRange((range) => {
        const line = state.doc.lineAt(range.from);
        const leading = /^\s*/.exec(line.text)![0];
        const insert = state.lineBreak + leading;
        return {
          changes: { from: range.from, to: range.to, insert },
          range: EditorSelection.cursor(range.from + leading.length + 1),
        };
      }),
      { scrollIntoView: true, userEvent: "input.type" },
    ),
  );

  return true;
}

function buildTheme(fontSize: number, lineHeight: number, cursorStyle: 'line' | 'block') {
  const blockCursorWidth = `${Math.max(8, Math.round(fontSize * 0.62))}px`;

  return EditorView.theme({
    '&': {
      height: '100%',
      backgroundColor: 'transparent',
      color: 'var(--text-primary)',
      fontSize: `${fontSize}px`,
    },
    '.cm-scroller': {
      fontFamily: 'var(--editor-font-family), var(--editor-cjk-monospace-fallback)',
      fontFeatureSettings: '"palt" 0, "pkna" 0, "halt" 0, "vhal" 0, "kern" 0, "liga" 0, "calt" 0',
      fontKerning: 'none',
      fontVariantEastAsian: 'normal',
      fontVariantLigatures: 'none',
      letterSpacing: 'normal',
      lineHeight: String(lineHeight),
      overflow: 'auto',
      textAutospace: 'no-autospace',
      textSpacingTrim: 'space-all',
    },
    '.cm-content': {
      minHeight: 'var(--editor-min-height)',
      paddingTop: '0',
      paddingRight: '0',
      paddingBottom: '0',
      paddingLeft: '0',
      caretColor: 'var(--text-primary)',
    },
    '.cm-line': {
      padding: '0',
    },
    '.cm-gutters': {
      display: 'none',
    },
    '.cm-activeLine': {
      backgroundColor: 'transparent',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--selection-background)',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    ...(cursorStyle === 'block'
      ? {
          '&.cm-focused .cm-cursor': {
            borderLeft: 'none',
            borderRadius: '1px',
            backgroundColor: 'color-mix(in srgb, var(--text-primary) 82%, transparent)',
            width: blockCursorWidth,
          },
          '&.cm-focused .cm-cursor-primary': {
            marginLeft: '0',
          },
        }
      : {}),
  });
}

export const WritingEditor = forwardRef<WritingEditorHandle, WritingEditorProps>(function WritingEditor(props, ref) {
  const { value, cursorStyle, fontSize, initialSnapshot, lineHeight, onChange, onFocus, onBlur, onCompositionStart, onCompositionEnd, onManualSave } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const latestValueRef = useRef(value);
  const isComposingRef = useRef(false);
  const latestCallbacksRef = useRef({ onChange, onFocus, onBlur, onCompositionStart, onCompositionEnd, onManualSave });

  useEffect(() => {
    latestCallbacksRef.current = { onChange, onFocus, onBlur, onCompositionStart, onCompositionEnd, onManualSave };
  }, [onBlur, onChange, onCompositionEnd, onCompositionStart, onFocus, onManualSave]);

  useImperativeHandle(
    ref,
    () => ({
      captureSnapshot: () => {
        const view = viewRef.current;

        if (!view) {
          return null;
        }

        return {
          selection: view.state.selection.ranges.map((range) => ({
            anchor: range.anchor,
            head: range.head,
          })),
          mainIndex: view.state.selection.mainIndex,
          scrollTop: view.scrollDOM.scrollTop,
          scrollLeft: view.scrollDOM.scrollLeft,
        };
      },
      focus: () => {
        viewRef.current?.focus();
      },
      restoreInputAnchor: () => {
        const view = viewRef.current;

        if (!view) {
          return;
        }

        const currentSelection = view.state.selection.main;
        const ownerDocument = view.dom.ownerDocument;

        view.focus();
        view.dispatch({
          selection: EditorSelection.create([EditorSelection.cursor(currentSelection.head, currentSelection.assoc)]),
          scrollIntoView: true,
          annotations: externalChangeAnnotation.of(true),
        });
        view.focus();

        ownerDocument.defaultView?.setTimeout(() => {
          try {
            if (!ownerDocument.hasFocus()) {
              return;
            }

            view.contentDOM.focus();

            const domPosition = view.domAtPos(view.state.selection.main.head);
            const selection = ownerDocument.getSelection();

            if (!selection) {
              return;
            }

            const range = ownerDocument.createRange();
            range.setStart(domPosition.node, domPosition.offset);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            view.focus();
          } catch {
            view.focus();
          }
        }, 0);
      },
    }),
    [],
  );

  useEffect(() => {
    if (!hostRef.current || viewRef.current) {
      return;
    }

    const selection = initialSnapshot
      ? EditorSelection.create(
          initialSnapshot.selection.map((range) => EditorSelection.range(range.anchor, range.head)),
          initialSnapshot.mainIndex,
        )
      : undefined;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        selection,
        extensions: [
          history(),
          search(),
          markdown(),
          keymap.of([
            { key: "Enter", run: handleNewlinePreserveIndent, shift: handleNewlinePreserveIndent },
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
          ]),
          EditorView.lineWrapping,
          drawSelection(),
          themeCompartment.of(buildTheme(fontSize, lineHeight, cursorStyle)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !update.transactions.some((transaction) => transaction.annotation(externalChangeAnnotation))) {
              const nextValue = update.state.doc.toString();
              latestValueRef.current = nextValue;
              latestCallbacksRef.current.onChange(nextValue);
            }
          }),
          EditorView.domEventHandlers({
            focus: () => {
              latestCallbacksRef.current.onFocus();
            },
            blur: () => {
              latestCallbacksRef.current.onBlur();
            },
            compositionstart: () => {
              isComposingRef.current = true;
              latestCallbacksRef.current.onCompositionStart();
            },
            compositionend: () => {
              isComposingRef.current = false;
              latestCallbacksRef.current.onCompositionEnd();
            },
            keydown: (event) => {
              if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                event.preventDefault();
                latestCallbacksRef.current.onManualSave();
                return true;
              }

              return false;
            },
          }),
        ],
      }),
      parent: hostRef.current,
    });

    viewRef.current = view;
    view.focus();

    if (initialSnapshot) {
      const restoreScrollPosition = () => {
        view.scrollDOM.scrollTop = initialSnapshot.scrollTop;
        view.scrollDOM.scrollLeft = initialSnapshot.scrollLeft;
      };

      view.requestMeasure({
        read: () => null,
        write: restoreScrollPosition,
      });
      view.dom.ownerDocument.defaultView?.setTimeout(restoreScrollPosition, 0);
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The editor instance must be created only once; re-creating it on prop changes breaks IME composition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    view.dispatch({
      effects: themeCompartment.reconfigure(buildTheme(fontSize, lineHeight, cursorStyle)),
    });
  }, [cursorStyle, fontSize, lineHeight]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view || view.state.doc.toString() === value || isComposingRef.current) {
      return;
    }

    const currentSelection = view.state.selection;

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
      selection: currentSelection,
      annotations: externalChangeAnnotation.of(true),
    });

    latestValueRef.current = value;
  }, [value]);

  return <div className="writing-editor-host" ref={hostRef} />;
});
