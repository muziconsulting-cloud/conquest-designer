import type { AgentRunArgs, AgentStepResult } from './types.ts'

/** Stub: plans which sources to query. One AuditRecord per listing. */
export async function runVolumePlanner(args: AgentRunArgs): Promise<AgentStepResult> {
  const { runId, step, listing, tracer, at } = args
  const sources = listing.sources

  const record = {
    runId,
    role: 'volume-planner' as const,
    step,
    outcome: 'ok' as const,
    detail: {
      listingId: listing.listingId,
      sources,
      expectedPath: listing.expectedPath,
    },
    at,
  }

  await tracer.writeLine(record, {
    action: 'plan_sources',
    input_summary: `Plan sources for ${listing.listingId} (declared ${listing.declaredPriceZar} ZAR)`,
    output_summary: `Planned ${sources.length} sources: ${sources.join(', ')}`,
    target_agent: 'evidence-reconciler',
    confidence: null,
    retry_count: 0,
  })

  return {
    record,
    decision: listing.decision,
    confidence: listing.confidence,
    critiqueChangedDecision: false,
    critiqueFinding: null,
  }
}
