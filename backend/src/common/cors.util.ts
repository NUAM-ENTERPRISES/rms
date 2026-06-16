/**
 * Builds the allowed browser origins for CORS (HTTP + WebSocket).
 * Mirrors localhost <-> 127.0.0.1 so dev works regardless of which URL is opened.
 */
export function buildCorsOriginAllowlist(): string[] {
  const fromEnv = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowlist = new Set<string>(fromEnv);

  for (const origin of fromEnv) {
    try {
      const url = new URL(origin);
      const port = url.port ? `:${url.port}` : '';

      if (url.hostname === 'localhost') {
        allowlist.add(`${url.protocol}//127.0.0.1${port}`);
      } else if (url.hostname === '127.0.0.1') {
        allowlist.add(`${url.protocol}//localhost${port}`);
      }
    } catch {
      // Ignore invalid origin entries in CORS_ORIGIN
    }
  }

  return [...allowlist];
}

export function corsOriginCallback(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean | string) => void,
): void {
  const allowlist = new Set(buildCorsOriginAllowlist());
  const fallback = [...allowlist][0] ?? 'http://localhost:5173';

  if (!origin || allowlist.has(origin)) {
    callback(null, origin ?? fallback);
    return;
  }

  callback(new Error(`Origin ${origin} not allowed by CORS`));
}
