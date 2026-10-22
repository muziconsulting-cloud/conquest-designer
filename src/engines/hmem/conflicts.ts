/**
 * Conflict detection and resolution (spec §10).
 *
 * Detection looks for opposing phrase pairs on similar content, and for divergent
 * numeric claims about the same subject. Resolution is weighted and gated: below a
 * decision confidence of 0.70 the conflict is queued for a human, and a resolved
 * conflict never deletes a record — the loser is marked `supersededBy` and is
 * penalised in ranking instead.
 */

import { MemoryStoreService } from './store.ts'
import { TrustLedgerService } from './ledger.ts'
import { clamp01 } from './retrieval.ts'
import { cosine, tokenize } from './text.ts'
import type { Conflict, Memory, MemoryState } from './types.ts'

/** Opposing phrase pairs. The first word of each pair is the affirmative form. */
const OPPOSING_PAIRS: Array<[string, string]> = [
  ['always', 'never'],
  ['enable', 'disable'],
  ['enabled', 'disabled'],
  ['allow', 'deny'],
  ['allowed', 'denied'],
  ['accept', 'reject'],
  ['include', 'exclude'],
  ['visible', 'hidden'],
  ['public', 'private'],
  ['active', 'inactive'],
  ['on', 'off'],
  ['yes', 'no'],
]

const NUMERIC_CLAIM = /(-?\d+(?:\.\d+)?)\s*(%|percent|ms|s|seconds|minutes|hours|days|r|rand)?/g

/** Sources whose claims outrank others when they conflict (spec §10.2). */
const SOURCE_RELIABILITY: Record<string, number> = {
  user_correction: 1.0,
  user: 0.8,
  document: 0.7,
  external: 0.5,
  chat: 0.5,
  model: 0.4,
}

export const AUTO_RESOLVE_GATE = 0.7

export function snapshot(memory: Memory): MemoryState {
  const state: MemoryState = {
    confidence: memory.confidence,
    accessCount: memory.accessCount,
    tags: [...memory.tags],
    layer: memory.layer,
    type: memory.type,
  }
  if (memory.supersededBy !== undefined) state.supersededBy = memory.supersededBy
  return state
}

export class ConflictDetectionService {
  private readonly conflicts: Conflict[] = []
  private counter = 0

  constructor(
    private readonly store: MemoryStoreService,
    private readonly ledger: TrustLedgerService,
    private readonly clock: () => number,
  ) {}

  all(): Conflict[] {
    return [...this.conflicts]
  }

