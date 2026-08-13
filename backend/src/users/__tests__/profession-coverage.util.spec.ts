import {
  ProfessionSector,
  RecruiterProfessionScope,
} from '@prisma/client';
import {
  professionCoverageWhere,
  recruiterCoversProfession,
} from '../profession-coverage.util';

const nurse = { id: 'pt_nurse', sector: ProfessionSector.HEALTHCARE };
const driver = { id: 'pt_driver', sector: ProfessionSector.NON_HEALTH_CARE };
const unknown = { id: 'pt_unknown', sector: null };

describe('recruiterCoversProfession', () => {
  it('matches explicit profession IDs only', () => {
    const recruiter = {
      handlesAllProfessions: false,
      recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
      professionTypeIds: [nurse.id],
    };
    expect(recruiterCoversProfession(recruiter, nurse)).toBe(true);
    expect(recruiterCoversProfession(recruiter, driver)).toBe(false);
  });

  it('Any healthcare covers all healthcare professions, not non-healthcare', () => {
    const recruiter = {
      handlesAllProfessions: true,
      recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
      professionTypeIds: [],
    };
    expect(recruiterCoversProfession(recruiter, nurse)).toBe(true);
    expect(recruiterCoversProfession(recruiter, driver)).toBe(false);
    expect(recruiterCoversProfession(recruiter, unknown)).toBe(false);
  });

  it('Any non-healthcare covers non-healthcare only', () => {
    const recruiter = {
      handlesAllProfessions: true,
      recruiterSectorScope: RecruiterProfessionScope.NON_HEALTH_CARE,
      professionTypeIds: [],
    };
    expect(recruiterCoversProfession(recruiter, driver)).toBe(true);
    expect(recruiterCoversProfession(recruiter, nurse)).toBe(false);
  });

  it('Both + Any covers healthcare, non-healthcare, and null-sector professions', () => {
    const recruiter = {
      handlesAllProfessions: true,
      recruiterSectorScope: RecruiterProfessionScope.BOTH,
      professionTypeIds: [],
    };
    expect(recruiterCoversProfession(recruiter, nurse)).toBe(true);
    expect(recruiterCoversProfession(recruiter, driver)).toBe(true);
    expect(recruiterCoversProfession(recruiter, unknown)).toBe(true);
  });
});

describe('professionCoverageWhere', () => {
  it('includes explicit ID match plus Any BOTH and matching sector', () => {
    expect(professionCoverageWhere(nurse.id, ProfessionSector.HEALTHCARE)).toEqual({
      OR: [
        { userProfessionScopes: { some: { professionTypeId: nurse.id } } },
        {
          handlesAllProfessions: true,
          recruiterSectorScope: RecruiterProfessionScope.BOTH,
        },
        {
          handlesAllProfessions: true,
          recruiterSectorScope: RecruiterProfessionScope.HEALTHCARE,
        },
      ],
    });
  });

  it('omits single-sector Any clause when profession sector is null', () => {
    expect(professionCoverageWhere(unknown.id, null)).toEqual({
      OR: [
        { userProfessionScopes: { some: { professionTypeId: unknown.id } } },
        {
          handlesAllProfessions: true,
          recruiterSectorScope: RecruiterProfessionScope.BOTH,
        },
      ],
    });
  });
});
