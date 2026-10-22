/**
 * The evidence reconciler — what the independent evidence actually supports.
 *
 * The rule that makes the whole system work: **the owner's declaration is the claim,
 * not the evidence.** The reconciler resolves each field from the INDEPENDENT sources
 * only, so the claim can be contradicted. If the owner were allowed to win the
 * resolution, the pipeline could never hold anything.
 *
 * Resolution per field: the highest-confidence observation wins; ties break on the
 * most recent observation, then on the source id, so the result is deterministic.
 */

import type { Conflict, Listing } from '../types.ts'
import type { Plan, Reconciliation } from './contracts.ts'

interface Position {
  source: string
  value: string
  trust: number
  observedAt: string
  memoryIds: string[]
}

const better = (a: Position, b: Position): boolean => {
  if (a.trust !== b.trust) return a.trust > b.trust
  if (a.observedAt !== b.observedAt) return a.observedAt > b.observedAt
  return a.source.localeCompare(b.source) < 0
}

export function reconcile(listing: Listing, plan: Plan): Reconciliation {
  const ownerSources = new Set(
    plan.sources.filter((source) => source.kind === 'owner').map((source) => source.id),
  )
  const independent = plan.sources.filter((source) => source.kind !== 'owner')
  const independentIds = new Set(independent.map((source) => source.id))

  const values: Record<string, string> = {}
  const provenance: Record<string, string> = {}
  const corroborated: Record<string, string[]> = {}
  const conflicts: Conflict[] = []
  const memoryIds = new Set<string>()
  const winners: number[] = []

  for (const field of plan.fields) {
    const positions: Position[] = []

    for (const evidence of listing.evidence) {
      if (evidence.field !== field) continue
      if (ownerSources.has(evidence.source)) continue
      if (!independentIds.has(evidence.source)) continue
      if (plan.unavailable.includes(evidence.source)) continue
      if (evidence.value === '') continue

      positions.push({
        source: evidence.source,
        value: evidence.value,
        trust: evidence.provenance.confidence,
        observedAt: evidence.observedAt,
        memoryIds: evidence.provenance.memoryIds,
      })
    }

    if (positions.length === 0) continue

    let winner = positions[0] as Position
    for (const position of positions.slice(1)) {
      if (better(position, winner)) winner = position
    }

    values[field] = winner.value
    provenance[field] = winner.source
    corroborated[field] = positions
      .filter((position) => position.value === winner.value)
      .map((position) => position.source)
    winners.push(winner.trust)
    for (const id of winner.memoryIds) memoryIds.add(id)

    const distinct = [...new Set(positions.map((position) => position.value))]
    if (distinct.length > 1) {
      conflicts.push({
        field,
        positions: positions.map((position) => ({
          source: position.source,
          value: position.value,
          trust: position.trust,
        })),
        resolution: {
          winner: winner.source,
          why: `highest confidence (${winner.trust}) among the independent sources`,
        },
      })
    }
  }

  const answered = new Set<string>()
  for (const field of Object.keys(values)) {
    for (const source of corroborated[field] ?? []) answered.add(source)
  }

  const confidence =
    winners.length === 0
      ? 0
      : Math.round((winners.reduce((total, value) => total + value, 0) / winners.length) * 100) / 100

  return {
    values,
    provenance,
    corroborated,
    conflicts,
    unavailable: plan.unavailable,
    answered: [...answered].sort(),
    confidence,
    memoryIds: [...memoryIds].sort(),
  }
}
