/**
 * The World Model engine (Meterless).
 *
 * Implemented from the sponsor's contract, `vendor/meterless/world-model/AGENTS.md`.
 * The conformance suite is the definition of done:
 *
 *   WORLD_MODEL_IMPL=$PWD/src/engines/world-model/index.ts \
 *     bun vendor/meterless/world-model/conformance/runner.ts
 *
 * The shape is the spec's: a canonical store that is the source of truth, an
 * append-only event log that every mutation writes to, an audit trail derived from
 * that log, and views that are projections over the canonical state.
 */

import { entityIdFromExternalKey, entityIdFromName, hashId, relationId } from './ids.ts'
import {
  graphView,
  searchView,
  snapshotView,
  timelineView,
  type CustomView,
  type GraphView,
  type SearchView,
  type SnapshotView,
  type TimelineView,
  type WorldReader,
} from './views.ts'
import type {
  AssertFactInput,
  AuditEntry,
  ContextRecord,
  Entity,
  EventKind,
  Fact,
  IngestResult,
  Observation,
  Provenance,
  Relation,
  RelateInput,
  UpsertContextInput,
  UpsertEntityInput,
  WorldEvent,
} from './types.ts'

export * from './types.ts'
export { entityIdFromName, entityIdFromExternalKey, normalizeName } from './ids.ts'
export { graphView, timelineView, searchView, snapshotView } from './views.ts'

/**
 * The merge banding (spec `docs/ingest-pipeline.md`). The conformance suite is the
 * boundary ruling: 0.85 exactly auto-merges, 0.82 exactly queues for review, and
 * anything below 0.82 is a new entity. Auto-merges always write an alias — never a
 * destructive overwrite.
 */
export const AUTO_MERGE_THRESHOLD = 0.85
export const REVIEW_THRESHOLD = 0.82

export function decide(similarity: number): 'auto-merge' | 'review' | 'new' {
  if (similarity >= AUTO_MERGE_THRESHOLD) return 'auto-merge'
  if (similarity >= REVIEW_THRESHOLD) return 'review'
  return 'new'
}

export interface WorldModelOptions {
  storage?: 'memory' | 'local'
  namespace?: string
  schemaVersion?: number
  clock?: () => Date | string
}

interface CustomViewSpec {
  events: EventKind[]
  initialState: unknown
  reducer: (state: unknown, event: WorldEvent) => unknown
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
  return `{${entries.join(',')}}`
}

function isProvenance(value: unknown): value is Provenance {
  return typeof value === 'object' && value !== null && typeof (value as Provenance).kind === 'string'
}

export class WorldModel implements WorldReader {
  private readonly entityStore = new Map<string, Entity>()
  private readonly contextStore = new Map<string, ContextRecord>()
  private readonly relationStore = new Map<string, Relation>()
  private readonly factStore = new Map<string, Fact>()
  private readonly eventLog: WorldEvent[] = []
  private readonly auditLog: AuditEntry[] = []
  private readonly customViews = new Map<string, CustomViewSpec>()
  private readonly namespace: string
  private readonly clock: () => Date | string
  private seq = 0

  constructor(options: WorldModelOptions = {}) {
    this.namespace = options.namespace ?? 'default'
    this.clock = options.clock ?? (() => new Date())
  }

  // ---------------------------------------------------------------- read surface

  entities(): Entity[] {
    return [...this.entityStore.values()]
  }

  contexts(): ContextRecord[] {
    return [...this.contextStore.values()]
  }

  relations(): Relation[] {
    return [...this.relationStore.values()]
  }

  facts(): Fact[] {
    return [...this.factStore.values()]
  }

  events(): WorldEvent[] {
    return [...this.eventLog]
  }

  /** The audit trail — one entry per mutation, in order. */
  audit(): AuditEntry[] {
    return [...this.auditLog]
  }

  entity(id: string): Entity | undefined {
    return this.entityStore.get(id)
  }

  /**
   * The canonical state shape: a deterministic string over the canonical rows.
   * Aggregates (mention counts, timestamps) are deliberately excluded — the shape is
   * the content, not the bookkeeping, so re-running the same ingest cannot change it.
   */
  stateShapeCanonical(): string {
    const entities = this.entities()
      .map(
        (e) =>
          `${e.id}|${e.type}|${e.name ?? ''}|${stableStringify(e.attrs)}|${[...e.aliases].sort().join(',')}`,
      )
      .sort()
    const relations = this.relations()
      .map((r) => `${r.id}|${r.from}|${r.type}|${r.to}|${r.validFrom}|${r.validTo ?? ''}`)
      .sort()
    const facts = this.facts()
      .map((f) => `${f.about}|${f.predicate}|${stableStringify(f.value)}`)
      .sort()
    const contexts = this.contexts()
      .map((c) => `${c.id}|${c.type}|${c.parent ?? ''}|${stableStringify(c.attrs)}`)
      .sort()
    return stableStringify({ entities, relations, facts, contexts })
  }

