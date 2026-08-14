import { ProfessionSector } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import {
  anyProfessionFocusLabel,
  mergeProfessionFocus,
  resolveProfessionFocus,
} from '../profession-focus.util';

describe('resolveProfessionFocus', () => {
  it('requires a profession type when Any is not selected', () => {
    expect(() => resolveProfessionFocus({})).toThrow(BadRequestException);
  });

  it('requires a sector when Any is selected', () => {
    expect(() =>
      resolveProfessionFocus({ focusesAllProfessions: true }),
    ).toThrow(BadRequestException);
  });

  it('rejects a profession type together with Any', () => {
    expect(() =>
      resolveProfessionFocus({
        focusesAllProfessions: true,
        professionSector: ProfessionSector.HEALTHCARE,
        professionTypeId: 'pt_nurse',
      }),
    ).toThrow(BadRequestException);
  });

  it('labels Any-sector focus for healthcare and non-healthcare', () => {
    expect(anyProfessionFocusLabel(ProfessionSector.HEALTHCARE)).toBe(
      'Any · Healthcare',
    );
    expect(anyProfessionFocusLabel(ProfessionSector.NON_HEALTH_CARE)).toBe(
      'Any · Non-healthcare',
    );
    expect(anyProfessionFocusLabel(null)).toBe('Any profession');
  });

  it('resolves Any healthcare without a profession type', () => {
    expect(
      resolveProfessionFocus({
        focusesAllProfessions: true,
        professionSector: ProfessionSector.HEALTHCARE,
      }),
    ).toEqual({
      professionTypeId: null,
      focusesAllProfessions: true,
      professionSector: ProfessionSector.HEALTHCARE,
    });
  });
});

describe('mergeProfessionFocus', () => {
  it('switches from Any to a specific profession when a type id is sent', () => {
    expect(
      mergeProfessionFocus(
        {
          focusesAllProfessions: true,
          professionSector: ProfessionSector.HEALTHCARE,
          professionTypeId: null,
        },
        { professionTypeId: 'pt_nurse' },
      ),
    ).toEqual({
      professionTypeId: 'pt_nurse',
      focusesAllProfessions: false,
      professionSector: null,
    });
  });
});
