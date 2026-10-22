/**
 * The LLM registry — which adapter speaks for this run.
 *
 * The order is fixed:
 *   1. `SAMPLE_MODE=true` forces the offline deterministic adapter.
 *   2. `METERLESS_BASE_URL` + `METERLESS_API_KEY` selects the hosted provider.
 *   3. `METERLESS_RUNTIME_TOKEN` selects the local Meterless Runtime.
 *   4. Otherwise the offline deterministic adapter.
 *
 * Nothing here reads a secret from a file — `Bun.env` only.
 */

import type { LlmHealth, LlmPort } from '../llm/port.ts'
import { OfflineAdapter } from './offline.ts'
import { MeterlessHttpAdapter } from './meterless.ts'

export interface ResolvedLlm {
  port: LlmPort
  /** Which rule picked it. Written into the trace, so a judge can see the route. */
  source: 'sample-mode' | 'provider' | 'runtime' | 'offline'
  reason: string
}

export function resolveLlm(env: Record<string, string | undefined> = Bun.env): ResolvedLlm {
  const sampleMode = (env['SAMPLE_MODE'] ?? '').toLowerCase() === 'true'
  if (sampleMode) {
    return {
      port: new OfflineAdapter(),
      source: 'sample-mode',
      reason: 'SAMPLE_MODE=true — the deterministic offline path',
    }
  }

  const baseUrl = env['METERLESS_BASE_URL']
  const apiKey = env['METERLESS_API_KEY']
  if (baseUrl && apiKey) {
    return {
      port: new MeterlessHttpAdapter({
        name: 'meterless-provider',
        baseUrl,
        token: apiKey,
        appId: 'conquest-exchange',
        preferredModel: env['METERLESS_MODEL'],
        timeoutMs: env['METERLESS_TIMEOUT_MS']
          ? Number(env['METERLESS_TIMEOUT_MS'])
          : undefined,
      }),
      source: 'provider',
      reason: 'METERLESS_BASE_URL and METERLESS_API_KEY are set',
    }
  }

  const runtimeToken = env['METERLESS_RUNTIME_TOKEN']
  if (runtimeToken) {
    return {
      port: new MeterlessHttpAdapter({
        name: 'meterless-runtime',
        baseUrl: env['METERLESS_RUNTIME_BASE_URL'] ?? 'http://127.0.0.1:8088/v1',
        token: runtimeToken,
        appId: 'conquest-exchange',
        preferredModel: env['METERLESS_MODEL'],
      }),
      source: 'runtime',
      reason: 'METERLESS_RUNTIME_TOKEN is set',
    }
  }

  return {
    port: new OfflineAdapter(),
    source: 'offline',
    reason: 'no provider credentials — the deterministic offline path',
  }
}

/** The health of the resolved adapter, never throwing out of the orchestrator. */
export async function checkHealth(port: LlmPort): Promise<LlmHealth> {
  try {
    return await port.health()
  } catch (error) {
    return {
      state: 'offline',
      reason: error instanceof Error ? error.message : 'health check failed',
    }
  }
}
