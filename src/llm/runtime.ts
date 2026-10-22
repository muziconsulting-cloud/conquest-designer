/**
 * Local Meterless Runtime adapter (stub for P0).
 * Nightshift hotspot wiring lands fully in P10.
 */

import type { LlmConfig, LlmHealth, LlmPort, LlmRequest, LlmResponse } from './port.ts'

function normalizeBaseUrl(url: string): string {
  const trimmed = url.replace(/\/+$/, '')
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`
}

export class MeterlessRuntimeAdapter implements LlmPort {
  readonly appId: string
  readonly name = 'meterless-runtime'
  private readonly baseUrl: string
  private readonly token: string
  private readonly timeoutMs: number

  constructor(config: LlmConfig) {
    if (!config.runtimeToken) {
      throw new Error('MeterlessRuntimeAdapter requires runtimeToken')
    }
    this.baseUrl = normalizeBaseUrl(config.runtimeBaseUrl ?? 'http://127.0.0.1:8088/v1')
    this.token = config.runtimeToken
    this.appId = (config.appId ?? 'conquest-exchange').toLowerCase()
    this.timeoutMs = config.timeoutMs ?? 180_000
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'meterless-app': this.appId,
          'meterless-scope': 'user',
        },
        body: JSON.stringify({
          model: request.model ?? 'meterless/local',
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.maxTokens,
        }),
        signal: request.signal ?? controller.signal,
      })
      if (!res.ok) {
        throw new Error(`runtime complete failed: ${res.status}`)
      }
      const raw = (await res.json()) as {
        choices?: { message?: { content?: string } }[]
        model?: string
      }
      const text = raw.choices?.[0]?.message?.content ?? ''
      return { text, model: raw.model ?? 'meterless/local', raw }
    } finally {
      clearTimeout(timer)
    }
  }

  async health(): Promise<LlmHealth> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'meterless-app': this.appId,
        },
      })
      if (res.status === 401 || res.status === 403) {
        return { state: 'unauthorized', reason: `HTTP ${res.status}`, baseUrl: this.baseUrl }
      }
      if (res.ok) {
        return { state: 'online', baseUrl: this.baseUrl }
      }
      return { state: 'offline', reason: `HTTP ${res.status}`, baseUrl: this.baseUrl }
    } catch (err) {
      return {
        state: 'offline',
        reason: err instanceof Error ? err.message : 'unreachable',
        baseUrl: this.baseUrl,
      }
    }
  }

  async models(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'meterless-app': this.appId,
        },
      })
      if (!res.ok) return []
      const raw = (await res.json()) as { data?: { id: string }[] }
      return (raw.data ?? []).map((m) => m.id)
    } catch {
      return []
    }
  }
}
