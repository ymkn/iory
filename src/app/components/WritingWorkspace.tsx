import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';

type MobileWorkspaceTab = 'files' | 'editor' | 'history';

const MOBILE_WORKSPACE_TABS: Array<{ id: MobileWorkspaceTab; label: string }> = [
  { id: 'files', label: 'document panel' },
  { id: 'editor', label: 'editor' },
  { id: 'history', label: 'checkpoint timeline' },
];

const MOBILE_FOCUS_CONTROLS_VISIBLE_MS = 2400;

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
  const [mobileTab, setMobileTab] = useState<MobileWorkspaceTab>('editor');
  const [isMobileFocusTabsVisible, setMobileFocusTabsVisible] = useState(false);
  const mobileFocusTabsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearMobileFocusTabsTimer = () => {
    if (mobileFocusTabsTimerRef.current !== null) {
      clearTimeout(mobileFocusTabsTimerRef.current);
      mobileFocusTabsTimerRef.current = null;
    }
  };

  const scheduleMobileFocusTabsHide = () => {
    clearMobileFocusTabsTimer();

    mobileFocusTabsTimerRef.current = setTimeout(() => {
      setMobileFocusTabsVisible(false);
      mobileFocusTabsTimerRef.current = null;
    }, MOBILE_FOCUS_CONTROLS_VISIBLE_MS);
  };

  const revealMobileFocusControls = () => {
    setMobileTab('editor');
    setMobileFocusTabsVisible(true);
    scheduleMobileFocusTabsHide();
  };

  const selectMobileTab = (tab: MobileWorkspaceTab) => {
    setMobileTab(tab);

    if (isFocusMode) {
      scheduleMobileFocusTabsHide();
    }
  };

  useEffect(
    () => clearMobileFocusTabsTimer,
    [],
  );

  return (
    <div className={`workspace-layout${isFocusMode ? ' is-focus' : ''}`} onMouseLeave={onWorkspaceMouseLeave}>
      <section className={`editor-frame${isFocusMode ? ' is-focus' : ''}${isMobileFocusTabsVisible ? ' is-mobile-focus-revealed' : ''}`} aria-label="writing view editor frame" onMouseDownCapture={onEditorFrameMouseDownCapture} style={editorFrameStyle}>
        <div className={`editor-focus-layout${isFocusMode ? ' is-focus' : ''}${isSidePanesVisible ? ' has-side-panes' : ''}`} data-mobile-tab={mobileTab}>
          <aside className={`editor-side-pane is-left${isSidePanesVisible ? ' is-visible' : ''}${!isSidePanesVisible ? ' is-collapsed' : ''}${mobileTab === 'files' ? ' is-mobile-selected' : ''}`} onMouseEnter={onLeftPaneHoverEnter}>
            {!isSidePanesVisible ? <button aria-label="open left pane" className="focus-margin-trigger is-left" onFocus={onOpenLeftPane} onMouseEnter={onLeftPaneHoverEnter} type="button" /> : null}
            {leftPane}
          </aside>

          <div className="editor-core-column" onMouseEnter={onEditorColumnMouseEnter}>
            {editor}
          </div>

          <aside className={`editor-side-pane is-right${isSidePanesVisible ? ' is-visible' : ''}${!isSidePanesVisible ? ' is-collapsed' : ''}${mobileTab === 'history' ? ' is-mobile-selected' : ''}`} onMouseEnter={onRightPaneHoverEnter}>
            {!isSidePanesVisible ? <button aria-label="open checkpoint timeline" className="focus-margin-trigger is-right" onFocus={onOpenRightPane} onMouseEnter={onRightPaneHoverEnter} type="button" /> : null}
            {rightPane}
          </aside>
        </div>

        {isFocusMode ? (
          <button
            aria-label="show mobile workspace tabs"
            className="mobile-focus-tab-reveal"
            onClick={revealMobileFocusControls}
            type="button"
          />
        ) : null}

        <nav aria-label="mobile workspace sections" className={`mobile-workspace-tabs${isMobileFocusTabsVisible ? ' is-focus-visible' : ''}`}>
          {MOBILE_WORKSPACE_TABS.map((tab) => (
            <button
              aria-label={tab.label}
              aria-pressed={mobileTab === tab.id}
              className={`mobile-workspace-tab${mobileTab === tab.id ? ' is-active' : ''}`}
              key={tab.id}
              onClick={() => {
                selectMobileTab(tab.id);
              }}
              type="button"
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </nav>
      </section>
    </div>
  );
}
