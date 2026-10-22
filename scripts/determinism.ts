/**
 * The determinism gate.
 *
 * Two runs of the same fixtures must reach the same decisions, from the same values,
 * with the same citations. A judge who runs it twice must not see two different
 * answers.
 *
 * What moves between the runs, and is allowed to move: the wall-clock timestamps, the
 * trace id and path, and the long-run engine's run uuid. Everything else — the
 * decisions, the reconciled values, the provenance, the content ids, the memory ids,
 * the canonical entity ids, the event ids — must be identical.
 *
 *   bun run scripts/determinism.ts
 */

import { runExchange } from '../src/orchestrator/index.ts'
import type { TraceSink } from '../src/orchestrator/trace.ts'
import type { AgentRole } from '../src/types.ts'
import type { StepTrace } from '../src/agents/contracts.ts'

interface Captured {
  entries: Array<Record<string, unknown>>
  response: Record<string, unknown>
}

/** A trace sink that keeps the run in memory — the gate writes no files. */
function captureSink(): TraceSink & { entries: Array<Record<string, unknown>> } {
  const roles: AgentRole[] = []
  const entries: Array<Record<string, unknown>> = []
  return {
    runId: 'determinism',
    logPath: '(memory)',
    roles,
    entries,
    write(role: AgentRole, step: StepTrace, detail: Record<string, unknown>) {
      if (!roles.includes(role)) roles.push(role)
      entries.push({
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

/** The fields that are allowed to move between two runs. */
const VOLATILE = new Set(['at', 'timestamp', 'trace_id', 'runId', 'run_id', 'log_path', 'logPath'])

/** Strip the fields that are allowed to move between two runs. */
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(source).sort()) {
      if (VOLATILE.has(key)) continue
      if (key === 'engine') {
        // The long-run engine's run uuid is a uuid; the rest of the engine detail
        // (chunks, tokens, memory ids, entity ids) must match exactly.
        const engine = source[key] as Record<string, unknown>
        out[key] = stable({ ...engine, runId: undefined })
        continue
      }
      out[key] = stable(source[key])
    }
    return out
  }
  return value
}

async function capture(): Promise<Captured> {
  const sink = captureSink()
  const response = await runExchange({
    request: {
      request_id: 'determinism-run',
      user_query: 'Close every sample listing: publish what the evidence supports, and hold what it does not.',
      context: {},
    },
    trace: sink as TraceSink,
  })
  return {
    entries: sink.entries.map((entry) => stable(entry) as Record<string, unknown>),
    response: stable(response) as Record<string, unknown>,
  }
}

const first = await capture()
const second = await capture()

let failures = 0

const firstJson = JSON.stringify(first.response, null, 2)
const secondJson = JSON.stringify(second.response, null, 2)
if (firstJson !== secondJson) {
  failures += 1
  console.error('FAIL the response differs between two runs')
  const a = firstJson.split('\n')
  const b = secondJson.split('\n')
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) {
      console.error(`  line ${index + 1}:`)
      console.error(`    run 1: ${a[index]}`)
      console.error(`    run 2: ${b[index]}`)
    }
  }
} else {
  console.log('PASS the response is identical between two runs')
}

if (first.entries.length !== second.entries.length) {
  failures += 1
  console.error(
    `FAIL the trace length differs: ${first.entries.length} vs ${second.entries.length}`,
  )
} else {
  console.log(`PASS the trace length is identical (${first.entries.length} entries)`)
}

for (let index = 0; index < first.entries.length; index += 1) {
  const a = JSON.stringify(first.entries[index])
  const b = JSON.stringify(second.entries[index])
  if (a !== b) {
    failures += 1
    console.error(`FAIL trace entry ${index + 1} differs`)
    console.error(`  run 1: ${a}`)
    console.error(`  run 2: ${b}`)
  }
}

if (failures === 0) {
  console.log('PASS every trace entry is identical between two runs')
  console.log('PASS the swarm is deterministic')
  process.exit(0)
}

console.error(`FAIL ${failures} difference(s) between two runs`)
process.exit(1)
