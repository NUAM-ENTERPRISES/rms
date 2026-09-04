import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const WELL_KNOWN_ADC = join('.config', 'gcloud', 'application_default_credentials.json');

function isReadableFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * True when a Google ADC file is usable. A dedicated service-account key
 * (`VERTEX_SA_EMAIL` + `VERTEX_PRIVATE_KEY`) is a separate auth path.
 *
 * When `credentialsPath` is set (Docker: `/gcp/adc.json`), only that path is
 * checked — a missing bind-mount becomes a directory, which must not count.
 * When it is unset, native `gcloud auth application-default login` is used.
 */
export function hasVertexAdc(options?: {
  credentialsPath?: string;
  home?: string;
}): boolean {
  if (options?.credentialsPath) {
    return isReadableFile(options.credentialsPath);
  }
  const home = options?.home ?? process.env.HOME ?? process.env.USERPROFILE;
  if (!home) return false;
  return isReadableFile(join(home, WELL_KNOWN_ADC));
}

/** Vertex `generateContent` host differs for the `global` multi-region. */
export function vertexGenerateContentUrl(
  projectId: string,
  location: string,
  model: string,
): string {
  const host =
    location === 'global'
      ? 'https://aiplatform.googleapis.com'
      : `https://${location}-aiplatform.googleapis.com`;
  return `${host}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
}
