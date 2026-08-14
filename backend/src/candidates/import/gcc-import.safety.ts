import { ALLOWED_DB_HOSTS } from './gcc-import.constants';

export class GccImportSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GccImportSafetyError';
  }
}

export type GccImportCliFlags = {
  apply: boolean;
  iAmLocalTestDb: boolean;
  excelPath?: string;
};

export type ParsedDatabaseUrl = {
  host: string;
  port: number | null;
  pathname: string;
};

export function parseDatabaseUrl(databaseUrl: string): ParsedDatabaseUrl {
  const parsed = new URL(databaseUrl);
  const port = parsed.port ? Number(parsed.port) : null;
  return {
    host: parsed.hostname,
    port: Number.isFinite(port) ? port : null,
    pathname: parsed.pathname,
  };
}

export function assertLocalImportSafety(params: {
  nodeEnv: string | undefined;
  databaseUrl: string | undefined;
  flags: GccImportCliFlags;
}): ParsedDatabaseUrl {
  const nodeEnv = (params.nodeEnv ?? '').trim().toLowerCase();
  if (nodeEnv === 'production') {
    throw new GccImportSafetyError(
      'Refusing to run: NODE_ENV=production',
    );
  }

  if (!params.databaseUrl) {
    throw new GccImportSafetyError('DATABASE_URL is not set');
  }

  let parsed: ParsedDatabaseUrl;
  try {
    parsed = parseDatabaseUrl(params.databaseUrl);
  } catch {
    throw new GccImportSafetyError('DATABASE_URL is not a valid URL');
  }

  const host = parsed.host.toLowerCase();
  if (!ALLOWED_DB_HOSTS.has(host)) {
    throw new GccImportSafetyError(
      `Refusing to run: DATABASE_URL host "${parsed.host}" is not a local allow-listed host`,
    );
  }

  if (
    (host === 'localhost' || host === '127.0.0.1' || host === '::1') &&
    parsed.port !== null &&
    parsed.port !== 5433
  ) {
    throw new GccImportSafetyError(
      `Refusing to run: local DATABASE_URL port must be 5433 (got ${parsed.port})`,
    );
  }

  if (params.flags.apply && !params.flags.iAmLocalTestDb) {
    throw new GccImportSafetyError(
      'Refusing writes: --apply requires --i-am-local-test-db',
    );
  }

  if (params.flags.apply && !params.flags.excelPath) {
    throw new GccImportSafetyError('--apply requires --excel <path>');
  }

  return parsed;
}

export function isApplyMode(flags: GccImportCliFlags): boolean {
  return flags.apply === true && flags.iAmLocalTestDb === true;
}
