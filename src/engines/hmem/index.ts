/**
 * H-MEM — the tiered human-memory engine (Meterless).
 *
 * Implemented from the sponsor's contract, `vendor/meterless/hmem/AGENTS.md`. The
 * conformance suite at `vendor/meterless/hmem/conformance/runner.ts` is the definition
 * of done; run it with
 *
 *   HMEM_IMPL=$PWD/src/engines/hmem/index.ts bun vendor/meterless/hmem/conformance/runner.ts
 *
 * The engine is deterministic and local: no provider key, no network, no clock beyond
 * the one it is handed.
 */

import { MemoryStoreService } from './store.ts'
import { TrustLedgerService } from './ledger.ts'
import { MemoryRetrievalService, clamp01, enrichDomain } from './retrieval.ts'
import { ConflictDetectionService, snapshot } from './conflicts.ts'
import { DreamingService } from './dreaming.ts'
import { SleepCycleService } from './sleep.ts'
import { contentTokens, cosine, embed, extractEntities } from './text.ts'
import type {
  AddInput,
  FeedbackKind,
  Memory,
  MemoryOrigin,
  MemoryState,
  QueryResult,
} from './types.ts'

export * from './types.ts'
export { MemoryStoreService } from './store.ts'
export { TrustLedgerService } from './ledger.ts'
export { MemoryRetrievalService } from './retrieval.ts'
export { ConflictDetectionService } from './conflicts.ts'
export { DreamingService } from './dreaming.ts'
export { SleepCycleService } from './sleep.ts'

/** Correction language that makes a supersede edge intentional (spec §5). */
const CORRECTION_MARKERS = [
  'actually',
  'correction',
  'no longer',
  'not anymore',
  'instead of',
  'revised',
  'updated to',
  'supersedes',
]

export interface HMEMOptions {
  clock?: () => number
}

export interface FeedbackResult {
  applied: boolean
  kind: FeedbackKind
  delta: number
  memory?: Memory
  reason?: string
}

export class HMEM {
  readonly store: MemoryStoreService
  readonly ledger: TrustLedgerService
  readonly retrieval: MemoryRetrievalService
  readonly conflicts: ConflictDetectionService
  readonly dreaming: DreamingService
  readonly sleep: SleepCycleService

  private readonly clock: () => number
  private counter = 0

  constructor(options: HMEMOptions = {}) {
    this.clock = options.clock ?? (() => Date.now())
    this.store = new MemoryStoreService()
    this.ledger = new TrustLedgerService(this.clock)
    this.retrieval = new MemoryRetrievalService(this.store, this.ledger, this.clock)
    this.conflicts = new ConflictDetectionService(this.store, this.ledger, this.clock)
    this.dreaming = new DreamingService(this.store, this.ledger, this.clock)
    this.sleep = new SleepCycleService(this.store, this.ledger, this.clock)
  }

  /**
   * Add a memory (spec §4, §5). A record with no source is rejected by construction:
   * reliability is mandatory, and a memory nobody can attribute is not a memory.
   */
  add(input: AddInput): Memory {
    const content = typeof input.content === 'string' ? input.content.trim() : ''
    const source = typeof input.source === 'string' ? input.source.trim() : ''

    if (content.length === 0) {
      throw new Error('memory rejected: content is required')
    }
    if (source.length === 0) {
      throw new Error(
        'memory rejected: source is required — a record with no source must be rejected by construction',
      )
    }

    const now = this.clock()
    const type = input.type ?? 'general'
    const layer = input.layer ?? 'short_term'
    const tags = [...(input.tags ?? [])]
    const { domain, namespace } = input.domain
      ? { domain: input.domain, namespace: input.namespace ?? `${input.domain}/uncategorized` }
      : enrichDomain(content, tags)

    this.counter += 1
    const memory: Memory = {
      id: this.nextId(content, now),
      content,
      type,
      layer,
      timestamp: now,
      lastAccessed: now,
      accessCount: 0,
      tags,
      embedding: embed(content, type),
      score: 0,
      confidence: clamp01(input.confidence ?? 0.5),
      source,
      provenance: {
        origin: this.originFor(source),
        learnedAt: now,
        label: source,
        ...(input.derivedFrom && input.derivedFrom.length > 0
          ? { refs: [...input.derivedFrom] }
          : {}),
        ...(input.provenance ?? {}),
      },
      ...(input.chatId ? { chatId: input.chatId } : {}),
      ...(input.missionId ? { missionId: input.missionId } : {}),
      ...(input.goalRunId ? { goalRunId: input.goalRunId } : {}),
      domain,
      namespace,
      entities: extractEntities(content),
      relatedTo: [],
      derivedFrom: [...(input.derivedFrom ?? [])],
    }

    this.store.put(memory)
    this.linkSupersede(memory)
    this.ledger.append({
      memoryId: memory.id,
      action: 'create',
      actor: 'hmem',
      newState: snapshot(memory) as unknown as Record<string, unknown>,
      details: { source, layer, type, domain },
    })
    return memory
  }

