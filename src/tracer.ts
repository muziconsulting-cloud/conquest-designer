/**
 * JSONL tracer — one enriched AuditRecord per agent step.
 *
 * Writes AuditRecord fields plus judge-facing enrichment at the top level.
 * Does not reshape the AuditRecord contract in src/types.ts.
 */

import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { AgentRole, AuditRecord, RunId } from './types.ts'

export type TraceAction =
  | 'plan_sources'
  | 'query_source'
  | 'reconcile'
  | 'critique'
  | 'revise'
  | 'close_listing'
  | 'audit_telemetry'

export type TraceStatus = 'success' | 'error' | 'escalated' | 'fallback'

export interface TraceEnrichment {
  action: TraceAction
  input_summary: string
  output_summary: string
  target_agent: AgentRole | null
  confidence: number | null
  retry_count: number
}

export interface TraceLine extends AuditRecord {
  timestamp: string
  trace_id: RunId
  agent_name: AgentRole
  action: TraceAction
  input_summary: string
  output_summary: string
  target_agent: AgentRole | null
  confidence: number | null
  retry_count: number
  status: TraceStatus
}

function mapStatus(outcome: AuditRecord['outcome']): TraceStatus {
  switch (outcome) {
    case 'ok':
      return 'success'
    case 'error':
      return 'error'
    case 'escalated':
      return 'escalated'
    case 'fallback':
      return 'fallback'
  }
}

export function enrichRecord(record: AuditRecord, enrichment: TraceEnrichment): TraceLine {
  return {
    ...record,
    timestamp: record.at,
    trace_id: record.runId,
    agent_name: record.role,
    action: enrichment.action,
    input_summary: enrichment.input_summary,
    output_summary: enrichment.output_summary,
    target_agent: enrichment.target_agent,
    confidence: enrichment.confidence,
    retry_count: enrichment.retry_count,
    status: mapStatus(record.outcome),
  }
}

export class Tracer {
  readonly runId: RunId
  readonly logPath: string
  private ready: Promise<void>

  constructor(runId: RunId, logPath: string) {
    this.runId = runId
    this.logPath = logPath
    this.ready = mkdir(dirname(logPath), { recursive: true }).then(() => undefined)
  }

  async append(record: AuditRecord, enrichment: TraceEnrichment): Promise<TraceLine> {
    await this.ready
    const line = enrichRecord(record, enrichment)
    await Bun.write(this.logPath, `${JSON.stringify(line)}\n`, { createPath: true })
    // Bun.write truncates — append via file handle instead
    return line
  }

  async writeLine(record: AuditRecord, enrichment: TraceEnrichment): Promise<TraceLine> {
    await this.ready
    const line = enrichRecord(record, enrichment)
    const file = Bun.file(this.logPath)
    const prior = (await file.exists()) ? await file.text() : ''
    await Bun.write(this.logPath, `${prior}${JSON.stringify(line)}\n`)
    return line
  }
}
