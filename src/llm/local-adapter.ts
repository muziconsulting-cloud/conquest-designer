/**
 * The local Meterless Runtime adapter.
 *
 * The runtime is a local process speaking the same OpenAI-format wire as the
 * hosted provider. Two things make it its own adapter:
 *
 *  1. **It is found, not assumed.** The runtime may be on any of the known local
 *     ports, so the adapter probes them — 8088, 8090, 8787, 11434 on 127.0.0.1,
 *     localhost and [::1] — and keeps the first hit that is *online* or
 *     *unauthorized*. A hit that is unauthorized still counts as a hit: the runtime
 *     is there, the token is wrong, and those are different problems.
 *  2. **Its token is real.** The runtime writes its proxy token to
 *     `<stateDir>/proxy-token`; the placeholder `rt-local` is rejected, and the
 *     adapter surfaces that as `unauthorized` — never as `offline`.
 *
 * The wire rules are shared with the hosted adapter and live in `health.ts`.
 */

import type { LlmConfig, LlmHealth, LlmLiveness, LlmPort, LlmRequest, LlmResponse } from './port.ts'
import {
  DEFAULT_TIMEOUT_MS,
  LlmUnavailableError,
  buildHeaders,
  discoverModels,
  normaliseBaseUrl,
  probeHealth,
  probeLiveness,
  readPlainText,
  selectRoutingMode,
} from './health.ts'

/** The ports the runtime is known to use, in the order we try them. */
export const DEFAULT_AUTO_DETECT_PORTS = [8088, 8090, 8787, 11434]
/** The hosts a local runtime may be listening on. */
export const DEFAULT_AUTO_DETECT_HOSTS = ['127.0.0.1', 'localhost', '[::1]']
/** The probe is a reachability check, not a model call — it gets a short leash. */
const DISCOVERY_TIMEOUT_MS = 3_000

export interface RuntimeDiscovery {
  /** The base URL that answered, already normalised to `<host>/v1`. */
  baseUrl?: string
  /** `online` when it answered, `unauthorized` when it answered but refused the token. */
  state?: 'online' | 'unauthorized'
  /** Every candidate that was tried, in order. */
  tried: string[]
}

export class MeterlessRuntimeAdapter implements LlmPort {
  readonly appId: string
  readonly name = 'meterless-runtime'
  private readonly token: string
  private readonly preferredModel?: string
  private readonly timeoutMs: number
  private readonly explicitBaseUrl?: string
  private readonly autoDetectPorts: number[]
  private readonly autoDetectHosts: string[]
  private discovered?: RuntimeDiscovery

  constructor(config: LlmConfig) {
    if (!config.runtimeToken) {
      throw new Error('MeterlessRuntimeAdapter requires a runtime token')
    }
    this.token = config.runtimeToken
    this.preferredModel = config.model
    this.appId = (config.appId ?? 'conquest-exchange').toLowerCase()
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.explicitBaseUrl = config.runtimeBaseUrl
      ? normaliseBaseUrl(config.runtimeBaseUrl)
      : undefined
    this.autoDetectPorts = config.autoDetectPorts ?? DEFAULT_AUTO_DETECT_PORTS
    this.autoDetectHosts = DEFAULT_AUTO_DETECT_HOSTS
  }

  /** The base URL the runtime answered on, once it has been found. */
  get baseUrl(): string | undefined {
    return this.explicitBaseUrl ?? this.discovered?.baseUrl
  }

  /** The candidate base URLs, in the order they are tried. */
  candidates(): string[] {
    if (this.explicitBaseUrl) return [this.explicitBaseUrl]
    const urls: string[] = []
    for (const port of this.autoDetectPorts) {
      for (const host of this.autoDetectHosts) {
        urls.push(normaliseBaseUrl(`http://${host}:${port}`))
      }
    }
    return urls
  }

