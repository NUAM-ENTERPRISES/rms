import * as fs from 'fs';
import * as path from 'path';
import { PERMISSIONS } from '../permissions';

describe('create:agent_candidates catalog', () => {
  it('defines the permission constant', () => {
    expect(PERMISSIONS.CREATE_AGENT_CANDIDATES).toBe('create:agent_candidates');
  });

  it('assigns create:agent_candidates to Recruitment Lead in seed', () => {
    const seedSource = fs.readFileSync(
      path.join(__dirname, '../../../../prisma/seed.ts'),
      'utf8',
    );
    const recruitmentLeadBlock = seedSource.slice(
      seedSource.indexOf("name: 'Recruitment Lead'"),
      seedSource.indexOf("name: 'Documentation Executive'"),
    );

    expect(recruitmentLeadBlock).toContain("'create:agent_candidates'");
  });
});
