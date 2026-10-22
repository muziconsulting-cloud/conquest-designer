/**
 * The internal contracts the five agents and the orchestrator share.
 *
 * `src/types.ts` is the frozen public contract of the exchange. These are the
 * working types inside the swarm — the shapes the roles pass to each other.
 */

import type { AgentRole, Conflict, Listing, MemoryId } from '../types.ts'
import type { TraceAction } from '../tracer.ts'

/** One federated source, as the source registry describes it. */
export interface SourceDescriptor {
  id: string
  /** `owner` is the claim itself; `federated` is independent evidence. */
  kind: 'federated' | 'owner' | 'local'
  /** Base trust of the source, 0..1. Used to order the pull, not to resolve. */
  trust: number
  /** False when the source could not be reached for this run. */
  available: boolean
}

/** What the volume planner decided to pull, and in what order. */
export interface Plan {
  /** The sources to pull, ordered by base trust, descending. */
  sources: SourceDescriptor[]
  /** The fields the listing speaks about. */
  fields: string[]
  /** Sources that could not be reached. */
  unavailable: string[]
  /** The sources that answered, in pull order. */
  answered: string[]
}

/** What the reconciler concluded, with the citation for every field. */
export interface Reconciliation {
  /** field -> the value the independent evidence supports. */
  values: Record<string, string>
  /** field -> the source that won that field. */
  provenance: Record<string, string>
  /** field -> the source that confirmed the winning value. */
  corroborated: Record<string, string[]>
  /** The fields the sources disagree about. */
  conflicts: Conflict[]
  /** Sources that were unavailable for this run. */
  unavailable: string[]
  /** Independent sources that answered at all. */
  answered: string[]
  /** Mean confidence of the winning observations, 0..1. */
  confidence: number
  /** The memory ids the reconciliation recalled. */
  memoryIds: MemoryId[]
}

/** The trace metadata an agent hands back for its own step. */
export interface StepTrace {
  action: TraceAction
  outcome: 'ok' | 'escalated' | 'fallback' | 'error'
  input_summary: string
  output_summary: string
  target_agent: AgentRole | null
  confidence: number | null
}

/** The close decision, and the listing copy that may accompany it. */
export interface CloseResult {
  status: 'published' | 'held'
  /** What the reconciled evidence supports. Null when it supports nothing. */
  reconciledPriceZar: number | null
  /** field -> the source that won that field. Always present. */
  provenance: Record<string, string>
  /** Stable, content-addressable id for the canonical record. */
  contentId: string
  /** The revision the critic asked for, if one was applied. */
  revised: { field: string; from: string; to: string } | null
  /** The listing copy. It may not claim more than the evidence supports. */
  listingCopy: string
  /** True when the run was degraded — a source did not answer. */
  fallback: boolean
}
