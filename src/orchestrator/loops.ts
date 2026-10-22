/**
 * The two loops.
 *
 * Loop 1 (draft): plan -> gather evidence -> propose a listing.
 * Loop 2 (challenge): the conflict critic challenges the proposal. A challenge sends
 * the listing back to the evidence reconciler, which either produces stronger evidence
 * (-> close it) or cannot (-> hold, and escalate once to the telemetry auditor).
 *
 * Every step writes one trace line. No step throws out of this module: a failure in a
 * dependency degrades the decision, it does not end the run.
 *
 * The three engines run underneath the loops — Markovian expands the plan, H-MEM holds
 * and teaches the evidence, the World Model keeps the canonical record. Every step that
 * touches an engine says so in its trace detail, with the ids it touched.
 */

import type { Conflict, Critique, Listing, ListingRecord, ListingStatus } from '../types.ts'
import type { LlmHealth, LlmPort } from '../llm/port.ts'
import type { SourceDescriptor } from '../agents/contracts.ts'
import {
  planSources,
  reconcile,
  critiqueListing,
  proposeListing,
  closeListing,
  recordListing,
  auditListing,
} from '../agents/index.ts'
import type { Decision } from '../agents/telemetry-auditor.ts'
import type { MemoryFeedback } from '../agents/conflict-critic.ts'
import type { EngineSession } from '../engines/session.ts'
import { escalate } from './escalation.ts'
import { applyFallback } from './fallback.ts'
import type { TraceSink } from './trace.ts'

export interface ListingOutcome {
  listingId: string
  agentName: string
  decision: Decision
  status: ListingStatus
  /** The independent sources that answered. */
  sources: string[]
  confidence: number
  declaredPriceZar: number
  reconciledPriceZar: number | null
  reason: string
  listingCopy: string
  contentId: string
  revision: { field: string; from: string; to: string } | null
  fallback: boolean
  escalated: boolean
  critique: Critique
  conflicts: Conflict[]
  record: ListingRecord
  /** What the engines did for this listing. */
  engines: {
    markovian: { runId: string; chunks: number; tokensUsed: number; tokensSaved: number }
    memoryIds: string[]
    feedback: MemoryFeedback[]
    entityId: string
    eventIds: string[]
  }
}