  /** Scan every pair for a contradiction (spec §10.1). */
  scan(): Conflict[] {
    const memories = this.store.all()
    const found: Conflict[] = []
    const seen = new Set<string>()

    for (let i = 0; i < memories.length; i += 1) {
      const a = memories[i]
      if (!a) continue
      for (let j = i + 1; j < memories.length; j += 1) {
        const b = memories[j]
        if (!b) continue
        if (a.supersededBy === b.id || b.supersededBy === a.id) continue

        const similarity = cosine(a.embedding, b.embedding)
        const opposing = this.findOpposingPair(a, b)
        const numeric = this.findNumericDivergence(a, b)

        let kind: Conflict['kind'] | undefined
        let reason = ''
        if (opposing && similarity >= 0.5) {
          kind = 'opposing_phrase'
          reason = `opposing phrases "${opposing[0]}" / "${opposing[1]}" on similar content`
        } else if (numeric) {
          kind = 'numeric_divergence'
          reason = `divergent numeric claim (${numeric[0]} vs ${numeric[1]})`
        }
        if (!kind) continue

        const key = [a.id, b.id].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)

        this.counter += 1
        const conflict: Conflict = {
          id: `cfl-${String(this.counter).padStart(4, '0')}`,
          aId: a.id,
          bId: b.id,
          kind,
          reason,
          similarity,
          detectedAt: this.clock(),
          decided: false,
        }
        found.push(conflict)
        this.conflicts.push(conflict)
        this.ledger.append({
          memoryId: null,
          action: 'conflict_detected',
          actor: 'conflict-detection',
          details: {
            conflictId: conflict.id,
            aId: a.id,
            bId: b.id,
            kind,
            reason,
            similarity,
          },
        })
      }
    }
    return found
  }

  /** The opposing phrase pair between two records, if there is one. */
  private findOpposingPair(a: Memory, b: Memory): [string, string] | undefined {
    const aTokens = new Set(tokenize(a.content))
    const bTokens = new Set(tokenize(b.content))
    for (const [positive, negative] of OPPOSING_PAIRS) {
      if (aTokens.has(positive) && bTokens.has(negative)) return [positive, negative]
      if (aTokens.has(negative) && bTokens.has(positive)) return [negative, positive]
    }
    return undefined
  }

  /** Two records that quote different numbers for the same subject. */
  private findNumericDivergence(a: Memory, b: Memory): [string, string] | undefined {
    const numbers = (content: string): string[] => {
      const matches = content.match(NUMERIC_CLAIM)
      return matches ? matches.map((m) => m.trim()) : []
    }
    const aNumbers = numbers(a.content)
    const bNumbers = numbers(b.content)
    if (aNumbers.length === 0 || bNumbers.length === 0) return undefined
    const shared = aNumbers.filter((n) => bNumbers.includes(n))
    if (shared.length === aNumbers.length && shared.length === bNumbers.length) return undefined
    return [aNumbers.join(', '), bNumbers.join(', ')]
  }

  /**
   * The weighted score of keeping one record over the other (spec §10.2): confidence,
   * recency, access frequency, content richness and source reliability.
   */
  private keepScore(memory: Memory, other: Memory): number {
    const now = this.clock()
    const ageDays = (now - memory.timestamp) / (24 * 60 * 60 * 1000)
    const recency = Math.exp(-ageDays / 30)
    const maxAccess = Math.max(memory.accessCount, other.accessCount, 1)
    const access = memory.accessCount / maxAccess
    const richness = Math.min(1, memory.content.length / 400)
    const reliability = SOURCE_RELIABILITY[memory.source] ?? 0.5

    return (
      0.45 * memory.confidence +
      0.15 * recency +
      0.10 * access +
      0.10 * richness +
      0.20 * reliability
    )
  }

  /**
   * Auto-decide a conflict. Below the gate it is queued for a human; at or above the
   * gate the loser is marked `supersededBy` and both records survive.
   */
  autoResolve(conflict: Conflict): 'resolved' | 'queued' {
    const a = this.store.get(conflict.aId)
    const b = this.store.get(conflict.bId)
    if (!a || !b) {
      conflict.decided = false
      conflict.resolution = 'queued'
      return 'queued'
    }

    const scoreA = this.keepScore(a, b)
    const scoreB = this.keepScore(b, a)
    const margin = Math.abs(scoreA - scoreB)
    const decisionConfidence = clamp01(0.5 + margin)

    if (decisionConfidence < AUTO_RESOLVE_GATE) {
      conflict.decided = false
      conflict.resolution = 'queued'
      this.ledger.append({
        memoryId: null,
        action: 'conflict_detected',
        actor: 'conflict-resolution',
        details: {
          conflictId: conflict.id,
          outcome: 'queued',
          decisionConfidence,
          note: 'below the auto-resolve gate — queued for human review',
        },
      })
      return 'queued'
    }

    const winner = scoreA >= scoreB ? a : b
    const loser = winner.id === a.id ? b : a
    const previous = snapshot(loser)
    loser.supersededBy = winner.id

    conflict.decided = true
    conflict.resolution = 'resolved'

    this.ledger.append({
      memoryId: loser.id,
      action: 'conflict_resolved',
      actor: 'conflict-resolution',
      previousState: previous as unknown as Record<string, unknown>,
      newState: snapshot(loser) as unknown as Record<string, unknown>,
      details: {
        conflictId: conflict.id,
        winner: winner.id,
        loser: loser.id,
        decisionConfidence,
        strategy: winner.id === a.id ? 'keep-a' : 'keep-b',
      },
    })

    return 'resolved'
  }

  /** Resolve with an explicit human decision (spec §10.2 strategies). */
  resolve(
    conflict: Conflict,
    strategy: 'keep-a' | 'keep-b' | 'keep-both' | 'merge' | 'delete-both',
  ): 'resolved' | 'queued' {
    const a = this.store.get(conflict.aId)
    const b = this.store.get(conflict.bId)
    if (!a || !b) return 'queued'

    if (strategy === 'keep-both') {
      conflict.decided = true
      conflict.resolution = 'resolved'
      this.ledger.append({
        memoryId: null,
        action: 'conflict_resolved',
        actor: 'human',
        details: { conflictId: conflict.id, strategy },
      })
      return 'resolved'
    }

    const loser = strategy === 'keep-a' ? b : a
    const winner = strategy === 'keep-a' ? a : b
    const previous = snapshot(loser)
    loser.supersededBy = winner.id
    conflict.decided = true
    conflict.resolution = 'resolved'
    this.ledger.append({
      memoryId: loser.id,
      action: 'conflict_resolved',
      actor: 'human',
      previousState: previous as unknown as Record<string, unknown>,
      newState: snapshot(loser) as unknown as Record<string, unknown>,
      details: { conflictId: conflict.id, strategy, winner: winner.id },
    })
    return 'resolved'
  }
}
