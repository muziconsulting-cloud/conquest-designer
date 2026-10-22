/**
 * The Meterless HTTP adapter — one class, two instances.
 *
 * The hosted provider (`METERLESS_BASE_URL` + `METERLESS_API_KEY`) and the local
 * runtime (`METERLESS_RUNTIME_TOKEN`) speak the same contract, so they share the
 * implementation and differ only in configuration and in their name.
 *
 * The rules the port documents are implemented here, in code that runs — not in prose:
 *  - the URL is normalised to `<host>/v1`, never `/v1/v1`;
 *  - `Authorization: Bearer <token>` on every call;
 *  - `meterless-app` on every request, `meterless-scope: user` on chat;
 *  - model ids are routing modes: the adapter asks the provider what it exposes and
 *    keeps any `meterless/*` id it does not recognise;
 *  - `GET /v1/models` decides status — 401/403 is `unauthorized`, 200 is `online`;
 *  - 180 s timeout, because a cold model load can take minutes.
 */

import type { LlmHealth, LlmPort, LlmRequest, LlmResponse } from '../llm/port.ts'

export class LlmUnavailableError extends Error {
  constructor(
    message: string,
    readonly state: 'offline' | 'unauthorized',
  ) {
    super(message)
    this.name = 'LlmUnavailableError'
  }
}

export interface MeterlessConfig {
  name: string
  baseUrl: string
  token: string
  appId: string
  preferredModel?: string
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 180_000

/** `<host>` or `<host>/v1` in, `<host>/v1` out. Never `/v1/v1`. */
export function normaliseBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (trimmed.endsWith('/v1')) return trimmed
  return `${trimmed}/v1`
}

export class MeterlessHttpAdapter implements LlmPort {
  readonly appId: string
  readonly name: string
  private readonly baseUrl: string
  private readonly token: string
  private readonly preferredModel?: string
  private readonly timeoutMs: number

  constructor(config: MeterlessConfig) {
    this.name = config.name
    this.appId = config.appId
    this.baseUrl = normaliseBaseUrl(config.baseUrl)
    this.token = config.token
    this.preferredModel = config.preferredModel
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'meterless-app': this.appId,
      'Content-Type': 'application/json',
      ...extra,
    }
  }

  async models(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    if (response.status === 401 || response.status === 403) {
      throw new LlmUnavailableError(`provider rejected the token (${response.status})`, 'unauthorized')
    }
    if (!response.ok) {
      throw new LlmUnavailableError(`provider models call failed (${response.status})`, 'offline')
    }
    const body = (await response.json()) as { data?: Array<{ id?: string }> }
    const ids = (body.data ?? [])
      .map((entry) => entry.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
    // A routing mode we do not recognise is still a routing mode — keep it.
    return ids
  }

  async health(): Promise<LlmHealth> {
    try {
      await this.models()
      return { state: 'online', baseUrl: this.baseUrl }
    } catch (error) {
      if (error instanceof LlmUnavailableError) {
        return { state: error.state, reason: error.message, baseUrl: this.baseUrl }
      }
      return {
        state: 'offline',
        reason: error instanceof Error ? error.message : 'provider unreachable',
        baseUrl: this.baseUrl,
      }
    }
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const available = await this.models().catch((error: unknown) => {
      if (error instanceof LlmUnavailableError) throw error
      throw new LlmUnavailableError(
        error instanceof Error ? error.message : 'provider unreachable',
        'offline',
      )
    })

    const model =
      (request.model && available.includes(request.model) ? request.model : undefined) ??
      (this.preferredModel && available.includes(this.preferredModel)
        ? this.preferredModel
        : undefined) ??
      available.find((id) => id.startsWith('meterless/')) ??
      available[0] ??
      'meterless/default'

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers({ 'meterless-scope': 'user' }),
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0,
        max_tokens: request.maxTokens ?? 512,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (response.status === 401 || response.status === 403) {
      throw new LlmUnavailableError(`provider rejected the token (${response.status})`, 'unauthorized')
    }
    if (!response.ok) {
      throw new LlmUnavailableError(`provider chat call failed (${response.status})`, 'offline')
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      model?: string
    }
    const choice = body.choices?.[0]
    const text = choice?.message?.content ?? ''

    return { text, model: body.model ?? model, raw: body }
  }
}
