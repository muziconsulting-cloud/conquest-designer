/**
 * The World Model data model (spec §2).
 *
 * Four record kinds and one append-only event log. The canonical store is the source
 * of truth; every view is derived from it and can be thrown away and rebuilt.
 */

export interface Provenance {
  kind: string
  at?: string
  url?: string
  checksum?: string
  [key: string]: unknown
}

export interface ExternalKey {
  system: string
  id: string
}

export interface Entity {
  id: string
  type: string
  name?: string
  attrs: Record<string, unknown>
  aliases: string[]
  provenance: Provenance
  firstSeenAt: string
  lastSeenAt: string
  mentionCount: number
  state: 'emerging' | 'active' | 'archived'
  confidence: number
}

export interface ContextRecord {
  id: string
  type: string
  attrs: Record<string, unknown>
  parent?: string
  provenance: Provenance
}

export interface Relation {
  id: string
  from: string
  to: string
  type: string
  props: Record<string, unknown>
  context?: string
  validFrom: string
  validTo?: string
  provenance: Provenance
}

export interface Fact {
  id: string
  about: string
  predicate: string
  value: unknown
  source: Provenance
  confidence: number
}

export type EventKind = 'upsertEntity' | 'upsertContext' | 'relate' | 'assertFact' | 'snapshot'

export interface WorldEvent {
  id: string
  seq: number
  kind: EventKind
  at: string
  payload: Record<string, unknown>
}

export interface AuditEntry {
  seq: number
  eventId: string
  kind: EventKind
  at: string
  target?: string
  summary: string
  details?: Record<string, unknown>
}

export interface ObservationEntity {
  type: string
  name: string
}

export interface Observation {
  externalId: string
  title: string
  at: string
  source: Provenance
  entities?: ObservationEntity[]
  [key: string]: unknown
}

export interface IngestResult {
  changed: boolean
  written: number
  skipped: number
  eventIds: string[]
}

export interface UpsertEntityInput {
  type: string
  name?: string
  externalKey?: ExternalKey
  attrs?: Record<string, unknown>
  source?: Provenance
  context?: string
  confidence?: number
}

export interface UpsertContextInput {
  type: string
  attrs: Record<string, unknown>
  parent?: string
  source?: Provenance
}

export interface RelateInput {
  from: string
  type: string
  to: string
  validFrom: string
  source?: Provenance
  props?: Record<string, unknown>
  context?: string
}

export interface AssertFactInput {
  about: string
  predicate: string
  value: unknown
  source?: Provenance
  confidence?: number
}

export interface NeighborOptions {
  via?: string
  at?: string
  direction?: 'out' | 'in' | 'both'
  inContext?: string
}
