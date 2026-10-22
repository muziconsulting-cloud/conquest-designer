/**
 * The seam between the roles and the engines.
 *
 * The five roles are ours; the three engines are the sponsors' contracts. This module
 * is the only place the two meet. It owns one H-MEM, one World Model and one Markovian
 * engine per run, and it is where an observation becomes a memory, a memory becomes a
 * citation, and a decision becomes an event in the canonical log.
 *
 * Two rules hold everywhere below.
 *
 *  1. **The engines never decide.** The exchange's documented rule decides — highest
 *     confidence, then the latest observation, then the source id. The engines store,
 *     retrieve, cite, record and learn. Where the two could disagree, the rule wins
 *     and the engine's opinion is reported, not obeyed.
 *  2. **The memory engine runs on a fixed clock.** The trace is a deliverable a judge
 *     compares across runs, so a memory id must not change because the wall clock
 *     moved. The wall clock appears in the run's own timestamps and nowhere else.
 */

import { HMEM } from './hmem/index.ts'
import { Markovian } from './markovian/index.ts'
import { WorldModel } from './world-model/index.ts'
import type { Evidence, Listing, MemoryId } from '../types.ts'

/** The fixed epoch the memory engine runs on. */
export const MEMORY_EPOCH = Date.parse('2026-10-22T00:00:00Z')

/** One observation, as the memory engine holds it. */
export interface IndexedObservation {
  memoryId: MemoryId
  observationId: string
  listingId: string
  source: string
  field: string
  value: string
  observedAt: string
  confidence: number
  /** The owner's declaration is the claim. It is remembered, never resolved with. */
  owner: boolean
}

export interface EngineSession {
  readonly hmem: HMEM
  readonly world: WorldModel
  readonly markovian: Markovian
  /** Every memory this session holds, indexed by the engine's own memory id. */
  readonly index: Map<MemoryId, IndexedObservation>
  /** The observation id -> memory id map, for the trace. */
  readonly citations: Map<string, MemoryId>
  /** The wall clock, for the run's own timestamps. */
  now(): string
}

/** One engine session per run. */
export function createEngineSession(options: { now?: () => string } = {}): EngineSession {
  const now = options.now ?? (() => new Date().toISOString())
  const fixedClock = (): number => MEMORY_EPOCH

  return {
    hmem: new HMEM({ clock: fixedClock }),
    world: new WorldModel({ namespace: 'conquest', clock: () => now() }),
    markovian: new Markovian({ clock: fixedClock }),
    index: new Map(),
    citations: new Map(),
    now,
  }
}

/**
 * The observation becomes a memory.
 *
 * The memory's content states the field, the value and the source; its tags carry the
 * field, the source, the listing and the observation time, so a recall can be filtered
 * by any of them. The engine's own ranking chooses the candidates; the exchange's rule
 * chooses the winner.
 *
 * An observation with no value is not remembered: a source that did not answer has
 * said nothing, and a memory of silence would be a lie of omission.
 */
export function seedObservation(
  session: EngineSession,
  listing: Listing,
  evidence: Evidence,
): IndexedObservation | undefined {
  if (evidence.value === '') return undefined

  const memory = session.hmem.add({
    content: `${evidence.field}: ${evidence.value} (${evidence.source})`,
    source: evidence.source,
    confidence: evidence.provenance.confidence,
    type: 'factual',
    layer: 'working',
    tags: [
      `field:${evidence.field}`,
      `source:${evidence.source}`,
      `listing:${listing.listingId}`,
      `observed:${evidence.observedAt}`,
    ],
  })

  const indexed: IndexedObservation = {
    memoryId: memory.id,
    observationId: evidence.observationId,
    listingId: listing.listingId,
    source: evidence.source,
    field: evidence.field,
    value: evidence.value,
    observedAt: evidence.observedAt,
    confidence: evidence.provenance.confidence,
    owner: evidence.source === 'owner-declaration',
  }

  session.index.set(memory.id, indexed)
  session.citations.set(evidence.observationId, memory.id)
  return indexed
}

/** Seed every observation a listing carries. */
export function seedListing(session: EngineSession, listing: Listing): IndexedObservation[] {
  const seeded: IndexedObservation[] = []
  for (const evidence of listing.evidence) {
    const indexed = seedObservation(session, listing, evidence)
    if (indexed) seeded.push(indexed)
  }
  return seeded
}

/**
 * Recall the memories that speak to one field of one listing.
 *
 * The engine ranks every memory it holds against the query; the tags narrow the field
 * and the listing. What comes back is a candidate set — the rule, not the engine,
 * decides which candidate wins.
 */
export function recallField(
  session: EngineSession,
  listingId: string,
  field: string,
): Array<{ indexed: IndexedObservation; score: number }> {
  const result = session.hmem.query(`${listingId} ${field}`, { threshold: 0, topN: 25 })
  const candidates: Array<{ indexed: IndexedObservation; score: number }> = []

  for (const scored of result.memories) {
    const indexed = session.index.get(scored.memory.id)
    if (!indexed) continue
    if (indexed.listingId !== listingId) continue
    if (indexed.field !== field) continue
    candidates.push({ indexed, score: scored.score })
  }

  return candidates
}
