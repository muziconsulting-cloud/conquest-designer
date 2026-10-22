/**
 * The one LLM port, and the three adapters behind it.
 *
 * Everything in the app that needs a model talks to `LlmPort`. No module outside
 * this folder makes a model call, and no model provider SDK appears anywhere in
 * the codebase — `fetch` is the whole client.
 *
 * The picker — which adapter speaks for a run — is in `resolveLlm` below, and its
 * order is fixed:
 *
 *   1. `SAMPLE_MODE=true` forces the offline deterministic adapter.
 *   2. `METERLESS_BASE_URL` + `METERLESS_API_KEY` selects the hosted provider.
 *   3. `METERLESS_RUNTIME_TOKEN` selects the local Meterless Runtime.
 *   4. Otherwise the offline deterministic adapter.
 *
 * Nothing here reads a secret from a file — `Bun.env` only.
 */

import type { LlmHealth, LlmPort } from './port.ts'
import { MeterlessProviderAdapter } from './provider-adapter.ts'
import { MeterlessRuntimeAdapter } from './local-adapter.ts'
import { OfflineAdapter } from './offline-adapter.ts'

export type {
  LlmConfig,
  LlmHealth,
  LlmHealthState,
  LlmLiveness,
  LlmMessage,
  LlmPort,
  LlmRequest,
  LlmResponse,
  LlmRole,
  LlmRoutingNote,
  RoutePreference,
} from './port.ts'
export { MeterlessProviderAdapter } from './provider-adapter.ts'
export { MeterlessRuntimeAdapter, DEFAULT_AUTO_DETECT_PORTS } from './local-adapter.ts'
export { OfflineAdapter } from './offline-adapter.ts'
export {
  DEFAULT_TIMEOUT_MS,
  LlmUnavailableError,
  discoverModels,
  normaliseBaseUrl,
  probeHealth,
  probeLiveness,
  selectRoutingMode,
} from './health.ts'

export interface ResolvedLlm {
  port: LlmPort
  /** Which rule picked it. Written into the trace, so a judge can see the route. */
  source: 'sample-mode' | 'provider' | 'runtime' | 'offline'
  reason: string
}

/** Which adapter speaks for this run, and why. */
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
      port: new MeterlessProviderAdapter({
        baseUrl,
        apiKey,
        appId: env['METERLESS_APP_ID'] ?? 'conquest-exchange',
        model: env['NEMOTRON_MODEL'] ?? env['METERLESS_MODEL'] ?? env['MODEL_ID'],
        timeoutMs: env['METERLESS_TIMEOUT_MS'] ? Number(env['METERLESS_TIMEOUT_MS']) : undefined,
      }),
      source: 'provider',
      reason: 'METERLESS_BASE_URL and METERLESS_API_KEY are set',
    }
  }

  const runtimeToken = env['METERLESS_RUNTIME_TOKEN']
  if (runtimeToken) {
    return {
      port: new MeterlessRuntimeAdapter({
        runtimeToken,
        runtimeBaseUrl: env['METERLESS_RUNTIME_BASE_URL'],
        appId: env['METERLESS_APP_ID'] ?? 'conquest-exchange',
        model: env['METERLESS_MODEL'] ?? env['MODEL_ID'],
        timeoutMs: env['METERLESS_TIMEOUT_MS'] ? Number(env['METERLESS_TIMEOUT_MS']) : undefined,
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
      reason: error instanceof Error ? error.message : 'the health check failed',
    }
  }
}
