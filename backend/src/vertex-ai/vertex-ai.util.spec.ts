import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hasVertexAdc, vertexGenerateContentUrl } from './vertex-ai.util';

describe('vertexGenerateContentUrl', () => {
  it('uses the unprefixed host for the global multi-region', () => {
    expect(
      vertexGenerateContentUrl('resume-analyst-ai-504411', 'global', 'gemini-3.1-flash-lite'),
    ).toBe(
      'https://aiplatform.googleapis.com/v1/projects/resume-analyst-ai-504411/locations/global/publishers/google/models/gemini-3.1-flash-lite:generateContent',
    );
  });

  it('uses the regional host for a named location', () => {
    expect(
      vertexGenerateContentUrl('proj', 'us-central1', 'gemini-2.0-flash'),
    ).toBe(
      'https://us-central1-aiplatform.googleapis.com/v1/projects/proj/locations/us-central1/publishers/google/models/gemini-2.0-flash:generateContent',
    );
  });
});

describe('hasVertexAdc', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'vertex-adc-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('accepts an explicit credentials file', () => {
    const path = join(dir, 'adc.json');
    writeFileSync(path, '{}');
    expect(hasVertexAdc({ credentialsPath: path })).toBe(true);
  });

  it('rejects a missing bind-mount path and a directory stand-in', () => {
    expect(hasVertexAdc({ credentialsPath: join(dir, 'missing.json') })).toBe(
      false,
    );
    const asDir = join(dir, 'adc.json');
    mkdirSync(asDir);
    expect(hasVertexAdc({ credentialsPath: asDir })).toBe(false);
  });

  it('falls back to the well-known gcloud ADC file when no path is set', () => {
    const wellKnown = join(dir, '.config', 'gcloud');
    mkdirSync(wellKnown, { recursive: true });
    writeFileSync(join(wellKnown, 'application_default_credentials.json'), '{}');
    expect(hasVertexAdc({ home: dir })).toBe(true);
    expect(hasVertexAdc({ home: join(dir, 'empty-home') })).toBe(false);
  });
});
