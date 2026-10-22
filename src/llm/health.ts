/**
 * The wire — the rules both HTTP adapters share.
 *
 * The hosted Meterless provider and the local Meterless Runtime speak the same
 * contract, so the contract lives in one file that both of them run on, and the
 * two adapters differ only in configuration and in their name.
 *
 * The rules are implemented here, in code that runs — not asserted in prose:
 *
 *  - the base URL is normalised to `<host>/v1`, never `/v1/v1`;
 *  - `Authorization: Bearer <token>` on every call, from the environment only;
 *  - `meterless-app` on every request, `meterless-scope: user` on chat;
 *  - model ids are routing modes: the adapter asks the provider what it exposes
 *    and keeps any `meterless/*` id it does not recognise;
 *  - `GET /v1/models` decides status — 401/403 is `unauthorized`, 200 is `online`;
 *    `GET /healthz` only proves the process is up;
 *  - 180 s timeout, because a cold model load can take minutes.
 *
 * Nothing here reads a secret from a file. `Bun.env` only.
 */

import type { LlmHealth, LlmLiveness, LlmRoutingNote } from './port.ts'

/** 180 s — a cold model load can take minutes. */
export const DEFAULT_TIMEOUT_MS = 180_000

/** The routing modes the contract names, in the order we prefer them. */
export const ROUTING_DISPOSITIONS = ['auto', 'deep', 'fast', 'cheap', 'local', 'fusion'] as const

/**
 * A provider that cannot answer. The state is part of the error, because
 * `unauthorized` (paste a token) and `offline` (the machine is down) are
 * different problems and only one of them is fixable by the user.
 */
export class LlmUnavailableError extends Error {
  constructor(
    message: string,
    readonly state: 'offline' | 'unauthorized',
  ) {
    super(message)
    this.name = 'LlmUnavailableError'
  }
}

/**
 * `<host>` or `<host>/v1` or a pasted endpoint in, `<host>/v1` out. Never `/v1/v1`.
 *
 * A pasted URL may carry a scheme, may or may not carry `/v1`, and may name a
 * specific endpoint (`/v1/chat/completions`, `/v1/models`, `/healthz`). All of
 * those describe the same provider, and all of them normalise to `<host>/v1`.
 */
export function normaliseBaseUrl(raw: string): string {
  let url = raw.trim()
  if (url === '') throw new Error('an empty base URL is not a base URL')
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`
  url = url.replace(/\/+$/, '')
  url = url.replace(/\/(v1\/(chat\/completions|models)|healthz)$/i, '')
  url = url.replace(/\/v1$/i, '')
  return `${url}/v1`
}

/** The host root — `/healthz` lives above `/v1`, not inside it. */
export function hostRoot(baseUrl: string): string {
  return baseUrl.replace(/\/v1$/i, '')
}

export interface HeaderOptions {
  token: string
  appId: string
  /** Chat requests carry `meterless-scope: user`. */
  scope?: 'user'
}

/** The headers every request carries. The token is a bearer token, never a query parameter. */
export function buildHeaders(options: HeaderOptions): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.token}`,
    'meterless-app': options.appId,
    'Content-Type': 'application/json',
  }
  if (options.scope) headers['meterless-scope'] = options.scope
  return headers
}

export interface DiscoverOptions {
  baseUrl: string
  token: string
  appId: string
  timeoutMs?: number
}

/**
 * The routing ids the provider actually exposes.
 *
 * A `meterless/*` id we do not recognise is still a routing mode — it is kept,
 * not filtered, so a tier we have not read about yet still works.
 */