  /**
   * Retrieval (spec §6.1) — the hybrid formula, thresholded and ranked.
   */
  query(text: string, options?: { threshold?: number; topN?: number }): QueryResult {
    return this.retrieval.query(text, options)
  }

  /**
   * Feedback adaptation (spec §9.2) — the exact deltas:
   *   helpful      → accessCount += 1, confidence += 0.05
   *   not_helpful  → confidence −= 0.03
   *   wrong        → confidence −= 0.20, tagged for review
   */
  feedback(id: string, kind: FeedbackKind): FeedbackResult {
    const memory = this.store.get(id)
    if (!memory) {
      return { applied: false, kind, delta: 0, reason: `no memory with id ${id}` }
    }

    const previous: MemoryState = snapshot(memory)
    let delta = 0

    switch (kind) {
      case 'helpful':
        memory.accessCount += 1
        delta = 0.05
        break
      case 'not_helpful':
        delta = -0.03
        break
      case 'wrong':
        delta = -0.2
        if (!memory.tags.includes('review')) memory.tags.push('review')
        break
      default:
        throw new Error(`unknown feedback kind: ${String(kind)}`)
    }

    memory.confidence = clamp01(memory.confidence + delta)

    this.ledger.append({
      memoryId: memory.id,
      action: 'feedback',
      actor: 'user',
      previousState: previous as unknown as Record<string, unknown>,
      newState: snapshot(memory) as unknown as Record<string, unknown>,
      details: { kind, delta },
    })

    return { applied: true, kind, delta, memory }
  }

  /** The memory context as it would be reinjected into a prompt (spec §6.2). */
  reinject(result: QueryResult): string {
    return this.retrieval.reinject(result)
  }

  /**
   * Supersede detection (spec §5) — only when the new record is explicitly a
   * correction of a similar older one. Conservative on purpose: a false supersede
   * edge would hide a live record from retrieval.
   */
  private linkSupersede(memory: Memory): void {
    const lower = memory.content.toLowerCase()
    if (!CORRECTION_MARKERS.some((marker) => lower.includes(marker))) return

    for (const other of this.store.all()) {
      if (other.id === memory.id) continue
      if (other.supersededBy !== undefined) continue
      if (cosine(memory.embedding, other.embedding) < 0.82) continue
      memory.supersedes = other.id
      other.supersededBy = memory.id
      this.ledger.append({
        memoryId: other.id,
        action: 'update',
        actor: 'hmem',
        newState: snapshot(other) as unknown as Record<string, unknown>,
        details: { reason: 'superseded by a correction', supersededBy: memory.id },
      })
      return
    }
  }

  private originFor(source: string): MemoryOrigin {
    if (source.startsWith('dream')) return 'dreaming'
    if (source.startsWith('sleep')) return 'sleep'
    if (source.startsWith('feedback')) return 'feedback'
    if (source.startsWith('file') || source.startsWith('doc')) return 'document'
    if (source.startsWith('chat') || source.startsWith('user')) return 'interaction'
    return 'external'
  }

  private nextId(content: string, now: number): string {
    let hash = 2166136261
    const seed = `${content}|${now}|${this.counter}`
    for (let i = 0; i < seed.length; i += 1) {
      hash ^= seed.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
    }
    return `mem-${String(this.counter).padStart(6, '0')}-${(hash >>> 0).toString(16).padStart(8, '0')}`
  }
}

export default HMEM
