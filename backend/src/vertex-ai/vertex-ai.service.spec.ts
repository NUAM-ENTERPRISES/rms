import { ConfigService } from '@nestjs/config';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VertexAiService } from './vertex-ai.service';

function service(env: Record<string, string | undefined>): VertexAiService {
  return new VertexAiService({
    get: (key: string) => env[key],
  } as ConfigService);
}

describe('VertexAiService.isConfigured', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'vertex-svc-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('is true when a service-account PEM is present', () => {
    expect(
      service({
        VERTEX_PROJECT_ID: 'resume-analyst-ai-504411',
        VERTEX_SA_EMAIL: 'vertex@example.iam.gserviceaccount.com',
        VERTEX_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
      }).isConfigured(),
    ).toBe(true);
  });

  it('is true when ADC is mounted and the project is set', () => {
    const adc = join(dir, 'adc.json');
    writeFileSync(adc, '{}');
    expect(
      service({
        VERTEX_PROJECT_ID: 'resume-analyst-ai-504411',
        GOOGLE_APPLICATION_CREDENTIALS: adc,
      }).isConfigured(),
    ).toBe(true);
  });

  it('is false when the project is missing even if ADC exists', () => {
    const adc = join(dir, 'adc.json');
    writeFileSync(adc, '{}');
    expect(
      service({ GOOGLE_APPLICATION_CREDENTIALS: adc }).isConfigured(),
    ).toBe(false);
  });

  it('is false when Docker bind-mounted a missing ADC as a directory', () => {
    const adc = join(dir, 'adc.json');
    mkdirSync(adc);
    expect(
      service({
        VERTEX_PROJECT_ID: 'resume-analyst-ai-504411',
        GOOGLE_APPLICATION_CREDENTIALS: adc,
      }).isConfigured(),
    ).toBe(false);
  });
});
