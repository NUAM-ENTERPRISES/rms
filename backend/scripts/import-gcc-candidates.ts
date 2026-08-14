import { existsSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { CandidatesService } from '../src/candidates/candidates.service';
import { PrismaService } from '../src/database/prisma.service';
import { GCC_NURSE_SHEETS } from '../src/candidates/import/gcc-import.constants';
import { parseGccCliArgs, runGccImport, GccImportReport } from '../src/candidates/import/gcc-import.engine';
import { ROLE_NAMES } from '../src/common/constants/role-ids';
import {
  assertLocalImportSafety,
} from '../src/candidates/import/gcc-import.safety';

function compactTotals(report: GccImportReport) {
  const { invalidPhoneRows: _rows, ...rest } = report.totals;
  return rest;
}

function compactInvalidSummary(report: GccImportReport) {
  const s = report.invalidSummary;
  return {
    invalidPhones: { count: s.invalidPhones.count, byReason: s.invalidPhones.byReason },
    duplicatePhones: s.duplicatePhones,
    nameValidation: s.nameValidation,
    otherValidation: s.otherValidation,
  };
}
import { ROLE_NAMES } from '../src/common/constants/role-ids';
import {
  assertLocalImportSafety,
} from '../src/candidates/import/gcc-import.safety';

function loadDotEnv(filePath: string): void {
  if (!existsSync(filePath)) return;
  const text = require('fs').readFileSync(filePath, 'utf8') as string;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function printHelp(): void {
  console.log(`
LOCAL-ONLY GCC Nurse candidate import.

Default is dry-run (no writes).

Dry-run:
  npm run import:gcc -- --excel "/path/to/GCC_LIVE DATA.xlsx"

Print recruiter users to fill the map (read-only):
  npm run import:gcc -- --print-recruiter-map --i-am-local-test-db

Apply (requires BOTH flags):
  npm run import:gcc -- --excel "/path/to/GCC_LIVE DATA.xlsx" --i-am-local-test-db --apply

Optional:
  --sheet RAHUL
  --map backend/scripts/.gcc-recruiter-map.json
`);
}

async function printRecruiterMap(prisma: PrismaClient): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      accountStatus: 'ACTIVE',
      userRoles: { some: { role: { name: ROLE_NAMES.RECRUITER } } },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
  const template: Record<string, string> = {};
  for (const sheet of GCC_NURSE_SHEETS) template[sheet] = '';
  console.log(
    JSON.stringify(
      {
        recruitersFound: users,
        requiredSheets: GCC_NURSE_SHEETS,
        template,
      },
      null,
      2,
    ),
  );
}

async function main(): Promise<void> {
  const backendRoot = join(__dirname, '..');
  loadDotEnv(join(backendRoot, '.env'));

  const args = parseGccCliArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  assertLocalImportSafety({
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    flags: {
      apply: args.apply,
      iAmLocalTestDb: args.iAmLocalTestDb,
      excelPath: args.excelPath,
    },
  });

  const mapPath =
    args.mapPath ?? join(backendRoot, 'scripts', '.gcc-recruiter-map.json');
  const reportsDir = join(backendRoot, 'scripts', 'reports');

  if (args.printRecruiterMap) {
    const prisma = new PrismaClient();
    try {
      await printRecruiterMap(prisma);
    } finally {
      await prisma.$disconnect();
    }
    return;
  }

  if (!args.excelPath) {
    printHelp();
    throw new Error('--excel is required unless using --print-recruiter-map');
  }

  if (args.apply && args.iAmLocalTestDb) {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });
    try {
      const candidatesService = app.get(CandidatesService);
      const prisma = app.get(PrismaService);
      const { report, reportPath } = await runGccImport({
        excelPath: args.excelPath,
        mapPath,
        flags: args,
        prisma,
        candidatesService,
        reportsDir,
        sheetFilter: args.sheet,
      });
      console.log(`Apply complete. Report: ${reportPath}`);
      console.log(
        JSON.stringify(
          { mode: report.mode, totals: compactTotals(report), invalidSummary: compactInvalidSummary(report) },
          null,
          2,
        ),
      );
    } finally {
      await app.close();
    }
    return;
  }

  const prisma = new PrismaClient();
  try {
    const { report, reportPath } = await runGccImport({
      excelPath: args.excelPath,
      mapPath,
      flags: args,
      prisma,
      reportsDir,
      sheetFilter: args.sheet,
    });
    console.log(`Dry-run complete. Report: ${reportPath}`);
    console.log(
      JSON.stringify(
        { mode: report.mode, totals: compactTotals(report), invalidSummary: compactInvalidSummary(report) },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