export async function discoverModels(options: DiscoverOptions): Promise<string[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  let response: Response
  try {
    response = await fetch(`${options.baseUrl}/models`, {
      headers: buildHeaders({ token: options.token, appId: options.appId }),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    throw new LlmUnavailableError(
      `the provider did not answer the models call: ${error instanceof Error ? error.message : 'unreachable'}`,
      'offline',
    )
  }

  if (response.status === 401 || response.status === 403) {
    throw new LlmUnavailableError(
      `the provider rejected the token (${response.status}) — this is unauthorized, not offline`,
      'unauthorized',
    )
  }
  if (!response.ok) {
    throw new LlmUnavailableError(`the models call failed (${response.status})`, 'offline')
  }

  const body = (await response.json()) as { data?: Array<{ id?: string }> }
  return (body.data ?? [])
    .map((entry) => entry.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
}

/** Health is decided by the models endpoint. A wrong token is `unauthorized`. */
export async function probeHealth(options: DiscoverOptions): Promise<LlmHealth> {
  try {
    await discoverModels(options)
    return { state: 'online', baseUrl: options.baseUrl }
  } catch (error) {
    if (error instanceof LlmUnavailableError) {
      return { state: error.state, reason: error.message, baseUrl: options.baseUrl }
    }
    return {
      state: 'offline',
      reason: error instanceof Error ? error.message : 'the provider is unreachable',
      baseUrl: options.baseUrl,
    }
  }
}

/**
 * Liveness is not health: `GET <host>/healthz` only proves the process is up.
 * It never needs a token, and a 401 here does not make the machine unhealthy.
 */
export async function probeLiveness(options: {
  baseUrl: string
  appId: string
  timeoutMs?: number
}): Promise<LlmLiveness> {
  const url = `${hostRoot(options.baseUrl)}/healthz`
  try {
    const response = await fetch(url, {
      headers: { 'meterless-app': options.appId },
      signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    })
    if (response.ok) return { up: true, detail: `the process answered ${url}`, baseUrl: options.baseUrl }
    return { up: false, detail: `the process answered ${url} with ${response.status}`, baseUrl: options.baseUrl }
  } catch (error) {
    return {
      up: false,
      detail: error instanceof Error ? error.message : 'unreachable',
      baseUrl: options.baseUrl,
    }
  }
}

export interface RoutingSelection {
  /** The routing mode to send. */
  mode: string
  /** Set when the requested mode was not on offer. */
  note?: LlmRoutingNote
}

/**
 * Pick the routing mode.
 *
 * The mode the caller asked for wins if the provider offers it. If it does not,
 * we fall back to one that is — and the fallback is reported, never silent.
 */
export function selectRoutingMode(options: {
  requested?: string
  preferred?: string
  available: string[]
}): RoutingSelection {
  const { requested, preferred, available } = options
  const has = (id: string | undefined): id is string => !!id && available.includes(id)

  if (has(requested)) return { mode: requested }

  if (has(preferred)) {
    return {
      mode: preferred,
      note: {
        requested: requested ?? preferred,
        used: preferred,
        reason: `the provider does not expose ${requested ?? preferred}; it exposes ${preferred}.`,
      },
    }
  }

  const meterless = available.filter((id) => id.startsWith('meterless/'))
  const disposition = ROUTING_DISPOSITIONS.map((name) => `meterless/${name}`).find((id) =>
    available.includes(id),
  )
  const fallback = disposition ?? meterless[0] ?? available[0] ?? 'meterless/default'

  const note: LlmRoutingNote | undefined =
    requested && requested !== fallback
      ? {
          requested,
          used: fallback,
          reason: `the provider does not expose ${requested}; it offers ${fallback}.`,
        }
      : undefined

  return { mode: fallback, note }
}

/**
 * The provider's answer, as plain text.
 *
 * A plain text response stays a plain string — exactly like OpenAI. Prose is not
 * forced into JSON, and a content array is joined, not parsed.
 */
export function readPlainText(body: unknown): string {
  const content = (body as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]
    ?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === 'string'
          ? part
          : typeof (part as { text?: unknown })?.text === 'string'
            ? ((part as { text: string }).text)
            : '',
      )
      .join('')
  }
  if (content === undefined || content === null) return ''
  return String(content)
}
