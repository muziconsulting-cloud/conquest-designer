import type { AgentRunArgs, AgentStepResult, ListingDecision } from './types.ts'

/** Stub: critiques the closer's draft. One AuditRecord per listing. */
export async function runConflictCritic(args: AgentRunArgs): Promise<AgentStepResult> {
  const { runId, step, listing, tracer, at } = args

  // Closer always starts tentativly published (or fallback); critic may overturn.
  const provisional: ListingDecision =
    listing.expectedPath === 'fallback' ? 'fallback' : 'published'

  let decision: ListingDecision = provisional
  let critiqueChangedDecision = false
  let critiqueFinding: string | null = null
  let outcome: 'ok' | 'escalated' | 'fallback' = 'ok'

  switch (listing.expectedPath) {
    case 'accept':
      decision = 'published'
      listing.decision = decision
      break
    case 'hold':
      decision = 'held'
      listing.decision = decision
      listing.reconciledPriceZar = null
      critiqueChangedDecision = provisional !== decision
      critiqueFinding =
        listing.critiqueReason ??
        'Declared price is not supported by the reconciled evidence'
      outcome = 'escalated'
      break
    case 'revise':
      listing.revised = true
      decision = 'published'
      listing.decision = decision
      critiqueChangedDecision = true
      critiqueFinding =
        listing.critiqueReason ??
        'The initial draft did not cite the source of each fact'
      break
    case 'fallback':
      decision = 'fallback'
      listing.decision = decision
      critiqueFinding =
        listing.critiqueReason ??
        'A federated source was unavailable; degraded to fallback'
      outcome = 'fallback'
      break
  }

  const record = {
    runId,
    role: 'conflict-critic' as const,
    step,
    outcome,
    detail: {
      listingId: listing.listingId,
      provisionalDecision: provisional,
      finalDecision: decision,
      critiqueChangedDecision,
      finding: critiqueFinding,
      supportingCitations: listing.citations,
    },
    at,
  }

  await tracer.writeLine(record, {
    action: listing.expectedPath === 'revise' ? 'revise' : 'critique',
    input_summary: `Critique provisional=${provisional} for ${listing.listingId}`,
    output_summary: critiqueFinding
      ? `Final=${decision}; changed=${critiqueChangedDecision}: ${critiqueFinding}`
      : `Final=${decision}; changed=${critiqueChangedDecision}`,
    target_agent: 'telemetry-auditor',
    confidence: listing.confidence,
    retry_count: 0,
  })

  return {
    record,
    decision,
    confidence: listing.confidence,
    critiqueChangedDecision,
    critiqueFinding,
  }
}
