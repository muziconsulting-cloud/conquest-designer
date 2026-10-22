/**
 * The JSONL tracer — one line per agent step.
 *
 * A judge who reads only `logs/<runId>.jsonl` must be able to reconstruct the run:
 * who was called, in what order, with what, and what came back. So every line carries
 * the internal `AuditRecord` fields AND the judge-readable fields, at the top level of
 * the same object. The contract in `src/types.ts` is not reshaped to make this work —
 * the enrichment happens here, in the tracer.
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import type { AgentRole, AuditRecord } from './types.ts'

export type TraceStatus = 'success' | 'error' | 'escalated' | 'fallback'

export type TraceAction =
  | 'plan_sources'
  | 'query_source'
  | 'reconcile'
  | 'critique'
  | 'revise'
  | 'close_listing'
  | 'audit_telemetry'

export interface TraceEntry extends AuditRecord {
  /** ISO 8601 — the same instant as `at`. */
  timestamp: string
  trace_id: string
  agent_name: AgentRole
  action: TraceAction
  input_summary: string
  output_summary: string
  /** The role this step handed to, or null if it finished. */
  target_agent: AgentRole | null
  /** 0..1, or null when the step had no score. */
  confidence: number | null
  retry_count: number
  status: TraceStatus
}

export interface TraceInput {
  role: AgentRole
  action: TraceAction
  outcome: AuditRecord['outcome']
  detail: Record<string, unknown>
  input_summary: string
  output_summary: string
  target_agent?: AgentRole | null
  confidence?: number | null
  retry_count?: number
  at?: string
}

const statusOf = (outcome: AuditRecord['outcome']): TraceStatus =>
  outcome === 'ok' ? 'success' : outcome

export class Tracer {
  readonly runId: string
  readonly path: string
  private step = 0

  constructor(runId: string, dir = 'logs') {
    this.runId = runId
    this.path = `${dir}/${runId}.jsonl`
    mkdirSync(dir, { recursive: true })
  }

  write(input: TraceInput): TraceEntry {
    this.step += 1
    const at = input.at ?? new Date().toISOString()
    const entry: TraceEntry = {
      runId: this.runId,
      role: input.role,
      step: this.step,
      outcome: input.outcome,
      detail: input.detail,
      at,
      timestamp: at,
      trace_id: this.runId,
      agent_name: input.role,
      action: input.action,
      input_summary: input.input_summary,
      output_summary: input.output_summary,
      target_agent: input.target_agent ?? null,
      confidence: input.confidence ?? null,
      retry_count: input.retry_count ?? 0,
      status: statusOf(input.outcome),
    }
    appendFileSync(this.path, `${JSON.stringify(entry)}\n`, 'utf8')
    return entry
  }
}
