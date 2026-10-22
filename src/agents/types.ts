/**
 * Shared stub-agent context for P0 wiring.
 * Real agent logic lands in P4 / P5.
 */

import type { LlmPort } from '../llm/port.ts'
import type { Tracer } from '../tracer.ts'
import type {
  AgentIdentity,
  AuditRecord,
  Evidence,
  ListingId,
  MemoryId,
  ObservationId,
  RunId,
} from '../types.ts'

export type FixturePath = 'accept' | 'revise' | 'hold' | 'fallback'

export type ListingDecision = 'published' | 'held' | 'fallback'

export interface FixtureListing {
  listingId: ListingId
  declaredBy: 'human' | 'agent'
  agent: AgentIdentity
  declaredPriceZar: number
  termMonths: number
  expectedPath: FixturePath
  evidence: Array<{
    source: string
    field: string
    value: string | null
    observedAt: string
    confidence: number
    unavailable?: boolean
  }>
}

export interface WorkingListing {
  listingId: ListingId
  agent: AgentIdentity
  declaredBy: 'human' | 'agent'
  declaredPriceZar: number
  termMonths: number
  expectedPath: FixturePath
  evidence: Evidence[]
  sources: string[]
  decision: ListingDecision
  reconciledPriceZar: number | null
  confidence: number
  citations: string[]
  critiqueReason: string | null
  revised: boolean
  unavailableSources: string[]
}

export interface AgentStepResult {
  record: AuditRecord
  decision: ListingDecision
  confidence: number
  critiqueChangedDecision: boolean
  critiqueFinding: string | null
}

export interface AgentRunArgs {
  runId: RunId
  step: number
  listing: WorkingListing
  tracer: Tracer
  llm: LlmPort
  at: string
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** Deterministic working state derived from fixture evidence (no wall-clock). */
export function prepareWorkingListing(fixture: FixtureListing): WorkingListing {
  const unavailableSources = [
    ...new Set(
      fixture.evidence.filter((e) => e.unavailable).map((e) => e.source),
    ),
  ].sort()

  const sources = [...new Set(fixture.evidence.map((e) => e.source))].sort()

  const evidence: Evidence[] = fixture.evidence.map((e, i) => {
    const observationId: ObservationId = `${fixture.listingId}-obs-${String(i + 1).padStart(2, '0')}`
    const memoryIds: MemoryId[] = [`mem:${e.source}:${e.field}`]
    return {
      observationId,
      source: e.source,
      field: e.field,
      value: e.value === null ? '' : e.value,
      observedAt: e.observedAt,
      provenance: {
        memoryIds,
        confidence: e.confidence,
      },
    }
  })

  const citations = evidence
    .filter((e) => !unavailableSources.includes(e.source))
    .map((e) => e.provenance.memoryIds[0]!)
  const uniqueCitations = [...new Set(citations)].sort()

  const available = fixture.evidence.filter((e) => !e.unavailable)
  const confidence =
    available.length === 0
      ? 0
      : Math.round(
          (available.reduce((s, e) => s + e.confidence, 0) / available.length) * 100,
        ) / 100

  const base: WorkingListing = {
    listingId: fixture.listingId,
    agent: fixture.agent,
    declaredBy: fixture.declaredBy,
    declaredPriceZar: fixture.declaredPriceZar,
    termMonths: fixture.termMonths,
    expectedPath: fixture.expectedPath,
    evidence,
    sources,
    decision: 'published',
    reconciledPriceZar: fixture.declaredPriceZar,
    confidence,
    citations: uniqueCitations,
    critiqueReason: null,
    revised: false,
    unavailableSources,
  }

  switch (fixture.expectedPath) {
    case 'accept':
      return {
        ...base,
        decision: 'published',
        reconciledPriceZar: fixture.declaredPriceZar,
      }
    case 'hold':
      return {
        ...base,
        decision: 'held',
        reconciledPriceZar: null,
        critiqueReason:
          'Declared price is not supported by the reconciled evidence from disagreeing sources',
      }
    case 'revise':
      return {
        ...base,
        decision: 'published',
        reconciledPriceZar: fixture.declaredPriceZar,
        revised: false,
        critiqueReason: 'Term months disagree across sources; revision required before publish',
      }
    case 'fallback':
      return {
        ...base,
        decision: 'fallback',
        reconciledPriceZar: fixture.declaredPriceZar,
        critiqueReason:
          unavailableSources.length > 0
            ? `Source unavailable: ${unavailableSources.join(', ')}; degraded to remaining evidence`
            : 'Source unavailable; degraded run',
      }
  }
}
