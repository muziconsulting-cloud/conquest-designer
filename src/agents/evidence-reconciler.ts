import type { AgentRunArgs, AgentStepResult } from './types.ts'

/** Stub: reconciles evidence (wired only). One AuditRecord per listing. */
export async function runEvidenceReconciler(args: AgentRunArgs): Promise<AgentStepResult> {
  const { runId, step, listing, tracer, llm, at } = args

  // Touch the LLM port so the registry path is exercised every run.
  const llmOut = await llm.complete({
    messages: [
      {
        role: 'user',
        content: `reconcile ${listing.listingId} path=${listing.expectedPath} sources=${listing.sources.join(',')}`,
      },
    ],
  })

  const outcome =
    listing.expectedPath === 'fallback' && listing.unavailableSources.length > 0
      ? ('fallback' as const)
      : ('ok' as const)

  const record = {
    runId,
    role: 'evidence-reconciler' as const,
    step,
    outcome,
    detail: {
      listingId: listing.listingId,
      reconciledPriceZar: listing.reconciledPriceZar,
      citations: listing.citations,
      unavailableSources: listing.unavailableSources,
      llmModel: llmOut.model,
      llmFingerprint: llmOut.text,
    },
    at,
  }

  await tracer.writeLine(record, {
    action: 'reconcile',
    input_summary: `Reconcile ${listing.evidence.length} observations for ${listing.listingId}`,
    output_summary:
      listing.reconciledPriceZar === null
        ? `No reconciled price; citations=${listing.citations.join(',')}`
        : `Reconciled price=${listing.reconciledPriceZar}; citations=${listing.citations.join(',')}`,
    target_agent: 'listing-closer',
    confidence: listing.confidence,
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
