import { PROJECT_SECTOR } from '../../projects/constants';
import {
  allowedTemplateKeysForSector,
  computeApplicableStepProgress,
  filterProcessingStepsForSector,
  HEALTHCARE_STEP_KEYS,
  NON_HEALTHCARE_STEP_KEYS,
} from '../processing-sector-steps';

describe('processing-sector-steps', () => {
  it('non-healthcare allowlist excludes clinical verification steps', () => {
    expect(NON_HEALTHCARE_STEP_KEYS.has('data_flow')).toBe(false);
    expect(NON_HEALTHCARE_STEP_KEYS.has('medical')).toBe(false);
    expect(NON_HEALTHCARE_STEP_KEYS.has('offer_letter')).toBe(true);
    expect(NON_HEALTHCARE_STEP_KEYS.has('ticket')).toBe(true);
  });

  it('healthcare allowlist includes document_received and data_flow', () => {
    expect(HEALTHCARE_STEP_KEYS.has('document_received')).toBe(true);
    expect(HEALTHCARE_STEP_KEYS.has('data_flow')).toBe(true);
    expect(HEALTHCARE_STEP_KEYS.has('medical_fitness')).toBe(true);
  });

  it('allowedTemplateKeysForSector returns correct set', () => {
    expect(allowedTemplateKeysForSector(PROJECT_SECTOR.NON_HEALTHCARE)).toBe(NON_HEALTHCARE_STEP_KEYS);
    expect(allowedTemplateKeysForSector(PROJECT_SECTOR.HEALTHCARE)).toBe(HEALTHCARE_STEP_KEYS);
    expect(allowedTemplateKeysForSector(null)).toBe(HEALTHCARE_STEP_KEYS);
    expect(allowedTemplateKeysForSector(undefined)).toBe(HEALTHCARE_STEP_KEYS);
    expect(allowedTemplateKeysForSector('unknown')).toBe(HEALTHCARE_STEP_KEYS);
  });

  it('filterProcessingStepsForSector omits disallowed keys and cancelled', () => {
    const steps = [
      { status: 'completed', template: { key: 'offer_letter' } },
      { status: 'pending', template: { key: 'data_flow' } },
      { status: 'cancelled', template: { key: 'hrd' } },
    ];
    const filtered = filterProcessingStepsForSector(steps as any, PROJECT_SECTOR.NON_HEALTHCARE);
    expect(filtered.map((s) => s.template.key)).toEqual(['offer_letter']);
  });

  it('computeApplicableStepProgress counts only applicable non-cancelled steps', () => {
    const steps = [
      { status: 'completed', template: { key: 'offer_letter' } },
      { status: 'completed', template: { key: 'hrd' } },
      { status: 'pending', template: { key: 'data_flow' } },
      { status: 'completed', template: { key: 'prometric' } },
    ];
    const { totalApplicable, completedApplicable, percent } = computeApplicableStepProgress(
      steps,
      PROJECT_SECTOR.NON_HEALTHCARE,
    );
    expect(totalApplicable).toBe(2);
    expect(completedApplicable).toBe(2);
    expect(percent).toBe(100);
  });
});