export interface ListingRunInput {
  listing: Listing
  registry: SourceDescriptor[]
  llm: LlmPort
  llmHealth: LlmHealth
  providerConfigured: boolean
  trace: TraceSink
  now: () => string
  session: EngineSession
}

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`

export async function runListing(input: ListingRunInput): Promise<ListingOutcome> {
  const { listing, registry, llm, llmHealth, providerConfigured, trace, now, session } = input

  // ---- Loop 1: plan, gather, propose -------------------------------------
  const { plan, queries, engine: markovian } = await planSources({ listing, registry, session })

  trace.write(
    'volume-planner',
    {
      action: 'plan_sources',
      outcome: plan.unavailable.length > 0 ? 'fallback' : 'ok',
      input_summary:
        `${listing.listingId} (${listing.agent.displayName}) claims R${listing.declaredPriceZar} ` +
        `for ${listing.termMonths} months; fields: ${plan.fields.join(', ')}.`,
      output_summary:
        `Pulling ${plan.answered.length} independent source(s): ${plan.answered.join(', ') || 'none'}.` +
        (plan.unavailable.length > 0 ? ` ${plan.unavailable.join(', ')} did not answer.` : '') +
        ` Expanded into ${plan.buckets.length} evidence bucket(s) over ${markovian.chunks} chunk(s).`,
      target_agent: 'evidence-reconciler',
      confidence: null,
    },
    {
      listingId: listing.listingId,
      fields: plan.fields,
      sources: plan.sources.map((s) => s.id),
      buckets: plan.buckets,
      agent: listing.agent,
      declaredPriceZar: listing.declaredPriceZar,
      termMonths: listing.termMonths,
      declaredBy: listing.declaredBy,
      engine: {
        name: 'markovian',
        runId: markovian.runId,
        chunks: markovian.chunks,
        tokensUsed: markovian.tokensUsed,
        tokensSaved: markovian.tokensSaved,
        efficiencyPercent: markovian.efficiencyPercent,
        tokenLabel: markovian.tokenLabel,
      },
    },
  )

  for (const query of queries) {
    trace.write(
      'volume-planner',
      {
        action: 'query_source',
        outcome: query.answered ? 'ok' : 'fallback',
        input_summary: `Query ${query.source} for ${query.fields.join(', ')}.`,
        output_summary: query.answered
          ? `${query.source} answered for ${query.fields.join(', ')}.`
          : `${query.source} did not answer — the run continues without it.`,
        target_agent: 'evidence-reconciler',
        confidence: null,
      },
      { source: query.source, fields: query.fields, answered: query.answered },
    )
  }

  const recon = reconcile({ listing, plan, session })
  const fallbackState = applyFallback(plan, llmHealth, providerConfigured)

  trace.write(
    'evidence-reconciler',
    {
      action: 'reconcile',
      outcome: plan.unavailable.length > 0 ? 'fallback' : 'ok',
      input_summary:
        `Reconcile ${listing.listingId} from ${plan.answered.length} independent source(s): ` +
        `${plan.answered.join(', ') || 'none'}.`,
      output_summary:
        Object.keys(recon.values)
          .map(
            (field) =>
              `${field} = ${recon.values[field]} (${recon.provenance[field]}, confidence ` +
              `${recon.confidence})`,
          )
          .join('; ') || 'no field could be resolved from the independent sources.',
      target_agent: 'listing-closer',
      confidence: recon.confidence,
    },
    {
      listingId: listing.listingId,
      values: recon.values,
      provenance: recon.provenance,
      corroborated: recon.corroborated,
      conflicts: recon.conflicts,
      memoryIds: recon.memoryIds,
      engine: { name: 'hmem', memoryIds: recon.memoryIds },
    },
  )

  const draft = proposeListing(listing, recon)
  trace.write(
    'listing-closer',
    {
      action: 'close_listing',
      outcome: 'ok',
      input_summary: `Propose the draft for ${listing.listingId} at the reconciled evidence.`,
      output_summary: draft.listingCopy,
      target_agent: 'conflict-critic',
      confidence: recon.confidence,
    },
    {
      listingId: listing.listingId,
      phase: 'draft',
      contentId: draft.contentId,
      agent: listing.agent,
      declaredPriceZar: listing.declaredPriceZar,
      termMonths: listing.termMonths,
      declaredBy: listing.declaredBy,
    },
  )

  // ---- Loop 2: challenge, and answer the challenge ------------------------
  const { critique, feedback } = critiqueListing({ listing, recon, session })
  const challenged = critique.verdict !== 'accept'

  trace.write(
    'conflict-critic',
    {
      action: 'critique',
      outcome: critique.verdict === 'hold' ? 'escalated' : 'ok',
      input_summary: `Challenge the draft for ${listing.listingId}: ${draft.listingCopy}`,
      output_summary: critique.reason,
      target_agent: challenged ? 'evidence-reconciler' : 'listing-closer',
      confidence: recon.confidence,
    },
    {
      listingId: listing.listingId,
      verdict: critique.verdict,
      conflicts: critique.conflicts,
      supportingMemoryIds: critique.supportingMemoryIds,
      engine: { name: 'hmem', feedback },
    },
  )

  let escalated = false
  let escalationNote = ''

  if (challenged) {
    const stronger = critique.verdict === 'revise'
    trace.write(
      'evidence-reconciler',
      {
        action: 'revise',
        outcome: stronger ? 'ok' : 'escalated',
        input_summary: `Answering the critique: ${critique.reason}`,
        output_summary: stronger
          ? `The reconciled evidence answers it — ${critique.verdict === 'revise' ? `${recon.values['termMonths'] ?? 'n/a'} months (${recon.provenance['termMonths'] ?? 'n/a'})` : 'the draft is confirmed'}. The listing goes back to the closer.`
          : `No independent source supports the declared price, so the draft cannot be strengthened. The listing escalates once to the telemetry auditor.`,
        target_agent: stronger ? 'listing-closer' : 'telemetry-auditor',
        confidence: recon.confidence,
      },
      { listingId: listing.listingId, answers: critique.verdict },
    )

    if (!stronger) {
      const escalation = escalate(listing.listingId, recon, critique, escalated)
      escalated = escalation.escalated
      escalationNote = escalation.resolution
    }
  }

  const close = closeListing(listing, critique, recon)
  const decision: Decision = critique.verdict === 'hold'
    ? 'hold'
    : critique.verdict === 'revise'
      ? 'revise'
      : fallbackState.degraded
        ? 'fallback'
        : 'accept'

  // The canonical record, on the World Model.
  const record = await recordListing({
    listing,
    close,
    recon,
    session,
    at: now(),
  })

  trace.write(
    'listing-closer',
    {
      action: 'close_listing',
      outcome: close.status === 'held' ? 'escalated' : fallbackState.degraded ? 'fallback' : 'ok',
      input_summary: `Close ${listing.listingId} on the ${critique.verdict} verdict.`,
      output_summary: close.listingCopy,
      target_agent: 'telemetry-auditor',
      confidence: recon.confidence,
    },
    {
      listingId: listing.listingId,
      phase: 'close',
      status: close.status,
      decision,
      contentId: close.contentId,
      fallbackReasons: fallbackState.reasons,
      agent: listing.agent,
      declaredPriceZar: listing.declaredPriceZar,
      termMonths: listing.termMonths,
      declaredBy: listing.declaredBy,
      reconciledPriceZar: close.reconciledPriceZar,
      revised: close.revised,
      engine: {
        name: 'world-model',
        entityId: record.entityId,
        agentEntityId: record.agentEntityId,
        eventIds: record.eventIds,
        auditSeq: record.auditSeq,
      },
    },
  )

  const audit = await auditListing({
    listingId: listing.listingId,
    agentName: listing.agent.displayName,
    decision,
    listingCopy: close.listingCopy,
    conflicts: recon.conflicts,
    confidence: recon.confidence,
    escalated,
    unavailable: plan.unavailable,
    llm,
    entityId: record.entityId,
    session,
  })

  trace.write('telemetry-auditor', audit.trace, {
    listingId: listing.listingId,
    decision,
    escalated,
    escalation: escalationNote,
    engine: { name: 'world-model', entityId: record.entityId, eventIds: audit.eventIds },
  })

  const listingRecord: ListingRecord = {
    listingId: listing.listingId,
    agent: listing.agent,
    declaredPriceZar: listing.declaredPriceZar,
    reconciledPriceZar: close.reconciledPriceZar,
    status: close.status,
    provenance: close.provenance,
    contentId: close.contentId,
    recordedAt: now(),
  }

  return {
    listingId: listing.listingId,
    agentName: listing.agent.displayName,
    decision,
    status: close.status,
    sources: recon.answered,
    confidence: recon.confidence,
    declaredPriceZar: listing.declaredPriceZar,
    reconciledPriceZar: close.reconciledPriceZar,
    reason: critique.reason,
    listingCopy: close.listingCopy,
    contentId: close.contentId,
    revision: close.revised,
    fallback: fallbackState.degraded,
    escalated,
    critique,
    conflicts: recon.conflicts,
    record: listingRecord,
    engines: {
      markovian: {
        runId: markovian.runId,
        chunks: markovian.chunks,
        tokensUsed: markovian.tokensUsed,
        tokensSaved: markovian.tokensSaved,
      },
      memoryIds: recon.memoryIds,
      feedback,
      entityId: record.entityId,
      eventIds: record.eventIds,
    },
  }
}

/** The one-line summary the entry point prints per listing. */
export function outcomeLine(outcome: ListingOutcome, traceEntries: number): string {
  return (
    `${outcome.listingId}  ->  ${outcome.decision}  by conflict-critic  ` +
    `(trace: ${traceEntries} entries)`
  )
}

export { plural }
