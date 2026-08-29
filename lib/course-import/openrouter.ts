import { getCanonicalSiteOrigin } from "../supabase/config.ts";

export const DEFAULT_OPENROUTER_MODEL = "google/gemini-3.1-flash-lite";
export const OPENROUTER_SCHEMA_VERSION = "course-extraction.v1";
export const OPENROUTER_PROMPT_VERSION = "course-parser.v1";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const OPENROUTER_REQUEST_TIMEOUT_MS = 35_000;
const MODEL_SLUG_PATTERN = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]*$/;

type JsonSchema = Record<string, unknown>;

export type OpenRouterCourseRequestBody = {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature: 0;
  max_tokens: number;
  stream: false;
  reasoning: { effort: "minimal"; exclude: true };
  provider: { require_parameters: true };
  response_format: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: true;
      schema: JsonSchema;
    };
  };
};

type OpenRouterUsage = {
  prompt_tokens?: unknown;
  completion_tokens?: unknown;
  total_tokens?: unknown;
  cost?: unknown;
  prompt_tokens_details?: {
    cached_tokens?: unknown;
  } | null;
  completion_tokens_details?: {
    reasoning_tokens?: unknown;
  } | null;
};

type OpenRouterResponse = {
  id?: unknown;
  model?: unknown;
  created?: unknown;
  choices?: Array<{
    finish_reason?: unknown;
    message?: {
      content?: unknown;
    };
  }>;
  usage?: OpenRouterUsage | null;
};

export type OpenRouterCourseExtraction = {
  generationId: string | null;
  requestedModel: string;
  resolvedModel: string;
  finishReason: string | null;
  content: string | null;
  parsed: unknown;
  responseError: string | null;
  latencyMilliseconds: number;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    cachedInputTokens: number | null;
    reasoningTokens: number | null;
    costUsd: number | null;
  };
  responseForAudit: {
    id: string | null;
    model: string;
    created: number | null;
    finishReason: string | null;
    content: string | null;
    responseError: string | null;
    rawResponseText: string | null;
    usage: OpenRouterCourseExtraction["usage"];
    latencyMilliseconds: number;
  };
};

export class OpenRouterConfigurationError extends Error {
  constructor(
    message = "Configure a dedicated OPENROUTER_API_KEY before importing courses.",
  ) {
    super(message);
    this.name = "OpenRouterConfigurationError";
  }
}

export class OpenRouterRequestError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenRouterRequestError";
    this.status = status;
    this.retryable =
      status === 408 || status === 409 || status === 429 || status >= 500;
  }
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nonNegativeInteger(value: unknown) {
  const number = finiteNumber(value);
  return number !== null && Number.isInteger(number) && number >= 0
    ? number
    : null;
}

export function configuredOpenRouterModels(
  env: NodeJS.ProcessEnv = process.env,
) {
  const configured = env.COURSEMAP_OPENROUTER_MODELS;
  if (configured === undefined || configured.trim() === "") {
    return [DEFAULT_OPENROUTER_MODEL];
  }
  return [
    ...new Set(
      configured
        .split(",")
        .map((model) => model.trim().toLowerCase())
        .filter((model) => MODEL_SLUG_PATTERN.test(model)),
    ),
  ];
}

export function assertAllowedOpenRouterModel(
  model: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const normalised = model.trim().toLowerCase();
  if (!configuredOpenRouterModels(env).includes(normalised)) {
    throw new TypeError("Choose a configured OpenRouter model.");
  }
  return normalised;
}

function requireOpenRouterKey(env: NodeJS.ProcessEnv) {
  const key = env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new OpenRouterConfigurationError();
  return key;
}

