/**
 * The offline deterministic adapter — the no-key, no-credit, no-network path.
 *
 * It is NOT a model and it never pretends to be one. It is a renderer: it takes the
 * structured facts the agents have already computed and turns them into prose. The
 * same facts always produce the same words, so two runs are decision-identical.
 *
 * It is not a lesser mode either. It returns the same result shape as the hosted
 * adapter — a string, a model id, and a routing note when the mode it was asked
 * for is not the mode it can serve.
 *
 * What it may not do (the hardcode audit checks this): load a prewritten final
 * answer, fake an agent interaction, or imply that a sponsor service was called.
 */

import type { LlmHealth, LlmLiveness, LlmPort, LlmRequest, LlmResponse } from './port.ts'

export interface OfflineFacts {
  kind: 'audit-narrative'
  [key: string]: unknown
}

const renderAuditNarrative = (facts: OfflineFacts): string => {
  const parts: string[] = []
  const subject =
    typeof facts.listingId === 'string' && typeof facts.decision === 'string'
      ? `${facts.listingId} (${facts.agent ?? 'listing'}): ${facts.decision}`
      : ''
  const published = Number(facts.published ?? 0)
  const held = Number(facts.held ?? 0)
  const revised = Number(facts.revised ?? 0)
  const fallbacks = Number(facts.fallbacks ?? 0)
  if (subject) parts.push(`${subject} — confidence ${String(facts.confidence ?? 0)}.`)
  parts.push(`${published} published, ${held} held, ${revised} revised, ${fallbacks} degraded.`)
  if (held > 0) parts.push('A held listing is a refusal, not an error.')
  if (fallbacks > 0) parts.push('A degraded listing was closed on the evidence that did answer.')
  if (revised > 0) parts.push('A revised listing was challenged and answered.')
  return parts.join(' ')
}

export class OfflineAdapter implements LlmPort {
  readonly appId = 'conquest-offline'
  readonly name = 'offline-deterministic'
  /** There is no endpoint — the offline path has no base URL. */
  readonly baseUrl = 'none (no network, no key)'

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const last = request.messages[request.messages.length - 1]
    let facts: OfflineFacts = { kind: 'audit-narrative' }
    if (last) {
      try {
        facts = JSON.parse(last.content) as OfflineFacts
      } catch {
        facts = { kind: 'audit-narrative' }
      }
    }

    const text = renderAuditNarrative(facts)
    const requested = request.model

    return {
      text,
      model: 'deterministic-renderer',
      routing: requested
        ? {
            requested,
            used: 'deterministic-renderer',
            reason: 'the deterministic renderer is in use — it is not a model and serves no routing mode.',
          }
        : undefined,
    }
  }

  async health(): Promise<LlmHealth> {
    return {
      state: 'offline',
      reason: 'no provider credentials — the deterministic renderer is in use',
    }
  }

  async liveness(): Promise<LlmLiveness> {
    return { up: true, detail: 'the deterministic renderer is in process and needs nothing' }
  }

  async models(): Promise<string[]> {
    return ['deterministic-renderer']
  }
}
