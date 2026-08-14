import { existsSync, readFileSync } from 'fs';
import { GCC_NURSE_SHEETS, GccNurseSheet } from './gcc-import.constants';
import { ROLE_NAMES } from '../../common/constants/role-ids';
import { UserAccountStatus } from '@prisma/client';

export class GccImportMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GccImportMappingError';
  }
}

export type RecruiterMap = Record<string, string>;

export type RecruiterUserRow = {
  id: string;
  name: string;
  accountStatus: UserAccountStatus;
  userRoles: { role: { name: string } }[];
};

export function loadRecruiterMapFile(path: string): RecruiterMap {
  if (!existsSync(path)) {
    throw new GccImportMappingError(
      `Recruiter map file not found: ${path}. Use --print-recruiter-map then save backend/scripts/.gcc-recruiter-map.json`,
    );
  }
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new GccImportMappingError('Recruiter map must be a JSON object of sheet -> userId');
  }
  const map: RecruiterMap = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new GccImportMappingError(`Invalid user id for sheet ${key}`);
    }
    map[key.trim()] = value.trim();
  }
  return map;
}

export function assertCompleteNurseMap(map: RecruiterMap): void {
  const missing = GCC_NURSE_SHEETS.filter((sheet) => !map[sheet]);
  if (missing.length) {
    throw new GccImportMappingError(
      `Recruiter map missing sheets: ${missing.join(', ')}`,
    );
  }
}

export function validateMappedRecruiter(
  sheet: GccNurseSheet,
  user: RecruiterUserRow | null,
): void {
  if (!user) {
    throw new GccImportMappingError(`Mapped user not found for sheet ${sheet}`);
  }
  if (user.accountStatus !== UserAccountStatus.ACTIVE) {
    throw new GccImportMappingError(
      `Mapped user for ${sheet} is not ACTIVE (${user.accountStatus})`,
    );
  }
  const isRecruiter = user.userRoles.some(
    (ur) => ur.role.name.toLowerCase() === ROLE_NAMES.RECRUITER.toLowerCase(),
  );
  if (!isRecruiter) {
    throw new GccImportMappingError(
      `Mapped user for ${sheet} does not have Recruiter role`,
    );
  }
}
