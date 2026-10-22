/**
 * Shared swarm pipeline — fixtures or a single judge request.
 * Agents are stubs in P0; the wire and the response contract are real.
 */

import { mkdir } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { runConflictCritic } from './agents/conflict-critic.ts'
import { runEvidenceReconciler } from './agents/evidence-reconciler.ts'
import { runListingCloser } from './agents/listing-closer.ts'
import { runTelemetryAuditor } from './agents/telemetry-auditor.ts'
import {
  type FixtureListing,
  type FixturePath,
  type WorkingListing,
  nowIso,
  prepareWorkingListing,
} from './agents/types.ts'
import { runVolumePlanner } from './agents/volume-planner.ts'
import { resolveLlm } from './engine/registry.ts'
import type { LlmPort } from './llm/port.ts'
import { Tracer } from './tracer.ts'
import type { AgentRole, RunId } from './types.ts'

export const FIXTURES_PATH = 'fixtures/listing-set.json'
export const AGENT_ORDER: AgentRole[] = [
  'volume-planner',
  'evidence-reconciler',
  'listing-closer',
  'conflict-critic',
  'telemetry-auditor',
]

export interface RunRequest {
  request_id: string
  user_query: string
  context?: Record<string, unknown>
}

export interface RunFinding {
  listing_id: string
  decision: string
  sources: string[]
  confidence: number
}

export interface RunResponse {
  request_id: string
  trace_id: string
  status: 'success' | 'error'
  agents_used: AgentRole[]
  result: {
    summary: string
    findings: RunFinding[]
    confidence: number
  }
  collaboration: {
    feedback_loop_completed: boolean
    revision_count: number
    evaluator_findings: string[]
  }
  log_path: string
}

export interface ListingSummary {
  listingId: string
  decision: string
  confidence: number
  expectedPath: FixturePath
  citations: string[]
}

interface ListingSet {
  listings: FixtureListing[]
}

export async function loadFixtures(path = FIXTURES_PATH): Promise<FixtureListing[]> {
  const data = (await Bun.file(path).json()) as ListingSet
  return data.listings
}

function newTraceId(): RunId {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const h = String(d.getUTCHours()).padStart(2, '0')
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  const s = String(d.getUTCSeconds()).padStart(2, '0')
  const ms = String(d.getUTCMilliseconds()).padStart(3, '0')
  return `trace-${y}${m}${day}-${h}${min}${s}${ms}`
}

/** Select fixture paths from the natural language of the query — not exact strings. */
export function selectPathsForQuery(userQuery: string): FixturePath[] | 'all' {
  const q = userQuery.toLowerCase()
  if (
    q.includes('does not support') ||
    q.includes('not support') ||
    q.includes('held') ||
    q.includes('hold')
  ) {
    return ['hold']
  }
  if (q.includes('fallback') || q.includes('unavailable') || q.includes('degraded')) {
    return ['fallback']
  }
  if (
    q.includes('publish') ||
    q.includes('supports the declared') ||
    q.includes('evidence supports')
  ) {
    return ['accept']
  }
  if (q.includes('revise') || q.includes('revision') || q.includes('term')) {
    return ['revise']
  }
  return 'all'
}

async function runListingAgents(
  listing: WorkingListing,
  runId: RunId,
  tracer: Tracer,
  llm: LlmPort,
  stepOffset: number,
): Promise<{
  agents_used: AgentRole[]
  revision_count: number
  evaluator_findings: string[]
  feedback_loop_completed: boolean
  steps: number
}> {
  const agents_used: AgentRole[] = []
  let step = stepOffset
  let revision_count = 0
  const evaluator_findings: string[] = []
  let feedback_loop_completed = false

  const runners = [
    runVolumePlanner,
    runEvidenceReconciler,
    runListingCloser,
    runConflictCritic,
    runTelemetryAuditor,
  ] as const

  for (let i = 0; i < runners.length; i++) {
    const runner = runners[i]!
    const role = AGENT_ORDER[i]!
    const at = nowIso()
    const result = await runner({
      runId,
      step,
      listing,
      tracer,
      llm,
      at,
    })
    agents_used.push(role)
    step += 1
    if (result.critiqueFinding) {
      evaluator_findings.push(result.critiqueFinding)
    }
    if (result.critiqueChangedDecision) {
      feedback_loop_completed = true
      revision_count += 1
    }
  }

  return {
    agents_used,
    revision_count,
    evaluator_findings,
    feedback_loop_completed,
    steps: step - stepOffset,
  }
}

