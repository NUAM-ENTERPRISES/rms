import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { google } from 'googleapis';
import {
  VertexGenerateOptions,
  VertexGenerateResult,
  VertexUsage,
} from './vertex-ai.types';
import { hasVertexAdc, vertexGenerateContentUrl } from './vertex-ai.util';

const VERTEX_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const DEFAULT_LOCATION = 'global';
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1_000;
/** Tokens are refreshed a minute early so a long call cannot expire mid-flight. */
const TOKEN_EXPIRY_SKEW_MS = 60_000;

/** Vertex is transient on these; anything else is a caller/config bug. */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

interface CachedToken {
  token: string;
  expiresAt: number;
}

/**
 * Thin wrapper over Vertex AI `generateContent`, restricted to structured JSON.
 *
 * Every caller supplies a `responseSchema`, so responses are parsed rather than
 * scraped. The service never throws raw provider errors outward: callers get a
 * `ServiceUnavailableException` and decide whether to degrade or fail the job.
 */
@Injectable()
export class VertexAiService {
  private readonly logger = new Logger(VertexAiService.name);

  private readonly projectId?: string;
  private readonly location: string;
  private readonly clientEmail?: string;
  private readonly privateKey?: string;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;

  private cachedToken: CachedToken | null = null;
  private tokenRequest: Promise<string> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT');
    this.location =
      this.configService.get<string>('GOOGLE_CLOUD_LOCATION') ?? DEFAULT_LOCATION;
    this.clientEmail = this.configService.get<string>('VERTEX_SA_EMAIL');
    this.privateKey = this.configService
      .get<string>('VERTEX_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');
    this.defaultModel =
      this.configService.get<string>('GEMINI_MODEL') ?? DEFAULT_MODEL;
    this.timeoutMs =
      Number(this.configService.get<string>('VERTEX_TIMEOUT_MS')) ||
      DEFAULT_TIMEOUT_MS;

    if (this.isConfigured()) {
      this.logger.log(
        `Vertex AI configured: project=${this.projectId} location=${this.location} model=${this.defaultModel} auth=${this.hasServiceAccount() ? 'service-account' : 'adc'}`,
      );
    } else {
      this.logger.warn(
        'Vertex AI is not configured. Set GOOGLE_CLOUD_PROJECT plus either ADC (GOOGLE_APPLICATION_CREDENTIALS / gcloud ADC) or VERTEX_SA_EMAIL and VERTEX_PRIVATE_KEY.',
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(this.projectId && (this.hasServiceAccount() || this.hasAdc()));
  }

  private hasServiceAccount(): boolean {
    return Boolean(this.clientEmail && this.privateKey);
  }

  private hasAdc(): boolean {
    return hasVertexAdc({
      credentialsPath:
        this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS') ??
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
      home: process.env.HOME,
    });
  }

  /**
   * Runs one structured-JSON generation and returns the parsed payload.
   *
   * @throws ServiceUnavailableException when Vertex is unconfigured, keeps
   * failing after retries, or returns something that is not valid JSON.
   */
  async generateStructured<T>(
    options: VertexGenerateOptions,
  ): Promise<VertexGenerateResult<T>> {
    const projectId = this.projectId;
    if (!this.isConfigured() || !projectId) {
      throw new ServiceUnavailableException(
        'Vertex AI is not configured on this environment.',
      );
    }

    const model = options.model ?? this.defaultModel;
    const label = options.callerLabel ?? 'vertex-ai';
    const startedAt = Date.now();

    const body = this.buildRequestBody(options);
    const url = vertexGenerateContentUrl(projectId, this.location, model);

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const token = await this.getAccessToken();
        const response = await axios.post(url, body, {
          timeout: this.timeoutMs,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const text = this.extractText(response.data);
        const data = this.parseJson<T>(text, label);
        const usage = this.extractUsage(response.data);
        const durationMs = Date.now() - startedAt;

        this.logger.log(
          `${label}: ok model=${model} attempt=${attempt} duration=${durationMs}ms tokens=${usage?.totalTokens ?? 'n/a'}`,
        );

        return { data, usage, model, durationMs };
      } catch (error) {
        lastError = error;
        const status = this.statusOf(error);

        // A 401 usually means the cached token went stale; drop it and retry.
        if (status === 401 || status === 403) {
          this.cachedToken = null;
        }

        const retryable = status === undefined || RETRYABLE_STATUSES.has(status) || status === 401;
        if (!retryable || attempt === MAX_ATTEMPTS) {
          break;
        }

        const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1);
        this.logger.warn(
          `${label}: attempt ${attempt}/${MAX_ATTEMPTS} failed (status=${status ?? 'none'}); retrying in ${backoff}ms`,
        );
        await this.sleep(backoff);
      }
    }

    const detail = this.describeError(lastError);
    this.logger.error(`${label}: giving up after ${MAX_ATTEMPTS} attempts. ${detail}`);
    throw new ServiceUnavailableException(
      `Vertex AI request failed for ${label}: ${detail}`,
    );
  }

