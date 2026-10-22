import type { AgentRunArgs, AgentStepResult } from './types.ts'

/** Stub: audits the run telemetry. One AuditRecord per listing. */
export async function runTelemetryAuditor(args: AgentRunArgs): Promise<AgentStepResult> {
  const { runId, step, listing, tracer, at } = args

  const outcome =
    listing.expectedPath === 'fallback'
      ? ('fallback' as const)
      : listing.expectedPath === 'hold'
        ? ('escalated' as const)
        : ('ok' as const)

  const record = {
    runId,
    role: 'telemetry-auditor' as const,
    step,
    outcome,
    detail: {
      listingId: listing.listingId,
      decision: listing.decision,
      confidence: listing.confidence,
      citations: listing.citations,
      revised: listing.revised,
      unavailableSources: listing.unavailableSources,
    },
    at,
  }

  await tracer.writeLine(record, {
    action: 'audit_telemetry',
    input_summary: `Audit telemetry for ${listing.listingId}`,
    output_summary: `decision=${listing.decision} confidence=${listing.confidence} citations=${listing.citations.length}`,
    target_agent: null,
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