export function buildOpenRouterCourseRequestBody({
  model,
  systemPrompt,
  modelInput,
  schema,
  schemaName = "course_extraction",
  maxOutputTokens = 12_000,
  env = process.env,
}: {
  model: string;
  systemPrompt: string;
  modelInput: string;
  schema: JsonSchema;
  schemaName?: string;
  maxOutputTokens?: number;
  env?: NodeJS.ProcessEnv;
}): OpenRouterCourseRequestBody {
  const requestedModel = assertAllowedOpenRouterModel(model, env);
  if (!systemPrompt.trim() || !modelInput.trim()) {
    throw new TypeError(
      "OpenRouter extraction requires a prompt and course input.",
    );
  }
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 256) {
    throw new TypeError("maxOutputTokens must be an integer of at least 256.");
  }
  return {
    model: requestedModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: modelInput },
    ],
    temperature: 0,
    max_tokens: maxOutputTokens,
    stream: false,
    reasoning: { effort: "minimal", exclude: true },
    provider: { require_parameters: true },
    response_format: {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        strict: true,
        schema,
      },
    },
  };
}

function responseContent(response: unknown) {
  if (typeof response !== "object" || response === null) return null;
  const content = (response as OpenRouterResponse).choices?.[0]?.message
    ?.content;
  return typeof content === "string" && content.trim() ? content : null;
}

function parseStructuredContent(content: string | null) {
  if (content === null) {
    return {
      parsed: null,
      responseError: "OpenRouter returned no structured course extraction.",
    };
  }
  try {
    return { parsed: JSON.parse(content) as unknown, responseError: null };
  } catch {
    return {
      parsed: null,
      responseError:
        "OpenRouter returned invalid JSON despite structured-output mode.",
    };
  }
}

function auditNullableNumber(value: unknown, field: string) {
  if (value === null) return null;
  const parsed = finiteNumber(value);
  if (parsed === null || parsed < 0) {
    throw new TypeError(`Stored OpenRouter ${field} is invalid.`);
  }
  return parsed;
}

/** Reconstructs a paid model result from its verified audit artefact. */
export function restoreOpenRouterCourseExtraction(
  value: unknown,
  requestedModel: string,
): OpenRouterCourseExtraction {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Stored OpenRouter response is invalid.");
  }
  const audit = value as Record<string, unknown>;
  if (
    typeof audit.model !== "string" ||
    !audit.model.trim() ||
    (audit.content !== null && typeof audit.content !== "string") ||
    typeof audit.usage !== "object" ||
    audit.usage === null ||
    Array.isArray(audit.usage)
  ) {
    throw new TypeError("Stored OpenRouter response is incomplete.");
  }
  const usage = audit.usage as Record<string, unknown>;
  const responseError =
    typeof audit.responseError === "string" && audit.responseError.trim()
      ? audit.responseError
      : null;
  const rawResponseText =
    typeof audit.rawResponseText === "string" ? audit.rawResponseText : null;
  const latencyMilliseconds = auditNullableNumber(
    audit.latencyMilliseconds,
    "latency",
  );
  if (latencyMilliseconds === null) {
    throw new TypeError("Stored OpenRouter latency is missing.");
  }

  const structured = parseStructuredContent(audit.content as string | null);
  return {
    generationId: typeof audit.id === "string" ? audit.id : null,
    requestedModel: assertAllowedOpenRouterModel(requestedModel),
    resolvedModel: audit.model,
    finishReason:
      typeof audit.finishReason === "string" ? audit.finishReason : null,
    content: audit.content as string | null,
    parsed: structured.parsed,
    responseError: responseError ?? structured.responseError,
    latencyMilliseconds,
    usage: {
      inputTokens: auditNullableNumber(usage.inputTokens, "input tokens"),
      outputTokens: auditNullableNumber(usage.outputTokens, "output tokens"),
      totalTokens: auditNullableNumber(usage.totalTokens, "total tokens"),
      cachedInputTokens: auditNullableNumber(
        usage.cachedInputTokens,
        "cached input tokens",
      ),
      reasoningTokens: auditNullableNumber(
        usage.reasoningTokens,
        "reasoning tokens",
      ),
      costUsd: auditNullableNumber(usage.costUsd, "cost"),
    },
    responseForAudit: {
      ...(audit as OpenRouterCourseExtraction["responseForAudit"]),
      rawResponseText,
    },
  };
}