  private buildRequestBody(options: VertexGenerateOptions) {
    const parts: Array<Record<string, unknown>> = [{ text: options.prompt }];
    for (const inline of options.inlineData ?? []) {
      parts.push({
        inlineData: { mimeType: inline.mimeType, data: inline.data },
      });
    }

    return {
      contents: [{ role: 'user', parts }],
      ...(options.systemInstruction
        ? {
            systemInstruction: {
              role: 'system',
              parts: [{ text: options.systemInstruction }],
            },
          }
        : {}),
      generationConfig: {
        temperature: options.temperature ?? 0,
        maxOutputTokens: options.maxOutputTokens ?? 8192,
        responseMimeType: 'application/json',
        responseSchema: options.responseSchema,
      },
    };
  }

  /**
   * Mints and caches a service-account access token. Concurrent callers share
   * one in-flight request so a burst of rows does not mint a token each.
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt - TOKEN_EXPIRY_SKEW_MS > now) {
      return this.cachedToken.token;
    }
    if (this.tokenRequest) {
      return this.tokenRequest;
    }

    this.tokenRequest = (async () => {
      try {
        this.cachedToken = await this.mintAccessToken();
        return this.cachedToken.token;
      } finally {
        this.tokenRequest = null;
      }
    })();

    return this.tokenRequest;
  }

  /**
   * Prefers an explicit service-account PEM when present; otherwise uses ADC
   * (Docker-mounted JSON or `gcloud auth application-default login`).
   */
  private async mintAccessToken(): Promise<CachedToken> {
    if (this.hasServiceAccount()) {
      const jwt = new google.auth.JWT({
        email: this.clientEmail,
        key: this.privateKey,
        scopes: [VERTEX_SCOPE],
      });
      const credentials = await jwt.authorize();
      if (!credentials.access_token) {
        throw new Error('Vertex AI token response contained no access_token.');
      }
      return {
        token: credentials.access_token,
        expiresAt: credentials.expiry_date ?? Date.now() + 3_600_000,
      };
    }

    const auth = new google.auth.GoogleAuth({ scopes: [VERTEX_SCOPE] });
    const token = await auth.getAccessToken();
    if (!token) {
      throw new Error('Vertex AI ADC did not return an access token.');
    }
    return {
      token,
      expiresAt: Date.now() + 3_000_000,
    };
  }

  private extractText(payload: any): string {
    const candidate = payload?.candidates?.[0];
    if (!candidate) {
      throw new Error('Vertex AI returned no candidates.');
    }
    // A truncated response yields unparseable JSON; name the cause up front.
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(
        `Vertex AI stopped early with finishReason=${candidate.finishReason}.`,
      );
    }
    const text = (candidate.content?.parts ?? [])
      .map((part: { text?: string }) => part?.text ?? '')
      .join('')
      .trim();
    if (!text) {
      throw new Error('Vertex AI returned an empty response body.');
    }
    return text;
  }

  private parseJson<T>(text: string, label: string): T {
    try {
      return JSON.parse(text) as T;
    } catch {
      // responseMimeType should prevent this, but some models still fence output.
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenced?.[1]) {
        try {
          return JSON.parse(fenced[1]) as T;
        } catch {
          /* fall through to the shared error below */
        }
      }
      throw new Error(
        `${label}: response was not valid JSON (first 200 chars: ${text.slice(0, 200)})`,
      );
    }
  }

  private extractUsage(payload: any): VertexUsage | null {
    const usage = payload?.usageMetadata;
    if (!usage) return null;
    return {
      promptTokens: usage.promptTokenCount ?? 0,
      candidateTokens: usage.candidatesTokenCount ?? 0,
      totalTokens: usage.totalTokenCount ?? 0,
    };
  }

  /**
   * The repo pins a deprecated `@types/axios@0.9` stub that shadows axios 1.x's
   * own types, so `AxiosError` and `isAxiosError` are not importable here. This
   * narrows structurally instead.
   */
  private asHttpError(
    error: unknown,
  ): { status?: number; message: string } | null {
    if (!error || typeof error !== 'object') return null;
    const candidate = error as {
      isAxiosError?: boolean;
      message?: string;
      response?: { status?: number; data?: { error?: { message?: string } } };
    };
    if (!candidate.isAxiosError) return null;
    return {
      status: candidate.response?.status,
      message:
        candidate.response?.data?.error?.message ??
        candidate.message ??
        'Unknown axios error',
    };
  }

  private statusOf(error: unknown): number | undefined {
    return this.asHttpError(error)?.status;
  }

  private describeError(error: unknown): string {
    const httpError = this.asHttpError(error);
    if (httpError) {
      return httpError.status
        ? `HTTP ${httpError.status}: ${httpError.message}`
        : httpError.message;
    }
    return error instanceof Error ? error.message : String(error);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
