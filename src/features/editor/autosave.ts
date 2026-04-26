export const DEFAULT_AUTOSAVE_DELAY_MS = 1000;

export type AutosaveGuardParams = {
  currentFilePath: string | null;
  isDirty: boolean;
  isComposing: boolean;
};

export function shouldScheduleAutosave({ currentFilePath, isDirty, isComposing }: AutosaveGuardParams) {
  return Boolean(currentFilePath) && isDirty && !isComposing;
}

export function scheduleAutosave(
  callback: () => void,
  delayMs: number = DEFAULT_AUTOSAVE_DELAY_MS,
  schedule: typeof window.setTimeout = window.setTimeout.bind(window),
) {
  return schedule(callback, delayMs);
}

export function cancelAutosave(timer: number, clear: typeof window.clearTimeout = window.clearTimeout.bind(window)) {
  clear(timer);
}
