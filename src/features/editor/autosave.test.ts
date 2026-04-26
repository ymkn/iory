import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_AUTOSAVE_DELAY_MS, cancelAutosave, scheduleAutosave, shouldScheduleAutosave } from './autosave';

describe('shouldScheduleAutosave', () => {
  it('schedules only when a file is open, dirty, and not composing', () => {
    expect(shouldScheduleAutosave({ currentFilePath: 'C:/draft.md', isDirty: true, isComposing: false })).toBe(true);
    expect(shouldScheduleAutosave({ currentFilePath: null, isDirty: true, isComposing: false })).toBe(false);
    expect(shouldScheduleAutosave({ currentFilePath: 'C:/draft.md', isDirty: false, isComposing: false })).toBe(false);
    expect(shouldScheduleAutosave({ currentFilePath: 'C:/draft.md', isDirty: true, isComposing: true })).toBe(false);
  });
});

describe('autosave timer helpers', () => {
  it('schedules autosave with the standard delay', () => {
    const schedule = vi.fn(() => 42);
    const callback = vi.fn();

    const timer = scheduleAutosave(callback, undefined, schedule as typeof window.setTimeout);

    expect(timer).toBe(42);
    expect(schedule).toHaveBeenCalledWith(callback, DEFAULT_AUTOSAVE_DELAY_MS);
  });

  it('schedules autosave with a configured delay', () => {
    const schedule = vi.fn(() => 7);
    const callback = vi.fn();

    const timer = scheduleAutosave(callback, 2500, schedule as typeof window.setTimeout);

    expect(timer).toBe(7);
    expect(schedule).toHaveBeenCalledWith(callback, 2500);
  });

  it('cancels a scheduled autosave timer', () => {
    const clear = vi.fn();

    cancelAutosave(42, clear as typeof window.clearTimeout);

    expect(clear).toHaveBeenCalledWith(42);
  });
});
