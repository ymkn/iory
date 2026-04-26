import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react';

type WritingWorkspaceProps = {
  isFocusMode: boolean;
  isSidePanesVisible: boolean;
  editorFrameStyle: CSSProperties;
  leftPane: ReactNode;
  rightPane: ReactNode;
  editor: ReactNode;
  onWorkspaceMouseLeave: () => void;
  onEditorColumnMouseEnter: () => void;
  onEditorFrameMouseDownCapture: (event: ReactMouseEvent<HTMLElement>) => void;
  onOpenLeftPane: () => void;
  onLeftPaneHoverEnter: () => void;
  onOpenRightPane: () => void;
  onRightPaneHoverEnter: () => void;
};

export function WritingWorkspace({
  isFocusMode,
  isSidePanesVisible,
  editorFrameStyle,
  leftPane,
  rightPane,
  editor,
  onWorkspaceMouseLeave,
  onEditorColumnMouseEnter,
  onEditorFrameMouseDownCapture,
  onOpenLeftPane,
  onLeftPaneHoverEnter,
  onOpenRightPane,
  onRightPaneHoverEnter,
}: WritingWorkspaceProps) {
  return (
    <div className={`workspace-layout${isFocusMode ? ' is-focus' : ''}`} onMouseLeave={onWorkspaceMouseLeave}>
      <section className={`editor-frame${isFocusMode ? ' is-focus' : ''}`} aria-label="writing view editor frame" onMouseDownCapture={onEditorFrameMouseDownCapture} style={editorFrameStyle}>
        <div className={`editor-focus-layout${isFocusMode ? ' is-focus' : ''}${isSidePanesVisible ? ' has-side-panes' : ''}`}>
          <aside className={`editor-side-pane is-left${isSidePanesVisible ? ' is-visible' : ''}${!isSidePanesVisible ? ' is-collapsed' : ''}`} onMouseEnter={onLeftPaneHoverEnter}>
            {!isSidePanesVisible ? <button aria-label="open left pane" className="focus-margin-trigger is-left" onFocus={onOpenLeftPane} onMouseEnter={onLeftPaneHoverEnter} type="button" /> : null}
            {leftPane}
          </aside>

          <div className="editor-core-column" onMouseEnter={onEditorColumnMouseEnter}>
            {editor}
          </div>

          <aside className={`editor-side-pane is-right${isSidePanesVisible ? ' is-visible' : ''}${!isSidePanesVisible ? ' is-collapsed' : ''}`} onMouseEnter={onRightPaneHoverEnter}>
            {!isSidePanesVisible ? <button aria-label="open checkpoint timeline" className="focus-margin-trigger is-right" onFocus={onOpenRightPane} onMouseEnter={onRightPaneHoverEnter} type="button" /> : null}
            {rightPane}
          </aside>
        </div>
      </section>
    </div>
  );
}