  // -------------------------------------------------------------- write surface

  /**
   * Write an entity (spec §4). Provenance is mandatory: no provenance, no write.
   * The write is idempotent — an upsert that changes nothing appends no event.
   */
  async upsertEntity(input: UpsertEntityInput): Promise<Entity> {
    if (!isProvenance(input.source)) {
      throw new Error('write rejected: provenance is required — no provenance, no write')
    }

    const id = this.resolveEntityId(input)
    const now = this.now()
    const existing = this.entityStore.get(id)

    if (existing) {
      const merged = { ...existing.attrs, ...(input.attrs ?? {}) }
      const nameChanged = input.name !== undefined && input.name !== existing.name
      const attrsChanged = stableStringify(merged) !== stableStringify(existing.attrs)
      if (!attrsChanged && !nameChanged) {
        return existing
      }
      const updated: Entity = {
        ...existing,
        name: input.name ?? existing.name,
        attrs: merged,
        lastSeenAt: now,
        mentionCount: existing.mentionCount + 1,
        confidence: input.confidence ?? existing.confidence,
        provenance: input.source,
      }
      this.entityStore.set(id, updated)
      this.append('upsertEntity', { entity: updated })
      return updated
    }

    const entity: Entity = {
      id,
      type: input.type,
      ...(input.name !== undefined ? { name: input.name } : {}),
      attrs: { ...(input.attrs ?? {}) },
      aliases: [],
      provenance: input.source,
      firstSeenAt: now,
      lastSeenAt: now,
      mentionCount: 1,
      state: 'active',
      confidence: input.confidence ?? 0.5,
    }
    this.entityStore.set(id, entity)
    this.append('upsertEntity', { entity })
    return entity
  }

  /** Write a context — the environment an entity was observed in. */
  async upsertContext(input: UpsertContextInput): Promise<ContextRecord> {
    if (!isProvenance(input.source)) {
      throw new Error('write rejected: provenance is required — no provenance, no write')
    }
    const id = `ctx_${hashId([input.type, stableStringify(input.attrs), input.parent ?? '']).slice(0, 16)}`
    const existing = this.contextStore.get(id)
    if (existing) {
      const merged = { ...existing.attrs, ...input.attrs }
      if (stableStringify(merged) === stableStringify(existing.attrs)) return existing
      const updated: ContextRecord = { ...existing, attrs: merged }
      this.contextStore.set(id, updated)
      this.append('upsertContext', { context: updated })
      return updated
    }
    const context: ContextRecord = {
      id,
      type: input.type,
      attrs: { ...input.attrs },
      ...(input.parent !== undefined ? { parent: input.parent } : {}),
      provenance: input.source,
    }
    this.contextStore.set(id, context)
    this.append('upsertContext', { context })
    return context
  }

  /**
   * Write a relationship (spec §2.4). Edges are bitemporal: `validFrom` opens the
   * edge, and a later edge of the same (from, type) closes the previous one. Adding
   * the same edge twice is a no-op.
   */
  async relate(input: RelateInput): Promise<Relation> {
    if (!isProvenance(input.source)) {
      throw new Error('write rejected: provenance is required — no provenance, no write')
    }

    const id = relationId(input.from, input.type, input.to, input.context, input.validFrom)
    const existing = this.relationStore.get(id)
    if (existing) return existing

    const closed: string[] = []
    for (const relation of this.relationStore.values()) {
      if (relation.from !== input.from) continue
      if (relation.type !== input.type) continue
      if (input.context !== undefined && relation.context !== input.context) continue
      if (relation.validTo !== undefined) continue
      if (relation.validFrom >= input.validFrom) continue
      relation.validTo = input.validFrom
      closed.push(relation.id)
    }

    const relation: Relation = {
      id,
      from: input.from,
      to: input.to,
      type: input.type,
      props: { ...(input.props ?? {}) },
      ...(input.context !== undefined ? { context: input.context } : {}),
      validFrom: input.validFrom,
      provenance: input.source,
    }
    this.relationStore.set(id, relation)
    this.append('relate', { relation, closed })
    return relation
  }

