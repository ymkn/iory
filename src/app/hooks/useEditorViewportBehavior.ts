import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { WritingEditorHandle, WritingEditorSnapshot } from '../../features/editor/components/WritingEditor';

type EditorRestoreState = {
  epoch: number;
  snapshot: WritingEditorSnapshot | null;
} | null;

type UseEditorViewportBehaviorArgs = {
  editorRef: RefObject<WritingEditorHandle | null>;
  isComposing: boolean;
  setLastEvent: (event: string) => void;
};

export function useEditorViewportBehavior({ editorRef, isComposing, setLastEvent }: UseEditorViewportBehaviorArgs) {
  const editorEpochRef = useRef(0);
  const editorRemountReasonRef = useRef<string | null>(null);
  const hasMountedEditorEpochRef = useRef(false);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const [editorRestoreState, setEditorRestoreState] = useState<EditorRestoreState>(null);
  const isWindowsPlatform = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');

  const refocusTextarea = useCallback((reason: string) => {
    window.setTimeout(() => {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      editor.restoreInputAnchor();
      setLastEvent(`refocus:${reason}`);
    }, 0);
  }, [editorRef, setLastEvent]);

  const requestEditorRemount = useCallback((reason: string, snapshot?: WritingEditorSnapshot | null) => {
    const nextEpoch = editorEpochRef.current + 1;

    editorRemountReasonRef.current = reason;
    setEditorRestoreState({
      epoch: nextEpoch,
      snapshot: snapshot === undefined ? editorRef.current?.captureSnapshot() ?? null : snapshot,
    });
    setEditorEpoch(nextEpoch);
  }, [editorRef]);

  useEffect(() => {
    let resizeTimer: number | null = null;

    const handleResize = () => {
      if (isComposing || !document.hasFocus()) {
        return;
      }

      if (resizeTimer !== null) {
        window.clearTimeout(resizeTimer);
      }

      resizeTimer = window.setTimeout(() => {
        if (isWindowsPlatform) {
          if (editorRef.current) {
            requestEditorRemount('after-window-resize');
          }
        } else {
          refocusTextarea('after-window-resize');
        }

        resizeTimer = null;
      }, 80);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer !== null) {
        window.clearTimeout(resizeTimer);
      }
    };
  }, [editorRef, isComposing, isWindowsPlatform, refocusTextarea, requestEditorRemount]);

  useEffect(() => {
    editorEpochRef.current = editorEpoch;
  }, [editorEpoch]);

  useEffect(() => {
    if (!hasMountedEditorEpochRef.current) {
      hasMountedEditorEpochRef.current = true;
      return;
    }

    const reason = editorRemountReasonRef.current ?? 'after-editor-remount';
    const timer = window.setTimeout(() => {
      editorRef.current?.focus();
      setLastEvent(`editor:remount:${reason}`);
      editorRemountReasonRef.current = null;
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [editorEpoch, editorRef, setLastEvent]);

  return {
    editorEpoch,
    editorRestoreState,
    refocusTextarea,
    requestEditorRemount,
  };
}
