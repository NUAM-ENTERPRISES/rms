import {
  PROCESSING_STEPS,
  PROCESSING_STEP_ORDER,
  PROCESSING_STEP_CONFIG_MAP,
} from '../processing.constants';
import { ProcessingStepKey } from '@prisma/client';

describe('processing constants', () => {
  it('lists all processing steps in order', () => {
    expect(PROCESSING_STEPS).toHaveLength(11);
    expect(PROCESSING_STEP_ORDER[0]).toBe(
      ProcessingStepKey.MEDICAL_CERTIFICATE,
    );
    expect(PROCESSING_STEP_ORDER[PROCESSING_STEP_ORDER.length - 1]).toBe(
      ProcessingStepKey.JOINING,
    );
  });

  it('builds map and retains default SLA days', () => {
    for (const step of PROCESSING_STEPS) {
      expect(PROCESSING_STEP_CONFIG_MAP[step.key]).toBeDefined();
      expect(
        PROCESSING_STEP_CONFIG_MAP[step.key].defaultSlaDays,
      ).toBeGreaterThan(0);
    }
  });
});
