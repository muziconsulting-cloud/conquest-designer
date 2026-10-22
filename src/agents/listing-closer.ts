import type { AgentRunArgs, AgentStepResult } from './types.ts'

/** Stub: closes a listing draft. One AuditRecord per listing. */
export async function runListingCloser(args: AgentRunArgs): Promise<AgentStepResult> {
  const { runId, step, listing, tracer, at } = args

  // Tentative close before the critic; hold/revise may still change the decision.
  const tentative =
    listing.expectedPath === 'hold'
      ? ('published' as const)
      : listing.expectedPath === 'fallback'
        ? ('fallback' as const)
        : ('published' as const)

  const record = {
    runId,
    role: 'listing-closer' as const,
    step,
    outcome: listing.expectedPath === 'fallback' ? ('fallback' as const) : ('ok' as const),
    detail: {
      listingId: listing.listingId,
      tentativeDecision: tentative,
      declaredPriceZar: listing.declaredPriceZar,
      reconciledPriceZar: listing.reconciledPriceZar,
    },
    at,
  }

  await tracer.writeLine(record, {
    action: 'close_listing',
    input_summary: `Close ${listing.listingId} after reconcile (path=${listing.expectedPath})`,
    output_summary: `Tentative decision=${tentative}; reconciled=${listing.reconciledPriceZar ?? 'null'}`,
    target_agent: 'conflict-critic',
    confidence: listing.confidence,
    retry_count: 0,
  })

  return {
    record,
    decision: tentative,
    confidence: listing.confidence,
    critiqueChangedDecision: false,
    critiqueFinding: null,
  }
}