  /** Write an atomic fact about an entity. */
  async assertFact(input: AssertFactInput): Promise<Fact> {
    if (!isProvenance(input.source)) {
      throw new Error('write rejected: provenance is required — no provenance, no write')
    }
    const id = `fct_${hashId([input.about, input.predicate, stableStringify(input.value)]).slice(0, 16)}`
    const existing = this.factStore.get(id)
    if (existing) return existing
    const fact: Fact = {
      id,
      about: input.about,
      predicate: input.predicate,
      value: input.value,
      source: input.source,
      confidence: input.confidence ?? 0.5,
    }
    this.factStore.set(id, fact)
    this.append('assertFact', { fact })
    return fact
  }

  /** Take a snapshot marker — the event log position the world was at. */
  async snapshot(at?: string): Promise<number> {
    this.append('snapshot', { at: at ?? this.now(), seq: this.eventLog.length })
    return this.eventLog.length
  }

  // -------------------------------------------------------------------- ingest

  /**
   * Ingest observations (spec `docs/ingest-pipeline.md`). Every write is idempotent,
   * so running the same batch twice produces no new events and leaves the canonical
   * state shape untouched. `changed` says whether anything was written.
   */
  async ingest(observations: Observation[]): Promise<IngestResult> {
    const eventsBefore = this.eventLog.length
    let written = 0
    let skipped = 0
    const eventIds: string[] = []

    for (const observation of observations) {
      const before = this.eventLog.length
      const observationId = entityIdFromExternalKey('observation', 'ingest', observation.externalId)

      await this.upsertEntity({
        type: 'observation',
        externalKey: { system: 'ingest', id: observation.externalId },
        attrs: { title: observation.title, at: observation.at },
        source: observation.source,
      })

      for (const mentioned of observation.entities ?? []) {
        const entity = await this.upsertEntity({
          type: mentioned.type,
          name: mentioned.name,
          attrs: { name: mentioned.name },
          source: observation.source,
        })
        await this.relate({
          from: observationId,
          type: 'mentions',
          to: entity.id,
          validFrom: observation.at,
          source: observation.source,
        })
      }

      if (this.eventLog.length > before) written += 1
      else skipped += 1
    }

    for (const event of this.eventLog.slice(eventsBefore)) eventIds.push(event.id)

    return {
      changed: this.eventLog.length > eventsBefore,
      written,
      skipped,
      eventIds,
    }
  }

  // ------------------------------------------------------------ entity resolution

  /**
   * Entity resolution (spec `docs/ingest-pipeline.md`): exact key match first, then a
   * banded probabilistic match. Below the review band a candidate is a new entity.
   */
  resolveCandidate(
    candidate: { type: string; name?: string; attrs?: Record<string, unknown> },
  ): { id: string; decision: 'auto-merge' | 'review' | 'new'; matchedId?: string } {
    const exact = this.entities().find(
      (e) =>
        e.type === candidate.type &&
        e.name !== undefined &&
        candidate.name !== undefined &&
        e.name.toLowerCase() === candidate.name.toLowerCase(),
    )
    if (exact) return { id: exact.id, decision: 'auto-merge', matchedId: exact.id }

    let best: { entity: Entity; similarity: number } | undefined
    for (const entity of this.entities()) {
      if (entity.type !== candidate.type) continue
      const similarity = this.similarity(candidate, entity)
      if (!best || similarity > best.similarity) best = { entity, similarity }
    }

    if (best) {
      const decision = decide(best.similarity)
      if (decision === 'auto-merge') {
        return { id: best.entity.id, decision, matchedId: best.entity.id }
      }
      if (decision === 'review') {
        return { id: best.entity.id, decision, matchedId: best.entity.id }
      }
    }

    return {
      id: candidate.name
        ? entityIdFromName(candidate.type, candidate.name)
        : `ent_${hashId([candidate.type, stableStringify(candidate.attrs ?? {})]).slice(0, 16)}`,
      decision: 'new',
    }
  }

  /** Merge one entity into another as an alias — reversible, never destructive. */
  merge(primaryId: string, aliasId: string, reason: string): Entity | undefined {
    const primary = this.entityStore.get(primaryId)
    const alias = this.entityStore.get(aliasId)
    if (!primary || !alias || primary.id === alias.id) return undefined
    if (!primary.aliases.includes(alias.id)) primary.aliases.push(alias.id)
    this.append('upsertEntity', { entity: primary, merge: { aliasId, reason } })
    return primary
  }

