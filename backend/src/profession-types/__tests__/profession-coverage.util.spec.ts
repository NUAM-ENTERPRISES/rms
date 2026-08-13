import {
  PROFESSION_COVERAGE_WILDCARD_NAMES,
  buildProfessionScopeWhere,
  isProfessionCoverageWildcard,
  peerCoversProfession,
  scopeCoversProfession,
  wildcardNameForSector,
} from '../profession-coverage.util';

describe('profession-coverage.util', () => {
  describe('isProfessionCoverageWildcard', () => {
    it('recognizes both sector wildcards', () => {
      expect(isProfessionCoverageWildcard('any_healthcare')).toBe(true);
      expect(isProfessionCoverageWildcard('any_non_health_care')).toBe(true);
      expect(isProfessionCoverageWildcard('nurse')).toBe(false);
      expect(isProfessionCoverageWildcard(null)).toBe(false);
    });
  });

  describe('wildcardNameForSector', () => {
    it('maps sectors to wildcard names', () => {
      expect(wildcardNameForSector('HEALTHCARE')).toBe(
        PROFESSION_COVERAGE_WILDCARD_NAMES.HEALTHCARE,
      );
      expect(wildcardNameForSector('NON_HEALTH_CARE')).toBe(
        PROFESSION_COVERAGE_WILDCARD_NAMES.NON_HEALTH_CARE,
      );
      expect(wildcardNameForSector(null)).toBeNull();
    });
  });

  describe('buildProfessionScopeWhere', () => {
    it('returns empty filter when professionTypeId is missing', () => {
      expect(buildProfessionScopeWhere(null)).toEqual({});
      expect(buildProfessionScopeWhere(undefined)).toEqual({});
    });

    it('matches exact ID only when sector is unknown', () => {
      expect(buildProfessionScopeWhere('pt_nurse')).toEqual({
        userProfessionScopes: {
          some: { professionTypeId: 'pt_nurse' },
        },
      });
    });

    it('ORs exact ID with sector wildcard when sector is known', () => {
      expect(buildProfessionScopeWhere('pt_nurse', 'HEALTHCARE')).toEqual({
        userProfessionScopes: {
          some: {
            OR: [
              { professionTypeId: 'pt_nurse' },
              { professionType: { name: 'any_healthcare' } },
            ],
          },
        },
      });
      expect(
        buildProfessionScopeWhere('pt_admin', 'NON_HEALTH_CARE'),
      ).toEqual({
        userProfessionScopes: {
          some: {
            OR: [
              { professionTypeId: 'pt_admin' },
              { professionType: { name: 'any_non_health_care' } },
            ],
          },
        },
      });
    });
  });

  describe('scopeCoversProfession', () => {
    it('matches exact profession type ID', () => {
      expect(
        scopeCoversProfession(
          [{ professionTypeId: 'pt_nurse' }],
          'pt_nurse',
          'HEALTHCARE',
        ),
      ).toBe(true);
    });

    it('matches healthcare Any wildcard for nurse', () => {
      expect(
        scopeCoversProfession(
          [
            {
              professionTypeId: 'pt_any_hc',
              professionType: {
                name: 'any_healthcare',
                sector: 'HEALTHCARE',
              },
            },
          ],
          'pt_nurse',
          'HEALTHCARE',
        ),
      ).toBe(true);
    });

    it('matches non-healthcare Any for same-sector candidate', () => {
      expect(
        scopeCoversProfession(
          [
            {
              professionTypeId: 'pt_any_nh',
              professionType: {
                name: 'any_non_health_care',
                sector: 'NON_HEALTH_CARE',
              },
            },
          ],
          'pt_admin',
          'NON_HEALTH_CARE',
        ),
      ).toBe(true);
    });

    it('does not match healthcare Any for non-healthcare candidate', () => {
      expect(
        scopeCoversProfession(
          [
            {
              professionTypeId: 'pt_any_hc',
              professionType: {
                name: 'any_healthcare',
                sector: 'HEALTHCARE',
              },
            },
          ],
          'pt_admin',
          'NON_HEALTH_CARE',
        ),
      ).toBe(false);
    });
  });

  describe('peerCoversProfession', () => {
    it('matches exact ID or wildcard sector', () => {
      const professionTypeIds = new Set(['pt_nurse']);
      const wildcardSectors = new Set<string>(['NON_HEALTH_CARE']);

      expect(
        peerCoversProfession({
          professionTypeIds,
          wildcardSectors,
          candidateProfessionTypeId: 'pt_nurse',
          candidateSector: 'HEALTHCARE',
        }),
      ).toBe(true);

      expect(
        peerCoversProfession({
          professionTypeIds,
          wildcardSectors,
          candidateProfessionTypeId: 'pt_admin',
          candidateSector: 'NON_HEALTH_CARE',
        }),
      ).toBe(true);

      expect(
        peerCoversProfession({
          professionTypeIds,
          wildcardSectors,
          candidateProfessionTypeId: 'pt_doctor',
          candidateSector: 'HEALTHCARE',
        }),
      ).toBe(false);
    });
  });
});