function safeErrorMessage(body: unknown, status: number) {
  if (typeof body === "object" && body !== null) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === "object" && error !== null) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) {
        return `OpenRouter request failed (${status}): ${message.trim()}`;
      }
    }
  }
  return `OpenRouter request failed with HTTP ${status}.`;
}

/**
 * Request one strict course extraction. The API key and response reasoning are
 * deliberately excluded from the returned audit object.
 */
export async function extractCourseWithOpenRouter({
  model,
  systemPrompt,
  modelInput,
  schema,
  schemaName = "course_extraction",
  maxOutputTokens = 12_000,
  env = process.env,
  fetchImpl = fetch,
  signal,
}: {
  model: string;
  systemPrompt: string;
  modelInput: string;
  schema: JsonSchema;
  schemaName?: string;
  maxOutputTokens?: number;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}): Promise<OpenRouterCourseExtraction> {
  const requestBody = buildOpenRouterCourseRequestBody({
    model,
    systemPrompt,
    modelInput,
    schema,
    schemaName,
    maxOutputTokens,
    env,
  });
  const requestedModel = requestBody.model;
  const apiKey = requireOpenRouterKey(env);

  const startedAt = performance.now();
  const response = await fetchImpl(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Coursemap course importer",
      ...(getCanonicalSiteOrigin()
        ? { "HTTP-Referer": getCanonicalSiteOrigin()! }
        : {}),
    },
    body: JSON.stringify(requestBody),
    redirect: "error",
    signal: signal
      ? AbortSignal.any([
          signal,
          AbortSignal.timeout(OPENROUTER_REQUEST_TIMEOUT_MS),
        ])
      : AbortSignal.timeout(OPENROUTER_REQUEST_TIMEOUT_MS),
  });

  const responseText = await response.text();
  let body: unknown;
  let responseWasJson = true;
  try {
    body = JSON.parse(responseText) as unknown;
  } catch {
    body = null;
    responseWasJson = false;
  }
  if (!response.ok) {
    throw new OpenRouterRequestError(
      safeErrorMessage(body, response.status),
      response.status,
    );
  }

  const parsedResponse =
    typeof body === "object" && body !== null
      ? (body as OpenRouterResponse)
      : {};
  const content = responseContent(parsedResponse);
  const structured = parseStructuredContent(content);
  const responseError = responseWasJson
    ? structured.responseError
    : "OpenRouter returned a non-JSON HTTP response.";
  const usage = parsedResponse.usage;
  const resultUsage = {
    inputTokens: nonNegativeInteger(usage?.prompt_tokens),
    outputTokens: nonNegativeInteger(usage?.completion_tokens),
    totalTokens: nonNegativeInteger(usage?.total_tokens),
    cachedInputTokens: nonNegativeInteger(
      usage?.prompt_tokens_details?.cached_tokens,
    ),
    reasoningTokens: nonNegativeInteger(
      usage?.completion_tokens_details?.reasoning_tokens,
    ),
    costUsd: finiteNumber(usage?.cost),
  };
  const resolvedModel =
    typeof parsedResponse.model === "string" && parsedResponse.model.trim()
      ? parsedResponse.model.trim()
      : requestedModel;
  const finishReason =
    typeof parsedResponse.choices?.[0]?.finish_reason === "string"
      ? parsedResponse.choices[0].finish_reason
      : null;
  const generationId =
    typeof parsedResponse.id === "string" && parsedResponse.id.trim()
      ? parsedResponse.id.trim()
      : null;
  const created = nonNegativeInteger(parsedResponse.created);
  const latencyMilliseconds = Math.max(
    0,
    Math.round(performance.now() - startedAt),
  );

  return {
    generationId,
    requestedModel,
    resolvedModel,
    finishReason,
    content,
    parsed: structured.parsed,
    responseError,
    latencyMilliseconds,
    usage: resultUsage,
    responseForAudit: {
      id: generationId,
      model: resolvedModel,
      created,
      finishReason,
      content,
      responseError,
      rawResponseText: responseWasJson ? null : responseText.slice(0, 16_000),
      usage: resultUsage,
      latencyMilliseconds,
    },
  };
}
