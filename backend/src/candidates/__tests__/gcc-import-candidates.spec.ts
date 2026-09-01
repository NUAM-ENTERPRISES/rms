import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  mapCategory,
  mapPreferredCountries,
  normalizeCountryCode,
  normalizeMobile,
  normalizeOptionalLastName,
  normalizePersonName,
  parseGender,
} from '../../../scripts/import-gcc-candidates';
import { Gender, ProfessionSector } from '@prisma/client';

describe('GCC candidate import normalization', () => {
  it('normalizes recruiter names and worksheet labels', () => {
    expect(normalizePersonName('Vishnupriya N.M.')).toBe('vishnupriyanm');
    expect(normalizePersonName('VARUNDAS ')).toBe('varundas');
  });

  it('normalizes spreadsheet phone values', () => {
    expect(normalizeCountryCode('91.0')).toBe('+91');
    expect(normalizeMobile('9.663275076E9')).toBe('96632750769');
    expect(normalizeMobile('733 957 3820')).toBe('7339573820');
  });

  it('stores blank last names as null', () => {
    expect(normalizeOptionalLastName('')).toBeNull();
    expect(normalizeOptionalLastName('  ')).toBeNull();
    expect(normalizeOptionalLastName('KURUP')).toBe('KURUP');
  });

  it('maps supported categories to healthcare profession types', () => {
    expect(mapCategory('DOCTORS')).toEqual({
      professionTypeId: 'pt_doctor_seed01',
      professionSector: ProfessionSector.HEALTHCARE,
    });
    expect(mapCategory('unknown')).toBeUndefined();
  });

  it('maps genders and GCC preference aliases', () => {
    expect(parseGender('female')).toBe(Gender.FEMALE);
    expect(parseGender('not specified')).toBeUndefined();
    expect(mapPreferredCountries('SAUDI, DUBAI')).toEqual(['SA', 'AE']);
    expect(mapPreferredCountries('ANY GCC')).toEqual([
      'SA',
      'AE',
      'OM',
      'QA',
      'KW',
      'BH',
    ]);
  });

  it('includes representative workbook catalog values in seed data', () => {
    const qualifications = JSON.parse(
      readFileSync(
        resolve(__dirname, '../../../prisma/seeds/qualifications.json'),
        'utf8',
      ),
    ) as Array<{ shortName: string }>;
    const aliases = JSON.parse(
      readFileSync(
        resolve(__dirname, '../../../prisma/seeds/qualification-aliases.json'),
        'utf8',
      ),
    ) as Array<{ qualificationShortName: string; alias: string }>;
    const roleCatalogSeed = readFileSync(
      resolve(__dirname, '../../../prisma/seeds/role-catalog.seed.ts'),
      'utf8',
    );
    const professionTypeSeed = readFileSync(
      resolve(__dirname, '../../../prisma/seeds/profession-types.seed.ts'),
      'utf8',
    );

    expect(qualifications.map(({ shortName }) => shortName)).toEqual(
      expect.arrayContaining([
        'ANM',
        'BASLP',
        'BSc MIT',
        'Diploma EMT',
        'BCA',
        'B.Tech Civil',
        'MD Pediatrics',
        'DCH',
        'MRCP',
      ]),
    );
    expect(aliases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          qualificationShortName: 'ANM',
          alias: 'Auxiliary Nurse Midwifery',
        }),
      ]),
    );
    expect(roleCatalogSeed).toContain("name: 'dialysis'");
    expect(roleCatalogSeed).toContain("name: 'radiology'");
    expect(roleCatalogSeed).toContain("'respiratory_therapist'");
    expect(roleCatalogSeed).toContain("name: 'information_technology'");
    expect(roleCatalogSeed).toContain("'software_engineer'");
    expect(roleCatalogSeed).toContain("'gastroenterologist'");
    expect(roleCatalogSeed).toContain("'neonatology_physician'");
    expect(professionTypeSeed).toContain("name: 'engineering'");
    expect(professionTypeSeed).toContain("name: 'customer_service'");
  });
});
