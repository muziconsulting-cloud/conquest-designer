/**
 * The fallback path — the run finishes even when a dependency is down.
 *
 * Two kinds of degradation are distinguished, and the difference matters:
 *
 *  - **No provider configured at all.** The deterministic offline renderer is the
 *    designed path, not a failure. It does NOT mark the run degraded — otherwise
 *    every offline run would be a fallback and the word would mean nothing.
 *  - **A provider that was configured and then failed** (`offline` / `unauthorized`),
 *    or **a federated source that did not answer.** These are real degradations: the
 *    run is marked, the trace says so, and the decision is still made — from the
 *    evidence that did answer, by the rules, with no exception thrown.
 */

import type { LlmHealth } from '../llm/port.ts'
import type { Plan } from '../agents/contracts.ts'

export interface FallbackState {
  /** True when the run was degraded. */
  degraded: boolean
  /** Why, in words. Empty when nothing degraded. */
  reasons: string[]
}

export const NOT_DEGRADED: FallbackState = { degraded: false, reasons: [] }

export function applyFallback(
  plan: Plan,
  health: LlmHealth,
  providerConfigured: boolean,
): FallbackState {
  const reasons: string[] = []

  if (plan.unavailable.length > 0) {
    reasons.push(`${plan.unavailable.join(', ')} did not answer — the run continued on the evidence that did.`)
  }

  if (providerConfigured && health.state !== 'online') {
    reasons.push(
      `the model route reported ${health.state}${health.reason ? ` (${health.reason})` : ''} — the deterministic renderer answered instead.`,
    )
  }

  return { degraded: reasons.length > 0, reasons }
}
