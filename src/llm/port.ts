/**
 * The single LLM port.
 *
 * Every agent that needs a model talks to it through this interface and nothing
 * else. Three adapters sit behind it:
 *
 *  1. `MeterlessProviderAdapter` — the hosted Meterless provider, OpenAI-format
 *     chat/completions. This is the route to NVIDIA Nemotron (Super / Nano / Ultra).
 *  2. `MeterlessRuntimeAdapter` — the local Meterless Runtime (Nightshift hotspot).
 *  3. `OfflineAdapter` — deterministic, no key, no credit, no network.
 *
 * We hold **no NVIDIA account, no NVIDIA key and no NVIDIA billing**. Nemotron is a
 * model the Meterless fleet already serves; we ask the provider for it, the way a
 * Cursor user asks Cursor for Grok.
 *
 * The rules the Meterless adapters implement (provider contract v4) — these live
 * here, in the code that implements them, not in prose:
 *  - URL is normalised to `<host>/v1`. Never `/v1/v1`.
 *  - `Authorization: Bearer <token>` on every call.
 *  - `meterless-app: <stable lowercase id>` on every request;
 *    `meterless-scope: user` on chat.
 *  - **Model ids are routing modes, not models.** The adapter reads the ids the
 *    provider actually exposes and keeps any `meterless/*` id it does not recognise.
 *    A model name is a preference, never a hard requirement.
 *  - `GET /v1/models` decides status (401/403 = unauthorized, 200 = online);
 *    `GET /healthz` only proves the process is up.
 *  - 180 s timeout, because a cold model load can take minutes.
 *
 * INTERFACE ONLY — the adapters are build-window work.
 */

export type LlmRole = 'system' | 'user' | 'assistant'

export interface LlmMessage {
  role: LlmRole
  content: string
}

export interface LlmRequest {
  messages: LlmMessage[]
  /** Provider-specific model id. Omitted means "the adapter's default". */
  model?: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

/**
 * What happened to the routing mode the caller asked for.
 *
 * A model id is a *routing mode*, not a model name, and the provider decides what
 * it offers. When the mode a caller asked for is not on offer, the adapter falls
 * back to one that is — and says so here. It never swaps silently.
 */
export interface LlmRoutingNote {
  /** The routing mode the caller asked for. */
  requested: string
  /** The routing mode that actually served the request. */
  used: string
  /** Why it changed. */
  reason: string
}

export interface LlmResponse {
  /** Plain text. A plain text request stays a string, exactly like OpenAI. */
  text: string
  /** The model or routing mode that actually served this. */
  model: string
  /** Set when the requested routing mode was not offered and another one was used. */
  routing?: LlmRoutingNote
  raw?: unknown
}

export type LlmHealthState = 'online' | 'offline' | 'unauthorized'

export interface LlmHealth {
  state: LlmHealthState
  reason?: string
  baseUrl?: string
}

/**
 * Liveness is not health.
 *
 * `GET <host>/healthz` only proves the process is up — it says nothing about
 * whether the provider will serve a model, and it never needs a token. Health is
 * decided by `GET <host>/v1/models`, where a 401 or 403 means `unauthorized`:
 * a different thing, and only one of them is fixable by pasting a key.
 */
export interface LlmLiveness {
  up: boolean
  detail?: string
  baseUrl?: string
}

export interface LlmPort {
  /** Stable id used as the `meterless-app` header value. */
  readonly appId: string
  readonly name: string
  /** The resolved base URL, once the adapter knows it. */
  readonly baseUrl?: string
  complete(request: LlmRequest): Promise<LlmResponse>
  /**
   * A wrong token must report `unauthorized`, never `offline` — they mean
   * different things to a user and only one of them is fixable by pasting a key.
   */
  health(): Promise<LlmHealth>
  /**
   * The routing ids this provider actually exposes. The adapter selects from
   * these instead of trusting a hard-coded model name, so a tier swap is
   * configuration rather than a code change.
   */
  models(): Promise<string[]>
  /** The process is up. Never throws. Optional: an adapter with no endpoint has none. */
  liveness?(): Promise<LlmLiveness>
}

/** The provider-neutral settings the registry reads. */
export interface LlmConfig {
  /** Hosted provider: `METERLESS_BASE_URL`. */
  baseUrl?: string
  /** Hosted provider: `METERLESS_API_KEY`. */
  apiKey?: string
  /** Hosted provider: a PREFERRED model id. Discovered ids win over it. */
  model?: string
  /**
   * Local runtime: an explicit base URL. **Unset means "find it"** — the runtime
   * is discovered on the known local ports rather than assumed to be on one.
   */
  runtimeBaseUrl?: string
  /** Local runtime: the real bearer token. `rt-local` is rejected upstream. */
  runtimeToken?: string
  /** Ports auto-detected, in order: 8088, 8090, 8787, 11434. */
  autoDetectPorts?: number[]
  /** 180 s — a cold model load can take minutes. */
  timeoutMs?: number
  appId?: string
}

/**
 * How a role maps onto a route.
 *
 * The tier is a *disposition*, not a model name: the reasoner wants the deepest
 * route available, the high-volume helpers want the fastest. What that resolves
 * to on a given provider is discovered at runtime.
 */
export interface RoutePreference {
  /** The routing id to ask for, e.g. `meterless/deep`. */
  disposition?: string
  /** Used when the provider exposes no matching route. */
  fallbackDisposition?: string
}
