/**
 * The canonical H-MEM memory model (spec §2).
 *
 * Every field here is specified by `vendor/meterless/hmem/AGENTS.md`. Nothing in this
 * file is invented: it is the shape the sponsor's conformance suite asserts against.
 */

export type MemoryType = 'personal' | 'factual' | 'preference' | 'general'

export type MemoryLayer = 'short_term' | 'working' | 'long_term'

export type MemoryOrigin =
  | 'interaction'
  | 'document'
  | 'dreaming'
  | 'sleep'
  | 'feedback'
  | 'external'

export type EntityType = 'technology' | 'concept' | 'person' | 'organization' | 'unknown'

export interface Entity {
  id: string
  name: string
  type: EntityType
}

export interface Provenance {
  origin: MemoryOrigin
  learnedAt: number
  label: string
  refs?: string[]
}

export interface Memory {
  id: string
  content: string
  type: MemoryType
  layer: MemoryLayer
  timestamp: number
  lastAccessed: number
  accessCount: number
  tags: string[]
  embedding: number[]
  score: number
  confidence: number
  source: string
  provenance: Provenance
  chatId?: string
  missionId?: string
  goalRunId?: string
  domain: string
  namespace: string
  entities: Entity[]
  relatedTo: string[]
  supersedes?: string
  supersededBy?: string
  derivedFrom: string[]
}

export interface AddInput {
  content: string
  source: string
  confidence?: number
  type?: MemoryType
  layer?: MemoryLayer
  tags?: string[]
  derivedFrom?: string[]
  chatId?: string
  missionId?: string
  goalRunId?: string
  domain?: string
  namespace?: string
  provenance?: Partial<Provenance>
}

export type FeedbackKind = 'helpful' | 'not_helpful' | 'wrong'

export type LedgerAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'feedback'
  | 'promote'
  | 'demote'
  | 'merge'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'sleep_consolidate'
  | 'sleep_archive'
  | 'sleep_synthesize'
  | 'dream_proposed'
  | 'dream_approved'
  | 'dream_rejected'
  | 'restore'

export interface LedgerEntry {
  id: string
  memoryId: string | null
  action: LedgerAction
  actor: string
  timestamp: number
  previousState?: Record<string, unknown>
  newState?: Record<string, unknown>
  details?: Record<string, unknown>
}

export interface MemoryState {
  confidence: number
  accessCount: number
  tags: string[]
  layer: MemoryLayer
  type: MemoryType
  supersededBy?: string
}

export type ConflictKind = 'opposing_phrase' | 'numeric_divergence' | 'entity_divergence'

export interface Conflict {
  id: string
  aId: string
  bId: string
  kind: ConflictKind
  reason: string
  similarity: number
  detectedAt: number
  decided: boolean
  resolution?: 'resolved' | 'queued'
}

export type DreamProposalType = 'insight' | 'domain' | 'invariant'

export interface DreamProposal {
  id: string
  type: DreamProposalType
  content: string
  derivedFrom: string[]
  confidence: number
  status: 'pending' | 'approved' | 'rejected'
}

export interface SleepPreview {
  toConsolidate: string[]
  toArchive: string[]
  toSynthesize: string[][]
}

export interface SleepReport {
  backupId: string
  consolidated: string[]
  archived: string[]
  synthesized: string[]
  counts: { consolidated: number; archived: number; synthesized: number }
  actionLog: Array<{ action: string; memoryId: string }>
}

export interface ScoredMemory {
  memory: Memory
  score: number
  raw: number
  factors: {
    semantic: number
    keyword: number
    tag: number
    domain: number
    entity: number
    layer: number
    recency: number
    superseded: number
  }
}

export interface QueryResult {
  memories: ScoredMemory[]
  strategy: 'minimal' | 'personal' | 'comprehensive'
  retrievalReason: string
  queryTokens: string[]
  evaluated: number
  kept: number
}
