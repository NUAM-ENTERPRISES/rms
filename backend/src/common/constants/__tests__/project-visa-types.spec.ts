import {
  normalizeProjectVisaType,
  getProjectVisaTypeLabel,
  isDirectVisaType,
  PROJECT_VISA_TYPE,
} from '../project-visa-types';

describe('project-visa-types', () => {
  it('maps legacy contract to direct_visa', () => {
    expect(normalizeProjectVisaType('contract')).toBe(
      PROJECT_VISA_TYPE.DIRECT_VISA,
    );
  });

  it('maps legacy permanent to company_visa', () => {
    expect(normalizeProjectVisaType('permanent')).toBe(
      PROJECT_VISA_TYPE.COMPANY_VISA,
    );
  });

  it('returns human labels', () => {
    expect(getProjectVisaTypeLabel('direct_visa')).toBe('Direct Visa');
    expect(getProjectVisaTypeLabel('company_visa')).toBe('Company Visa');
    expect(getProjectVisaTypeLabel('contract')).toBe('Direct Visa');
  });

  it('identifies direct visa types', () => {
    expect(isDirectVisaType('contract')).toBe(true);
    expect(isDirectVisaType('company_visa')).toBe(false);
  });
});
