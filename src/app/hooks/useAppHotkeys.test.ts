import { describe, expect, it } from 'vitest';
import { shouldExitFullscreenOnEscape } from './useAppHotkeys';

describe('shouldExitFullscreenOnEscape', () => {
  it('returns false when CodeMirror already handled Escape', () => {
    expect(shouldExitFullscreenOnEscape({ defaultPrevented: true }, { isFullscreen: true, supportsNativeWindowControls: true })).toBe(false);
  });

  it('returns true when native fullscreen is active and Escape is still unhandled', () => {
    expect(shouldExitFullscreenOnEscape({ defaultPrevented: false }, { isFullscreen: true, supportsNativeWindowControls: true })).toBe(true);
  });

  it('returns false outside native fullscreen', () => {
    expect(shouldExitFullscreenOnEscape({ defaultPrevented: false }, { isFullscreen: false, supportsNativeWindowControls: true })).toBe(false);
    expect(shouldExitFullscreenOnEscape({ defaultPrevented: false }, { isFullscreen: true, supportsNativeWindowControls: false })).toBe(false);
  });
});