  /**
   * Find the runtime.
   *
   * The first candidate that answers is kept, whether it answers with a model list
   * (`online`) or with a 401 (`unauthorized`). Everything else is a miss.
   */
  async discover(force = false): Promise<RuntimeDiscovery> {
    if (this.discovered && !force) return this.discovered
    if (this.explicitBaseUrl) {
      this.discovered = { baseUrl: this.explicitBaseUrl, tried: [this.explicitBaseUrl] }
      return this.discovered
    }

    const tried: string[] = []
    for (const candidate of this.candidates()) {
      tried.push(candidate)
      let response: Response
      try {
        response = await fetch(`${candidate}/models`, {
          headers: buildHeaders({ token: this.token, appId: this.appId }),
          signal: AbortSignal.timeout(Math.min(this.timeoutMs, DISCOVERY_TIMEOUT_MS)),
        })
      } catch {
        continue
      }
      if (response.status === 401 || response.status === 403) {
        this.discovered = { baseUrl: candidate, state: 'unauthorized', tried }
        return this.discovered
      }
      if (response.ok) {
        this.discovered = { baseUrl: candidate, state: 'online', tried }
        return this.discovered
      }
    }

    this.discovered = { tried }
    return this.discovered
  }

  private async requireBaseUrl(): Promise<string> {
    if (this.explicitBaseUrl) return this.explicitBaseUrl
    const found = await this.discover()
    if (!found.baseUrl) {
      throw new LlmUnavailableError(
        `no Meterless Runtime answered on ${found.tried.length} local candidate(s): ${found.tried.join(', ')}`,
        'offline',
      )
    }
    return found.baseUrl
  }

  async models(): Promise<string[]> {
    const baseUrl = await this.requireBaseUrl()
    return discoverModels({
      baseUrl,
      token: this.token,
      appId: this.appId,
      timeoutMs: this.timeoutMs,
    })
  }

  async health(): Promise<LlmHealth> {
    if (!this.explicitBaseUrl) {
      const found = await this.discover()
      if (found.state === 'unauthorized' && found.baseUrl) {
        return {
          state: 'unauthorized',
          reason: `the runtime at ${found.baseUrl} rejected the token — this is unauthorized, not offline`,
          baseUrl: found.baseUrl,
        }
      }
      if (!found.baseUrl) {
        return {
          state: 'offline',
          reason: `no Meterless Runtime answered on ${found.tried.length} local candidate(s): ${found.tried.join(', ')}`,
        }
      }
    }
    const baseUrl = await this.requireBaseUrl()
    return probeHealth({
      baseUrl,
      token: this.token,
      appId: this.appId,
      timeoutMs: this.timeoutMs,
    })
  }

  async liveness(): Promise<LlmLiveness> {
    const baseUrl = this.baseUrl ?? (await this.discover()).baseUrl
    if (!baseUrl) {
      return { up: false, detail: 'no local runtime was found on the known ports' }
    }
    return probeLiveness({ baseUrl, appId: this.appId, timeoutMs: this.timeoutMs })
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const baseUrl = await this.requireBaseUrl()
    const available = await this.models().catch((error: unknown) => {
      if (error instanceof LlmUnavailableError) throw error
      throw new LlmUnavailableError(
        error instanceof Error ? error.message : 'the runtime is unreachable',
        'offline',
      )
    })

    const selection = selectRoutingMode({
      requested: request.model,
      preferred: this.preferredModel,
      available,
    })

    let response: Response
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: buildHeaders({ token: this.token, appId: this.appId, scope: 'user' }),
        body: JSON.stringify({
          model: selection.mode,
          messages: request.messages,
          temperature: request.temperature ?? 0,
          max_tokens: request.maxTokens ?? 512,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (error) {
      throw new LlmUnavailableError(
        `the runtime did not answer the chat call: ${error instanceof Error ? error.message : 'unreachable'}`,
        'offline',
      )
    }

    if (response.status === 401 || response.status === 403) {
      throw new LlmUnavailableError(
        `the runtime rejected the token (${response.status}) — this is unauthorized, not offline`,
        'unauthorized',
      )
    }
    if (!response.ok) {
      throw new LlmUnavailableError(`the chat call failed (${response.status})`, 'offline')
    }

    const body = (await response.json()) as { model?: string }
    return {
      text: readPlainText(body),
      model: body.model ?? selection.mode,
      routing: selection.note,
      raw: body,
    }
  }
}
