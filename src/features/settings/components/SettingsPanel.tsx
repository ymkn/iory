import type { CSSProperties } from 'react';
import packageJson from '../../../../package.json';
import { THEME_OPTIONS, type CountMode, type CursorStyle } from '../types';
import { useSettingsStore } from '../store';

type ThemeSelectorFieldProps = {
  label?: string;
  compact?: boolean;
};

export function ThemeSelectorField({ label = 'Theme', compact = false }: ThemeSelectorFieldProps) {
  const { themeId, setThemeId } = useSettingsStore();

  return (
    <label className={`settings-field${compact ? ' settings-field-compact' : ''}`}>
      <span className="settings-field-label">{label}</span>
      <span aria-label={label} className="theme-swatch-list" role="radiogroup">
        {THEME_OPTIONS.map((theme) => {
          const isActive = theme.id === themeId;

          return (
            <button
              aria-checked={isActive}
              aria-label={theme.label}
              className={`theme-swatch-button${isActive ? ' is-active' : ''}`}
              key={theme.id}
              onClick={() => {
                void setThemeId(theme.id);
              }}
              role="radio"
              title={theme.label}
              type="button"
            >
              <span aria-hidden="true" className="theme-swatch-fill" style={{ '--theme-swatch-a': theme.swatch[0], '--theme-swatch-b': theme.swatch[1], '--theme-swatch-c': theme.swatch[2] } as CSSProperties} />
            </button>
          );
        })}
      </span>
    </label>
  );
}

export function SettingsPanel({ compact = false }: { compact?: boolean }) {
  const appVersion = packageJson.version;
  const {
    backgroundMode,
    showBackgroundImage,
    uiFontFamily,
    editorFontFamily,
    countMode,
    cursorStyle,
    fontSize,
    lineHeight,
    editorMaxWidth,
    autosaveIntervalMs,
    checkpointIntervalMs,
    setBackgroundMode,
    setShowBackgroundImage,
    setUiFontFamily,
    setEditorFontFamily,
    setCountMode,
    setCursorStyle,
    setFontSize,
    setLineHeight,
    setEditorMaxWidth,
    setAutosaveIntervalMs,
    setCheckpointIntervalMs,
  } = useSettingsStore();

  return (
    <div className={`settings-panel settings-panel-modal${compact ? ' settings-panel-compact-mode' : ''}`}>
      <div className="settings-section">
        <ThemeSelectorField compact={compact} label="Theme" />

        <label className="settings-field settings-field-modal-row settings-field-toggle-row">
          <span className="settings-field-label">Background Soft Glow</span>
          <button
            aria-label={backgroundMode === 'soft' ? 'disable soft glow' : 'enable soft glow'}
            className={`settings-toggle${backgroundMode === 'soft' ? ' is-on' : ''}`}
            onClick={() => {
              void setBackgroundMode(backgroundMode === 'soft' ? 'plain' : 'soft');
            }}
            type="button"
          >
            <span className="settings-toggle-track" />
          </button>
        </label>

        <label className="settings-field settings-field-modal-row settings-field-toggle-row">
          <span className="settings-field-label">Background Image</span>
          <button
            aria-label={showBackgroundImage ? 'hide background image' : 'show background image'}
            className={`settings-toggle${showBackgroundImage ? ' is-on' : ''}`}
            onClick={() => {
              void setShowBackgroundImage(!showBackgroundImage);
            }}
            type="button"
          >
            <span className="settings-toggle-track" />
          </button>
        </label>

        <label className="settings-field settings-field-modal-row">
          <span className="settings-field-label">UI font</span>
          <span className="settings-field-control">
            <input onChange={(event) => {
              void setUiFontFamily(event.target.value);
            }} type="text" value={uiFontFamily} />
          </span>
        </label>

        <label className="settings-field settings-field-modal-row">
          <span className="settings-field-label">Editor font</span>
          <span className="settings-field-control">
            <input onChange={(event) => {
              void setEditorFontFamily(event.target.value);
            }} type="text" value={editorFontFamily} />
          </span>
        </label>

        <label className="settings-field settings-field-modal-row settings-field-modal-row-break-after">
          <span className="settings-field-label">Count mode</span>
          <span className="settings-field-control">
            <span className="settings-select-wrap">
              <select onChange={(event) => {
                void setCountMode(event.target.value as CountMode);
              }} value={countMode}>
                <option value="characters">Characters</option>
                <option value="words">Words</option>
              </select>
              <span aria-hidden="true" className="settings-select-caret">▾</span>
            </span>
          </span>
        </label>

        <label className="settings-field settings-field-modal-row settings-field-toggle-row">
          <span className="settings-field-label">Block cursor</span>
          <button
            aria-label={cursorStyle === 'block' ? 'use line cursor' : 'use block cursor'}
            className={`settings-toggle${cursorStyle === 'block' ? ' is-on' : ''}`}
            onClick={() => {
              void setCursorStyle((cursorStyle === 'block' ? 'line' : 'block') satisfies CursorStyle);
            }}
            type="button"
          >
            <span className="settings-toggle-track" />
          </button>
        </label>

        <label className="settings-field settings-field-modal-row settings-field-modal-row-range-start">
          <span className="settings-field-label">Font size</span>
          <span className="settings-field-control settings-field-control-range">
            <input max={32} min={10} onChange={(event) => {
                void setFontSize(Number(event.target.value));
            }} type="range" value={fontSize} />
            <strong>{fontSize}px</strong>
          </span>
        </label>

        <label className="settings-field settings-field-modal-row">
          <span className="settings-field-label">Line height</span>
          <span className="settings-field-control settings-field-control-range">
            <input max={2.6} min={1.4} onChange={(event) => {
              void setLineHeight(Number(event.target.value));
            }} step={0.1} type="range" value={lineHeight} />
            <strong>{lineHeight.toFixed(1)}</strong>
          </span>
        </label>

        <label className="settings-field settings-field-modal-row">
          <span className="settings-field-label">Content width</span>
          <span className="settings-field-control settings-field-control-range">
            <input max={1100} min={560} onChange={(event) => {
              void setEditorMaxWidth(Number(event.target.value));
            }} step={10} type="range" value={editorMaxWidth} />
            <strong>{editorMaxWidth}px</strong>
          </span>
        </label>

        <label className="settings-field settings-field-modal-row">
          <span className="settings-field-label">Autosave interval</span>
          <span className="settings-field-control settings-field-control-range">
            <input max={60000} min={10000} onChange={(event) => {
              void setAutosaveIntervalMs(Number(event.target.value));
            }} step={5000} type="range" value={autosaveIntervalMs} />
            <strong>{Math.round(autosaveIntervalMs / 1000)}s</strong>
          </span>
        </label>

        <label className="settings-field settings-field-modal-row">
          <span className="settings-field-label">Checkpoint interval</span>
          <span className="settings-field-control settings-field-control-range">
            <input max={7200000} min={600000} onChange={(event) => {
              void setCheckpointIntervalMs(Number(event.target.value));
            }} step={600000} type="range" value={checkpointIntervalMs} />
            <strong>{Math.round(checkpointIntervalMs / 60000)}m</strong>
          </span>
        </label>

      </div>

      <div className="settings-version-block">
        <p className="status-label">version</p>
        <p className="settings-version-value">Iory {appVersion} ({__BUILD_ARCH__})</p>
      </div>
    </div>
  );
}