function summarizeFindings(listings: WorkingListing[]): {
  summary: string
  findings: RunFinding[]
  confidence: number
} {
  const findings: RunFinding[] = listings.map((l) => ({
    listing_id: l.listingId,
    decision: l.decision,
    sources: l.sources,
    confidence: l.confidence,
  }))

  const held = listings.filter((l) => l.decision === 'held').length
  const published = listings.filter((l) => l.decision === 'published').length
  const fallback = listings.filter((l) => l.decision === 'fallback').length

  const parts: string[] = []
  if (held > 0) {
    parts.push(
      held === 1
        ? 'One listing is held: the declared price is not supported by the reconciled evidence.'
        : `${held} listings are held: the declared price is not supported by the reconciled evidence.`,
    )
  }
  if (published > 0) {
    parts.push(
      published === 1
        ? 'One listing is published: reconciled evidence supports the declared price.'
        : `${published} listings are published: reconciled evidence supports the declared price.`,
    )
  }
  if (fallback > 0) {
    parts.push(
      fallback === 1
        ? 'One listing took the fallback path because a source was unavailable.'
        : `${fallback} listings took the fallback path because a source was unavailable.`,
    )
  }
  const summary =
    parts.length > 0 ? parts.join(' ') : `Processed ${listings.length} listing(s).`

  const confidence =
    listings.length === 0
      ? 0
      : Math.round(
          (listings.reduce((s, l) => s + l.confidence, 0) / listings.length) * 100,
        ) / 100

  return { summary, findings, confidence }
}

export async function runPipeline(options: {
  listings: FixtureListing[]
  request?: RunRequest
  runId?: RunId
  llm?: LlmPort
}): Promise<{ response: RunResponse; summaries: ListingSummary[] }> {
  const runId = options.runId ?? newTraceId()
  const logPath = `logs/${runId}.jsonl`
  await mkdir(dirname(logPath), { recursive: true })
  // Fresh file for this run
  await Bun.write(logPath, '')

  const tracer = new Tracer(runId, logPath)
  const llm = options.llm ?? resolveLlm()

  const working = options.listings.map(prepareWorkingListing)
  const agents_used: AgentRole[] = []
  let revision_count = 0
  const evaluator_findings: string[] = []
  let feedback_loop_completed = false
  let step = 1

  for (const listing of working) {
    const result = await runListingAgents(listing, runId, tracer, llm, step)
    step += result.steps
    for (const role of result.agents_used) {
      if (!agents_used.includes(role)) agents_used.push(role)
    }
    // Preserve encounter order of roles across listings: first listing defines order
    revision_count += result.revision_count
    evaluator_findings.push(...result.evaluator_findings)
    if (result.feedback_loop_completed) feedback_loop_completed = true
  }

  // agents_used in pipeline order (roles that actually ran)
  const orderedUsed = AGENT_ORDER.filter((r) => agents_used.includes(r))

  const { summary, findings, confidence } = summarizeFindings(working)

  const response: RunResponse = {
    request_id: options.request?.request_id ?? runId,
    trace_id: runId,
    status: 'success',
    agents_used: orderedUsed,
    result: { summary, findings, confidence },
    collaboration: {
      feedback_loop_completed,
      revision_count,
      evaluator_findings,
    },
    log_path: logPath,
  }

  const summaries: ListingSummary[] = working.map((l) => ({
    listingId: l.listingId,
    decision: l.decision,
    confidence: l.confidence,
    expectedPath: l.expectedPath,
    citations: l.citations,
  }))

  return { response, summaries }
}

export async function runRequest(request: RunRequest): Promise<RunResponse> {
  const all = await loadFixtures()
  const paths = selectPathsForQuery(request.user_query)
  const listings =
    paths === 'all' ? all : all.filter((l) => paths.includes(l.expectedPath))
  const selected = listings.length > 0 ? listings : all
  const { response } = await runPipeline({ listings: selected, request })
  return response
}

export async function runFixtures(): Promise<{
  response: RunResponse
  summaries: ListingSummary[]
}> {
  const listings = await loadFixtures()
  return runPipeline({
    listings,
    request: {
      request_id: 'fixtures-run',
      user_query: 'Reconcile all fixture listings',
    },
  })
}

/** Map input_examples/example_N.json → output_examples/example_N.json */
export function outputPathForInput(inputPath: string): string {
  const name = basename(inputPath)
  return `output_examples/${name}`
}

export async function writeCapturedOutput(
  inputPath: string,
  response: RunResponse,
): Promise<string> {
  const out = outputPathForInput(inputPath)
  await mkdir(dirname(out), { recursive: true })
  await Bun.write(out, `${JSON.stringify(response, null, 2)}\n`)
  return out
}
