/**
 * The trace sink — one JSONL file per run.
 *
 * The trace is the deliverable a judge reads. It must show the handoff, not just the
 * steps: `target_agent` is set on every handoff, the critic's step says what it
 * objected to, and the revised step says which critique it answers.
 */

import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { AgentRole } from '../types.ts'
import type { StepTrace } from '../agents/contracts.ts'
import { Tracer } from '../tracer.ts'
import { ROOT } from '../loading.ts'

export interface TraceSink {
  readonly runId: string
  /** The trace path, relative to the repo root — `logs/<runId>.jsonl`. */
  readonly logPath: string
  /** The roles that actually ran, in the order they first ran. */
  readonly roles: AgentRole[]
  write(role: AgentRole, step: StepTrace, detail: Record<string, unknown>): void
}

/** `trace-YYYYMMDD-NNN` — the next free sequence number for today. */
export function nextRunId(dir = join(ROOT, 'logs')): string {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const prefix = `trace-${day}-`
  let used = 0
  try {
    for (const name of readdirSync(dir)) {
      if (!name.startsWith(prefix) || !name.endsWith('.jsonl')) continue
      const sequence = Number(name.slice(prefix.length, -'.jsonl'.length))
      if (Number.isFinite(sequence) && sequence > used) used = sequence
    }
  } catch {
    // No logs directory yet — the first run creates it.
  }
  return `${prefix}${String(used + 1).padStart(3, '0')}`
}

export function createTraceSink(runId?: string): TraceSink {
  const id = runId ?? nextRunId()
  const tracer = new Tracer(id, join(ROOT, 'logs'))
  const roles: AgentRole[] = []
  return {
    runId: id,
    logPath: `logs/${id}.jsonl`,
    roles,
    write(role: AgentRole, step: StepTrace, detail: Record<string, unknown>) {
      if (!roles.includes(role)) roles.push(role)
      tracer.write({
        role,
        action: step.action,
        outcome: step.outcome,
        detail,
        input_summary: step.input_summary,
        output_summary: step.output_summary,
        target_agent: step.target_agent,
        confidence: step.confidence,
      })
    },
  }
}
