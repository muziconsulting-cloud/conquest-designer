/**
 * The telemetry auditor — the role that records what happened, and the role the
 * escalation lands on.
 *
 * Two jobs:
 *  1. It writes the run's audit line for a listing: the decision, the conflicts, the
 *     confidence, and whether the listing was escalated.
 *  2. It narrates the decision. The narration goes through the LLM port — the one
 *     seam a model uses. When no provider is configured, the offline adapter renders
 *     the same facts deterministically. The decision itself is never the model's: the
 *     rules decide, the port narrates.
 *
 * The decision is also written to the **World Model** engine (Meterless), on the same
 * canonical listing the closer wrote, so the event log carries the whole story — what
 * was published, what was held, what escalated — and the audit trail keeps the receipt
 * for every one of those writes.
 */

import type { LlmPort } from '../llm/port.ts'
import type { Conflict } from '../types.ts'
import type { StepTrace } from './contracts.ts'
import type { EngineSession } from '../engines/session.ts'

export type Decision = 'accept' | 'revise' | 'hold' | 'fallback'

export interface AuditInput {
  listingId: string
  agentName: string
  decision: Decision
  listingCopy: string
  conflicts: Conflict[]
  confidence: number
  /** True when the listing escalated — exactly once per listing, never twice. */
  escalated: boolean
  unavailable: string[]
  llm: LlmPort
  /** The canonical listing the decision belongs to. */
  entityId?: string
  session?: EngineSession
}

export interface AuditOutcome {
  narrative: string
  trace: StepTrace
  /** The events the decision write produced. */
  eventIds: string[]
}

export async function auditListing(input: AuditInput): Promise<AuditOutcome> {
  const facts = {
    kind: 'audit-narrative',
    listingId: input.listingId,
    agent: input.agentName,
    decision: input.decision,
    confidence: input.confidence,
    conflicts: input.conflicts.length,
    unavailable: input.unavailable,
    escalated: input.escalated,
    published: input.decision === 'accept' || input.decision === 'revise' || input.decision === 'fallback' ? 1 : 0,
    held: input.decision === 'hold' ? 1 : 0,
    revised: input.decision === 'revise' ? 1 : 0,
    fallbacks: input.decision === 'fallback' ? 1 : 0,
  }

  let narrative: string
  try {
    const response = await input.llm.complete({
      messages: [
        { role: 'system', content: 'Summarise the listing decision in one sentence. No claims beyond the facts.' },
        { role: 'user', content: JSON.stringify(facts) },
      ],
      temperature: 0,
      maxTokens: 256,
    })
    narrative = response.text
  } catch (error) {
    // A provider that is down must not abort the run: the auditor falls back to the
    // facts it already holds, and says so.
    narrative =
      `${input.listingId}: ${input.decision} (confidence ${input.confidence}). ` +
      `The model was unavailable, so this line is the deterministic fallback.`
  }

  const escalationNote = input.escalated
    ? ` Escalated once: ${input.conflicts
        .map((conflict) => `${conflict.field} (${conflict.resolution.winner} won)`)
        .join('; ')}.`
    : ''

  // The decision, on the canonical record.
  const eventIds: string[] = []
  if (input.session && input.entityId) {
    const at = input.session.now()
    await input.session.world.assertFact({
      about: input.entityId,
      predicate: 'decision',
      value: input.decision,
      source: { kind: 'observed', at, agent: 'telemetry-auditor', listing: input.listingId },
      confidence: input.confidence,
    })
    if (input.escalated) {
      await input.session.world.assertFact({
        about: input.entityId,
        predicate: 'escalation',
        value: input.conflicts.map((conflict) => ({
          field: conflict.field,
          winner: conflict.resolution.winner,
          why: conflict.resolution.why,
        })),
        source: { kind: 'observed', at, agent: 'telemetry-auditor', listing: input.listingId },
        confidence: input.confidence,
      })
    }
    const events = input.session.world.events()
    for (const event of events.slice(input.escalated ? -2 : -1)) eventIds.push(event.id)
  }

  return {
    narrative,
    trace: {
      action: 'audit_telemetry',
      outcome: input.escalated ? 'escalated' : input.decision === 'fallback' ? 'fallback' : 'ok',
      input_summary: `${input.listingId} (${input.agentName}) closed as ${input.decision}.`,
      output_summary: `${narrative}${escalationNote}`,
      target_agent: null,
      confidence: input.confidence,
    },
    eventIds,
  }
}
