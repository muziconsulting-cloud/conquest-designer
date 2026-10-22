/**
 * Resolves the LLM adapter for a run.
 *
 * Priority:
 *   1. SAMPLE_MODE=true → offline deterministic
 *   2. METERLESS_BASE_URL + METERLESS_API_KEY → hosted provider
 *   3. METERLESS_RUNTIME_TOKEN → local Meterless Runtime
 *   4. else → offline deterministic
 */

import { OfflineAdapter } from '../llm/offline.ts'
import type { LlmConfig, LlmPort } from '../llm/port.ts'
import { MeterlessProviderAdapter } from '../llm/provider.ts'
import { MeterlessRuntimeAdapter } from '../llm/runtime.ts'

function env(name: string): string | undefined {
  const v = Bun.env[name] ?? process.env[name]
  if (v === undefined || v === '') return undefined
  return v
}

function isSampleMode(): boolean {
  const v = (env('SAMPLE_MODE') ?? '').toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

export function loadLlmConfig(): LlmConfig {
  return {
    baseUrl: env('METERLESS_BASE_URL'),
    apiKey: env('METERLESS_API_KEY'),
    model: env('NEMOTRON_MODEL') ?? env('MODEL_ID'),
    runtimeBaseUrl: env('METERLESS_RUNTIME_BASE_URL') ?? 'http://127.0.0.1:8088/v1',
    runtimeToken: env('METERLESS_RUNTIME_TOKEN'),
    appId: (env('METERLESS_APP_ID') ?? 'conquest-exchange').toLowerCase(),
    timeoutMs: 180_000,
  }
}

export function resolveLlm(config: LlmConfig = loadLlmConfig()): LlmPort {
  const appId = config.appId ?? 'conquest-exchange'

  if (isSampleMode()) {
    return new OfflineAdapter(appId)
  }

  if (config.baseUrl && config.apiKey) {
    return new MeterlessProviderAdapter(config)
  }

  if (config.runtimeToken) {
    return new MeterlessRuntimeAdapter(config)
  }

  return new OfflineAdapter(appId)
}
