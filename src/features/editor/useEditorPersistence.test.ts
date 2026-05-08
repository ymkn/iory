import { describe, expect, it } from 'vitest';
import { isMetadataOnlyExternalChange } from './useExternalFileSync';
import { getSaveFailureMessage } from './useEditorPersistence';

describe('isMetadataOnlyExternalChange', () => {
  it('returns true when disk text still matches the app saved baseline', () => {
    expect(
      isMetadataOnlyExternalChange(
        'draft',
        'draft',
        'utf-8',
        'utf-8',
        null,
        null,
      ),
    ).toBe(true);
  });

  it('returns false for real external content changes', () => {
    expect(
      isMetadataOnlyExternalChange(
        'external edit',
        'draft',
        'utf-8',
        'utf-8',
        null,
        null,
      ),
    ).toBe(false);
  });

  it('returns false when no saved baseline exists', () => {
    expect(
      isMetadataOnlyExternalChange('', null, 'utf-8', 'utf-8', null, null),
    ).toBe(false);
  });

  it('returns false when disk text matches but encoding changed', () => {
    expect(
      isMetadataOnlyExternalChange(
        'draft',
        'draft',
        'shift_jis',
        'utf-8',
        null,
        null,
      ),
    ).toBe(false);
  });

  it('returns false when disk text matches but BOM changed', () => {
    expect(
      isMetadataOnlyExternalChange(
        'draft',
        'draft',
        'utf-8',
        'utf-8',
        'utf-8',
        null,
      ),
    ).toBe(false);
  });
});

describe('getSaveFailureMessage', () => {
  it('uses a short autosave failure message for autosave errors', () => {
    expect(getSaveFailureMessage('autosave')).toBe('自動保存に失敗しました。');
  });

  it('uses a short save failure message for manual errors', () => {
    expect(getSaveFailureMessage('manual')).toBe('保存に失敗しました。');
  });
});
