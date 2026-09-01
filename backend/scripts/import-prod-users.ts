/**
 * One-off: import production users from a pg_dump custom backup into the local
 * Docker Postgres DB, skipping emails that already exist (seeded test accounts).
 *
 * Role IDs differ between environments, so user_roles are remapped by role name.
 *
 *   npx tsx scripts/import-prod-users.ts \
 *     --backup "/Users/nuamtechnologies/Downloads/affiniks_rms_production.backup"
 *
 *   npx tsx scripts/import-prod-users.ts --backup ... --dry-run
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { PrismaClient, Prisma } from '@prisma/client';

const DEFAULT_BACKUP =
  '/Users/nuamtechnologies/Downloads/affiniks_rms_production.backup';
const PG_HOST = process.env.IMPORT_PG_HOST ?? '127.0.0.1';
const PG_PORT = process.env.IMPORT_PG_PORT ?? '5433';
const PG_USER = process.env.IMPORT_PG_USER ?? 'postgres';
const PG_PASSWORD = process.env.IMPORT_PG_PASSWORD ?? 'postgres';
const LOCAL_DB = process.env.IMPORT_LOCAL_DB ?? 'affiniks_rms';
const STAGING_DB = 'affiniks_rms_prod_staging';

const LOCAL_URL =
  process.env.IMPORT_LOCAL_DATABASE_URL ??
  `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${LOCAL_DB}?schema=public`;
const STAGING_URL = `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${STAGING_DB}?schema=public`;

type CliArgs = {
  backup: string;
  dryRun: boolean;
  keepStaging: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  let backup = DEFAULT_BACKUP;
  let dryRun = false;
  let keepStaging = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--keep-staging') {
      keepStaging = true;
    } else if (arg === '--backup') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('--backup requires a file path');
      }
      backup = value;
      i += 1;
    } else if (arg.startsWith('--backup=')) {
      backup = arg.slice('--backup='.length);
    }
  }

  return { backup, dryRun, keepStaging };
}

function pgEnv(): NodeJS.ProcessEnv {
  return { ...process.env, PGPASSWORD: PG_PASSWORD };
}

function runPg(
  command: string,
  args: string[],
  options?: { allowNonZero?: boolean },
): number {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: pgEnv(),
  });
  if (result.error) {
    throw result.error;
  }
  const status = result.status ?? 1;
  if (status !== 0 && !options?.allowNonZero) {
    throw new Error(`${command} ${args.join(' ')} exited with ${status}`);
  }
  return status;
}

function psqlAdmin(sql: string): void {
  runPg('psql', [
    '-h',
    PG_HOST,
    '-p',
    PG_PORT,
    '-U',
    PG_USER,
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    sql,
  ]);
}

function restoreBackupToStaging(backupPath: string): void {
  console.log(`Creating staging database ${STAGING_DB}...`);
  psqlAdmin(`DROP DATABASE IF EXISTS ${STAGING_DB} WITH (FORCE);`);
  psqlAdmin(`CREATE DATABASE ${STAGING_DB};`);

  console.log(`Restoring ${backupPath} into ${STAGING_DB}...`);
  // pg_restore often exits 1 on ignorable warnings (ACL/comments). Verify via Prisma after.
  runPg(
    'pg_restore',
    [
      '-h',
      PG_HOST,
      '-p',
      PG_PORT,
      '-U',
      PG_USER,
      '-d',
      STAGING_DB,
      '--no-owner',
      '--no-acl',
      '--no-comments',
      backupPath,
    ],
    { allowNonZero: true },
  );
}

function dropStaging(): void {
  console.log(`Dropping staging database ${STAGING_DB}...`);
  psqlAdmin(`DROP DATABASE IF EXISTS ${STAGING_DB} WITH (FORCE);`);
}

function phoneKey(countryCode: string, mobileNumber: string): string {
  return `${countryCode}|${mobileNumber}`;
}

async function importUsers(
  local: PrismaClient,
  staging: PrismaClient,
  dryRun: boolean,
): Promise<void> {
  const [
    stagingUsers,
    localUsers,
    localRoles,
    localCountries,
    localStates,
    localLanguages,
    localProfessionTypes,
    localTeams,
  ] = await Promise.all([
    staging.user.findMany({
      include: {
        userRoles: { include: { role: true } },
        userTeams: true,
        userCountryCoverages: true,
        userProfessionScopes: true,
        userLanguages: true,
      },
    }),
    local.user.findMany({
      select: {
        id: true,
        email: true,
        countryCode: true,
        mobileNumber: true,
        employeeCode: true,
      },
    }),
    local.role.findMany({ select: { id: true, name: true } }),
    local.country.findMany({ select: { code: true } }),
    local.state.findMany({ select: { id: true } }),
    local.language.findMany({ select: { code: true } }),
    local.professionType.findMany({ select: { id: true } }),
    local.team.findMany({ select: { id: true } }),
  ]);

  const localByEmail = new Map(localUsers.map((u) => [u.email.toLowerCase(), u]));
  const usedPhones = new Set(
    localUsers.map((u) => phoneKey(u.countryCode, u.mobileNumber)),
  );
  const usedEmployeeCodes = new Set(
    localUsers
      .map((u) => u.employeeCode)
      .filter((code): code is string => Boolean(code)),
  );
  const roleIdByName = new Map(localRoles.map((r) => [r.name, r.id]));
  const countryCodes = new Set(localCountries.map((c) => c.code));
  const stateIds = new Set(localStates.map((s) => s.id));
  const languageCodes = new Set(localLanguages.map((l) => l.code));
  const professionTypeIds = new Set(localProfessionTypes.map((p) => p.id));
  const teamIds = new Set(localTeams.map((t) => t.id));

  const skippedExisting: string[] = [];
  const skippedConflict: Array<{ email: string; reason: string }> = [];
  const toImport = stagingUsers.filter((user) => {
    const emailKey = user.email.toLowerCase();
    if (localByEmail.has(emailKey)) {
      skippedExisting.push(user.email);
      return false;
    }
    const phone = phoneKey(user.countryCode, user.mobileNumber);
    if (usedPhones.has(phone)) {
      skippedConflict.push({
        email: user.email,
        reason: `phone ${user.countryCode} ${user.mobileNumber} already exists`,
      });
      return false;
    }
    if (user.employeeCode && usedEmployeeCodes.has(user.employeeCode)) {
      skippedConflict.push({
        email: user.email,
        reason: `employee_code ${user.employeeCode} already exists`,
      });
      return false;
    }
    usedPhones.add(phone);
    if (user.employeeCode) {
      usedEmployeeCodes.add(user.employeeCode);
    }
    return true;
  });

  const importIds = new Set(toImport.map((u) => u.id));
  const stagingEmailById = new Map(stagingUsers.map((u) => [u.id, u.email]));

  const userRows: Prisma.UserCreateManyInput[] = toImport.map((user) => {
    const addressCountryCode =
      user.addressCountryCode && countryCodes.has(user.addressCountryCode)
        ? user.addressCountryCode
        : null;
    const addressStateId =
      user.addressStateId && stateIds.has(user.addressStateId)
        ? user.addressStateId
        : null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      password: user.password,
      dateOfBirth: user.dateOfBirth,
      otp: user.otp,
      otpExpiresAt: user.otpExpiresAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      countryCode: user.countryCode,
      profileImage: user.profileImage,
      mobileNumber: user.mobileNumber,
      notificationSoundMuted: user.notificationSoundMuted,
      address: user.address,
      addressCountryCode,
      addressStateId,
      employeeCode: user.employeeCode,
      accountStatus: user.accountStatus,
      accountStatusUpdatedAt: user.accountStatusUpdatedAt,
      createdById: null,
      recruiterSectorScope: user.recruiterSectorScope,
      handlesAllProfessions: user.handlesAllProfessions,
    };
  });

  const roleRows: Prisma.UserRoleCreateManyInput[] = [];
  const missingRoles = new Set<string>();
  for (const user of toImport) {
    for (const userRole of user.userRoles) {
      const localRoleId = roleIdByName.get(userRole.role.name);
      if (!localRoleId) {
        missingRoles.add(userRole.role.name);
        continue;
      }
      roleRows.push({ userId: user.id, roleId: localRoleId });
    }
  }

  const teamRows: Prisma.UserTeamCreateManyInput[] = [];
  let skippedTeams = 0;
  for (const user of toImport) {
    for (const membership of user.userTeams) {
      if (!teamIds.has(membership.teamId)) {
        skippedTeams += 1;
        continue;
      }
      teamRows.push({ userId: user.id, teamId: membership.teamId });
    }
  }

  const coverageRows: Prisma.UserCountryCoverageCreateManyInput[] = [];
  let skippedCoverage = 0;
  for (const user of toImport) {
    for (const coverage of user.userCountryCoverages) {
      if (!countryCodes.has(coverage.countryCode)) {
        skippedCoverage += 1;
        continue;
      }
      coverageRows.push({
        id: coverage.id,
        userId: user.id,
        countryCode: coverage.countryCode,
        sectorScopes: coverage.sectorScopes,
        createdAt: coverage.createdAt,
        updatedAt: coverage.updatedAt,
      });
    }
  }

  const professionRows: Prisma.UserProfessionScopeCreateManyInput[] = [];
  let skippedProfessions = 0;
  for (const user of toImport) {
    for (const scope of user.userProfessionScopes) {
      if (!professionTypeIds.has(scope.professionTypeId)) {
        skippedProfessions += 1;
        continue;
      }
      professionRows.push({
        id: scope.id,
        userId: user.id,
        professionTypeId: scope.professionTypeId,
        createdAt: scope.createdAt,
        updatedAt: scope.updatedAt,
      });
    }
  }

  const languageRows: Prisma.UserLanguageCreateManyInput[] = [];
  let skippedLanguages = 0;
  for (const user of toImport) {
    for (const lang of user.userLanguages) {
      if (!languageCodes.has(lang.languageCode)) {
        skippedLanguages += 1;
        continue;
      }
      languageRows.push({
        id: lang.id,
        userId: user.id,
        languageCode: lang.languageCode,
        proficiency: lang.proficiency,
        createdAt: lang.createdAt,
        updatedAt: lang.updatedAt,
      });
    }
  }

  const stagingSequences = await staging.employeeCodeSequence.findMany();

  console.log('\n--- Import plan ---');
  console.log(`Staging users:           ${stagingUsers.length}`);
  console.log(`Local users already:     ${localUsers.length}`);
  console.log(`Skip existing emails:    ${skippedExisting.length}`);
  console.log(`Skip unique conflicts:   ${skippedConflict.length}`);
  console.log(`Users to insert:         ${userRows.length}`);
  console.log(`user_roles:              ${roleRows.length}`);
  console.log(`user_teams:              ${teamRows.length} (skipped ${skippedTeams})`);
  console.log(
    `country coverage:        ${coverageRows.length} (skipped ${skippedCoverage})`,
  );
  console.log(
    `profession scopes:       ${professionRows.length} (skipped ${skippedProfessions})`,
  );
  console.log(
    `languages:               ${languageRows.length} (skipped ${skippedLanguages})`,
  );
  if (missingRoles.size > 0) {
    console.warn(`Missing local roles: ${[...missingRoles].join(', ')}`);
  }
  if (skippedConflict.length > 0) {
    for (const row of skippedConflict) {
      console.warn(`Skip ${row.email}: ${row.reason}`);
    }
  }
  console.log('Sample new users:');
  for (const user of toImport.slice(0, 8)) {
    const roles = user.userRoles.map((r) => r.role.name).join(', ') || '(none)';
    console.log(`  - ${user.email}  ${user.name}  [${roles}]`);
  }
  if (toImport.length > 8) {
    console.log(`  ... and ${toImport.length - 8} more`);
  }

  if (dryRun) {
    console.log('\nDry run: no local writes.');
    return;
  }

  await local.$transaction(async (tx) => {
    if (userRows.length > 0) {
      await tx.user.createMany({ data: userRows, skipDuplicates: true });
    }

    const localEmailToId = new Map(
      (await tx.user.findMany({ select: { id: true, email: true } })).map(
        (u) => [u.email.toLowerCase(), u.id],
      ),
    );

    for (const user of toImport) {
      if (!user.createdById) {
        continue;
      }
      const creatorEmail = stagingEmailById.get(user.createdById);
      if (!creatorEmail) {
        continue;
      }
      const localCreatorId = localEmailToId.get(creatorEmail.toLowerCase());
      if (!localCreatorId || localCreatorId === user.id) {
        continue;
      }
      await tx.user.update({
        where: { id: user.id },
        data: { createdById: localCreatorId },
      });
    }

    if (roleRows.length > 0) {
      await tx.userRole.createMany({ data: roleRows, skipDuplicates: true });
    }
    if (teamRows.length > 0) {
      await tx.userTeam.createMany({ data: teamRows, skipDuplicates: true });
    }
    if (coverageRows.length > 0) {
      await tx.userCountryCoverage.createMany({
        data: coverageRows,
        skipDuplicates: true,
      });
    }
    if (professionRows.length > 0) {
      await tx.userProfessionScope.createMany({
        data: professionRows,
        skipDuplicates: true,
      });
    }
    if (languageRows.length > 0) {
      await tx.userLanguage.createMany({
        data: languageRows,
        skipDuplicates: true,
      });
    }

    for (const seq of stagingSequences) {
      const existing = await tx.employeeCodeSequence.findUnique({
        where: { year: seq.year },
      });
      const lastNumber = Math.max(existing?.lastNumber ?? 0, seq.lastNumber);
      await tx.employeeCodeSequence.upsert({
        where: { year: seq.year },
        create: { year: seq.year, lastNumber },
        update: { lastNumber },
      });
    }
  });

  const finalCount = await local.user.count();
  const jubairiya = await local.user.findUnique({
    where: { email: 'jubairiya@affiniks.com' },
    include: {
      userRoles: { include: { role: true } },
      userCountryCoverages: true,
      userProfessionScopes: true,
    },
  });
  const admin = await local.user.findUnique({
    where: { email: 'admin@affiniks.com' },
    select: { id: true, name: true, mobileNumber: true },
  });

  console.log('\n--- Result ---');
  console.log(`Local user count: ${finalCount}`);
  console.log(
    `Seed admin kept: ${admin ? `${admin.name} / ${admin.mobileNumber}` : 'MISSING'}`,
  );
  if (jubairiya) {
    console.log(
      `jubairiya@affiniks.com: ${jubairiya.name}  code=${jubairiya.employeeCode ?? '(none)'}  roles=${jubairiya.userRoles.map((r) => r.role.name).join(', ') || '(none)'}  coverage=${jubairiya.userCountryCoverages.length}  scopes=${jubairiya.userProfessionScopes.length}`,
    );
  } else if (importIds.size > 0) {
    console.warn('jubairiya@affiniks.com was not found after import');
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!existsSync(args.backup)) {
    throw new Error(`Backup file not found: ${args.backup}`);
  }

  console.log(`Backup:  ${args.backup}`);
  console.log(
    `Local:   postgresql://${PG_USER}:***@${PG_HOST}:${PG_PORT}/${LOCAL_DB}?schema=public`,
  );
  console.log(`Staging: ${STAGING_DB}`);
  console.log(`Mode:    ${args.dryRun ? 'dry-run' : 'write'}`);

  restoreBackupToStaging(args.backup);

  const local = new PrismaClient({ datasources: { db: { url: LOCAL_URL } } });
  const staging = new PrismaClient({
    datasources: { db: { url: STAGING_URL } },
  });

  try {
    const stagingCount = await staging.user.count();
    if (stagingCount === 0) {
      throw new Error(
        'Staging restore produced 0 users. Check pg_restore output above.',
      );
    }
    await importUsers(local, staging, args.dryRun);
  } finally {
    await staging.$disconnect();
    await local.$disconnect();
    if (!args.keepStaging) {
      dropStaging();
    } else {
      console.log(`Keeping staging database ${STAGING_DB}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