  /** Undo a merge — the alias pointer is removed, nothing else. */
  unmerge(primaryId: string, aliasId: string): boolean {
    const primary = this.entityStore.get(primaryId)
    if (!primary) return false
    const before = primary.aliases.length
    primary.aliases = primary.aliases.filter((id) => id !== aliasId)
    if (primary.aliases.length === before) return false
    this.append('upsertEntity', { entity: primary, unmerge: { aliasId } })
    return true
  }

  // ---------------------------------------------------------------------- views

  view(name: 'graph'): GraphView
  view(name: 'timeline'): TimelineView
  view(name: 'search'): SearchView
  view(name: 'snapshot'): SnapshotView
  view(name: string): GraphView | TimelineView | SearchView | SnapshotView | CustomView
  view(name: string): unknown {
    if (name === 'graph') return graphView(this)
    if (name === 'timeline') return timelineView(this)
    if (name === 'search') return searchView(this)
    if (name === 'snapshot') return snapshotView(this)
    const custom = this.customViews.get(name)
    if (!custom) throw new Error(`unknown view: ${name}`)
    let state = custom.initialState
    for (const event of this.eventLog) {
      if (!custom.events.includes(event.kind)) continue
      state = custom.reducer(state, event)
    }
    const bag = state as Record<string, unknown>
    return {
      state: () => state,
      get: (key: string) => bag[key],
    }
  }

  /** Register a custom projection (spec `docs/read-surface.md`). */
  registerView(name: string, spec: CustomViewSpec): void {
    this.customViews.set(name, spec)
  }

  // ------------------------------------------------------------------ internals

  private append(kind: EventKind, payload: Record<string, unknown>): WorldEvent {
    this.seq += 1
    const event: WorldEvent = {
      id: `evt-${String(this.seq).padStart(6, '0')}`,
      seq: this.seq,
      kind,
      at: this.now(),
      payload,
    }
    this.eventLog.push(event)
    this.auditLog.push({
      seq: this.auditLog.length + 1,
      eventId: event.id,
      kind,
      at: event.at,
      target: this.targetOf(kind, payload),
      summary: this.summaryOf(kind, payload),
    })
    return event
  }

  private targetOf(kind: EventKind, payload: Record<string, unknown>): string | undefined {
    const candidate = payload as { entity?: Entity; relation?: Relation; fact?: Fact; context?: ContextRecord }
    const record = candidate.entity ?? candidate.relation ?? candidate.fact ?? candidate.context
    return record?.id
  }

  private summaryOf(kind: EventKind, payload: Record<string, unknown>): string {
    const candidate = payload as { entity?: Entity; relation?: Relation; fact?: Fact; context?: ContextRecord }
    switch (kind) {
      case 'upsertEntity':
        return candidate.entity ? `upserted ${candidate.entity.type} ${candidate.entity.id}` : 'upserted entity'
      case 'upsertContext':
        return candidate.context ? `upserted context ${candidate.context.id}` : 'upserted context'
      case 'relate':
        return candidate.relation
          ? `related ${candidate.relation.from} → ${candidate.relation.to} (${candidate.relation.type})`
          : 'related entities'
      case 'assertFact':
        return candidate.fact ? `asserted ${candidate.fact.predicate} on ${candidate.fact.about}` : 'asserted fact'
      case 'snapshot':
        return 'snapshot'
    }
  }

  private resolveEntityId(input: UpsertEntityInput): string {
    if (input.externalKey) {
      return entityIdFromExternalKey(input.type, input.externalKey.system, input.externalKey.id)
    }
    if (input.name !== undefined) return entityIdFromName(input.type, input.name)
    return `ent_${hashId([input.type, stableStringify(input.attrs ?? {})]).slice(0, 16)}`
  }

  private similarity(
    candidate: { name?: string; attrs?: Record<string, unknown> },
    entity: Entity,
  ): number {
    const left = `${candidate.name ?? ''} ${stableStringify(candidate.attrs ?? {})}`
    const right = `${entity.name ?? ''} ${stableStringify(entity.attrs)}`
    const a = new Set(left.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    const b = new Set(right.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    if (a.size === 0 || b.size === 0) return 0
    let shared = 0
    for (const token of a) if (b.has(token)) shared += 1
    const union = a.size + b.size - shared
    return union === 0 ? 0 : shared / union
  }

  private now(): string {
    const value = this.clock()
    return value instanceof Date ? value.toISOString() : value
  }
}

export default WorldModel
