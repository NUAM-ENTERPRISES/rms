/**
 * Minimal subset of the Vertex AI `generateContent` contract that this codebase
 * uses. Only structured-JSON responses are supported on purpose: every caller
 * declares a response schema so the model cannot drift into free prose.
 */

/** Subset of OpenAPI 3 types accepted by Vertex `responseSchema`. */
export type VertexSchemaType =
  | 'STRING'
  | 'NUMBER'
  | 'INTEGER'
  | 'BOOLEAN'
  | 'ARRAY'
  | 'OBJECT';

export interface VertexSchema {
  type: VertexSchemaType;
  description?: string;
  nullable?: boolean;
  enum?: string[];
  format?: string;
  items?: VertexSchema;
  properties?: Record<string, VertexSchema>;
  required?: string[];
}

/** An inline image or PDF page handed to the model alongside the prompt. */
export interface VertexInlineData {
  mimeType: string;
  /** Base64-encoded bytes, without a data-URL prefix. */
  data: string;
}

export interface VertexGenerateOptions {
  /** System-level framing; kept separate so prompts stay cacheable. */
  systemInstruction?: string;
  prompt: string;
  responseSchema: VertexSchema;
  inlineData?: VertexInlineData[];
  /** Defaults to 0 so catalog mapping is reproducible run to run. */
  temperature?: number;
  maxOutputTokens?: number;
  /** Overrides VERTEX_MODEL for a single call. */
  model?: string;
  /** Free-text label used only in logs to trace which feature made the call. */
  callerLabel?: string;
}

export interface VertexUsage {
  promptTokens: number;
  candidateTokens: number;
  totalTokens: number;
}

export interface VertexGenerateResult<T> {
  data: T;
  usage: VertexUsage | null;
  model: string;
  /** Wall-clock duration of the whole call including retries. */
  durationMs: number;
}
