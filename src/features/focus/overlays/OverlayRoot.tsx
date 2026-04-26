import type { ReactNode } from 'react';

type OverlayRootProps = {
  isOpen: boolean;
  onMouseLeave?: () => void;
  onBackdropClick?: () => void;
  className?: string;
  panelClassName?: string;
  children?: ReactNode;
};

export function OverlayRoot({ isOpen, onMouseLeave, onBackdropClick, className, panelClassName, children }: OverlayRootProps) {
  return (
    <div aria-hidden={!isOpen} className={`overlay-root${isOpen ? ' is-open' : ''}${className ? ` ${className}` : ''}`} onClick={onBackdropClick} onMouseLeave={onMouseLeave}>
      <div className={`overlay-panel${panelClassName ? ` ${panelClassName}` : ''}`} onClick={(event) => {
        event.stopPropagation();
      }} role="dialog">
        {children ?? (
          <>
            <p className="status-label">overlay mount</p>
            <p className="status-value">将来ここにファイル一覧や設定 Overlay を載せます。</p>
          </>
        )}
      </div>
    </div>
  );
}
