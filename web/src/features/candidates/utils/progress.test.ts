import { describe, expect, it } from 'vitest';
import { normalizeStatusName, calculateProgress, PROGRESS_ORDER } from './progress';

describe('progress utils', () => {
  it('normalizes verification_in_progress_document to verification_in_progress', () => {
    const entry = { subStatus: { name: 'verification_in_progress_document' } };
    expect(normalizeStatusName(entry)).toBe('verification_in_progress');
  });

  it('normalizes interview_assigned and calculates progress', () => {
    const now = new Date().toISOString();
    const history = [
      { id: '1', subStatus: { name: 'nominated_initial' }, statusChangedAt: new Date(Date.now() - 1000).toISOString() },
      { id: '2', subStatus: { name: 'interview_assigned' }, statusChangedAt: now }
    ];

    const norm = normalizeStatusName(history[1]);
    expect(norm).toBe('interview_assigned');

    const { progress, current } = calculateProgress(history as any);
    // ensure it returns a canonical progress key and progress > 0
    expect(current).toBe('interview_scheduled');
    const total = PROGRESS_ORDER.length;
    const expected = Math.round(((PROGRESS_ORDER.indexOf('interview_scheduled') + 1) / total) * 100);
    expect(progress).toBe(expected);
  });

  it('returns 0 for empty history', () => {
    const { progress, current } = calculateProgress([] as any);
    expect(progress).toBe(0);
    expect(current).toBeUndefined();
  });

  it('calculates canonical progress and next step for documents_verified', () => {
    const now = new Date().toISOString();
    const history = [
      { id: '1', subStatus: { name: 'documents_submitted' }, statusChangedAt: new Date(Date.now() - 2000).toISOString() },
      { id: '2', subStatus: { name: 'documents_verified' }, statusChangedAt: now }
    ];

    const { progress, current } = calculateProgress(history as any);
    expect(current).toBe('documents_verified');
    // documents_verified is index 4 in PROGRESS_ORDER -> (4+1)/12 * 100
    const expected = Math.round(((PROGRESS_ORDER.indexOf('documents_verified') + 1) / PROGRESS_ORDER.length) * 100);
    expect(progress).toBe(expected);
  });
});
