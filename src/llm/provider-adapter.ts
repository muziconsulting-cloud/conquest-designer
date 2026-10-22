/**
 * The hosted Meterless provider adapter.
 *
 * This is the route to NVIDIA Nemotron — Super, Nano, Ultra — but it never names a
 * model: Nemotron is a model the Meterless fleet already serves, and we ask the
 * provider for it the way a Cursor user asks Cursor for Grok. We hold **no NVIDIA
 * account, no NVIDIA key and no NVIDIA billing**.
 *
 * The wire rules live in `health.ts` and are shared with the local runtime adapter.
 * What is specific here is the configuration: the base URL and the bearer token
 * come from the environment, and the adapter refuses to be constructed without them.
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

export class MeterlessProviderAdapter implements LlmPort {
  readonly appId: string
  readonly name = 'meterless-provider'
  readonly baseUrl: string
  private readonly apiKey: string
  private readonly preferredModel?: string
  private readonly timeoutMs: number

  constructor(config: LlmConfig) {
    if (!config.baseUrl || !config.apiKey) {
      throw new Error('MeterlessProviderAdapter requires a base URL and an API key')
    }
    this.baseUrl = normaliseBaseUrl(config.baseUrl)
    this.apiKey = config.apiKey
    this.preferredModel = config.model
    this.appId = (config.appId ?? 'conquest-exchange').toLowerCase()
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  }

  async models(): Promise<string[]> {
    return discoverModels({
      baseUrl: this.baseUrl,
      token: this.apiKey,
      appId: this.appId,
      timeoutMs: this.timeoutMs,
    })
  }

  async health(): Promise<LlmHealth> {
    return probeHealth({
      baseUrl: this.baseUrl,
      token: this.apiKey,
      appId: this.appId,
      timeoutMs: this.timeoutMs,
    })
  }

  async liveness(): Promise<LlmLiveness> {
    return probeLiveness({ baseUrl: this.baseUrl, appId: this.appId, timeoutMs: this.timeoutMs })
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const available = await this.models().catch((error: unknown) => {
      if (error instanceof LlmUnavailableError) throw error
      throw new LlmUnavailableError(
        error instanceof Error ? error.message : 'the provider is unreachable',
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
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: buildHeaders({ token: this.apiKey, appId: this.appId, scope: 'user' }),
        body: JSON.stringify({
          model: selection.mode,
          messages: request.messages,
          temperature: request.temperature ?? 0,
          max_tokens: request.maxTokens ?? 512,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      })
    } catch (error) {
      // A timeout is an offline result, not a failure that kills the run. The
      // caller degrades to the deterministic renderer and marks it in the trace.
      throw new LlmUnavailableError(
        `the provider did not answer the chat call: ${error instanceof Error ? error.message : 'unreachable'}`,
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
