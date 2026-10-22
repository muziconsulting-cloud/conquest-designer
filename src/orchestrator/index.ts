/**
 * The orchestrator — the public entry point of the swarm.
 *
 * One request in, one response out, one trace on disk. The response contract is the
 * one a judge calls: `POST /run`, with `request_id`, `trace_id`, `status`,
 * `agents_used`, `result`, `collaboration` and `log_path`.
 *
 * Nothing in here throws. A dependency that is down degrades the decision and the
 * run still finishes; the degradation is marked in the trace and in `status`.
 */

import type { AgentRole, ListingStatus } from '../types.ts'
import type { LlmHealth, LlmPort } from '../llm/port.ts'
import { resolveLlm, checkHealth, OfflineAdapter } from '../llm/index.ts'
import { loadSourceRegistry } from '../loading.ts'
import type { RunRequest } from '../loading.ts'
import { pullCandidates } from '../zetaris/pull.ts'
import { createEngineSession } from '../engines/session.ts'
import { runListing } from './loops.ts'
import type { ListingOutcome } from './loops.ts'
import { createTraceSink } from './trace.ts'
import type { TraceSink } from './trace.ts'

export interface Finding {
  listing_id: string
  decision: 'accept' | 'revise' | 'hold' | 'fallback'
  /** The canonical listing status the close produced. */
  status: ListingStatus
  sources: string[]
  confidence: number
  declared_price_zar: number
  reconciled_price_zar: number | null
  reason: string
  listing_copy: string
  content_id: string
  revision: { field: string; from: string; to: string } | null
  fallback: boolean
  escalated: boolean
}

export interface RunResponse {
  request_id: string
  trace_id: string
  status: 'success' | 'degraded' | 'error'
  agents_used: AgentRole[]
  result: {
    summary: string
    findings: Finding[]
    confidence: number
  }
  collaboration: {
    feedback_loop_completed: boolean
    revision_count: number
    evaluator_findings: string[]
  }
  log_path: string
}

const names = (outcomes: ListingOutcome[]): string =>
  outcomes.map((outcome) => `${outcome.agentName} (${outcome.listingId})`).join(', ')

/** The answer, assembled from the decisions the swarm actually made. */
export function buildSummary(request: RunRequest, outcomes: ListingOutcome[]): string {
  if (outcomes.length === 0) {
    return `${request.user_query} — No listing was in scope for this request.`
  }

  const published = outcomes.filter((outcome) => outcome.status === 'published')
  const held = outcomes.filter((outcome) => outcome.status === 'held')
  const revised = outcomes.filter((outcome) => outcome.decision === 'revise')
  const degraded = outcomes.filter((outcome) => outcome.fallback)

  const parts: string[] = []

  if (published.length > 0) {
    parts.push(`${published.length} published: ${names(published)}.`)
  }
  if (revised.length > 0) {
    parts.push(
      `${revised.length} of those was challenged by the critic and revised before it was published.`,
    )
  }
  if (held.length > 0) {
    const reasons = held.map((outcome) => outcome.reason).join(' ')
    parts.push(`${held.length} held: ${names(held)}. ${reasons}`)
  }
  if (degraded.length > 0) {
    parts.push(
      `${degraded.length} was closed on degraded evidence, because a source did not answer.`,
    )
  }

  return `${request.user_query} — ${parts.join(' ')}`.trim()
}

const toFinding = (outcome: ListingOutcome): Finding => ({
  listing_id: outcome.listingId,
  decision: outcome.decision,
  status: outcome.status,
  sources: outcome.sources,
  confidence: outcome.confidence,
  declared_price_zar: outcome.declaredPriceZar,
  reconciled_price_zar: outcome.reconciledPriceZar,
  reason: outcome.reason,
  listing_copy: outcome.listingCopy,
  content_id: outcome.contentId,
  revision: outcome.revision,
  fallback: outcome.fallback,
  escalated: outcome.escalated,
})

export interface RunOptions {
  request: RunRequest
  trace?: TraceSink
  llm?: LlmPort
}

/**
 * The model route for a run — one rail, two callers.
 *
 * The orchestrator and the self-listing path both need to know which adapter speaks
 * for the run, whether the provider answered, and what to say about it in the trace.
 * That decision lives here, once, so both paths report it the same way.
 */
export interface RunLlm {
  port: LlmPort
  health: LlmHealth
  providerConfigured: boolean
  /** Which rule picked the adapter. Written into the trace. */
  source: 'sample-mode' | 'provider' | 'runtime' | 'offline'
  /** The sentence the trace carries. */
  reason: string
}

export async function resolveRunLlm(port?: LlmPort): Promise<RunLlm> {
  const resolved = resolveLlm()
  let selected = port ?? resolved.port
  const providerConfigured = resolved.source === 'provider' || resolved.source === 'runtime'

  const health = await checkHealth(selected)
  let reason = resolved.reason

  // A provider that was configured and then failed must not end the run. The
  // deterministic renderer answers instead, and the degradation is marked.
  if (providerConfigured && health.state !== 'online') {
    selected = new OfflineAdapter()
    reason = `${resolved.reason}, but the provider reported ${health.state} — the deterministic renderer answered instead.`
  }

  return { port: selected, health, providerConfigured, source: resolved.source, reason }
}

export async function runExchange(options: RunOptions): Promise<RunResponse> {
  const { request } = options

  const llmRun = await resolveRunLlm(options.llm)
  const port = llmRun.port
  const providerConfigured = llmRun.providerConfigured
  const health = llmRun.health
  const llmReason = llmRun.reason

  const registry = loadSourceRegistry()

  const trace = options.trace ?? createTraceSink()

  // The candidate listings come out of the federated layer over the published
  // Zetaris REST contract. If that pull does not answer, the file loader answers
  // and the run is marked degraded — it never dies on a dependency.
  const pull = await pullCandidates()
  trace.write(
    'volume-planner',
    {
      action: 'query_source',
      outcome: pull.mode === 'file' ? 'fallback' : 'ok',
      input_summary: 'Pull the candidate listings and their observations over the Zetaris protocol.',
      output_summary:
        `${pull.listings.length} listing(s) pulled over ${pull.requests} request(s) in ${pull.mode} mode. ` +
        pull.reason,
      target_agent: null,
      confidence: null,
    },
    {
      mode: pull.mode,
      requests: pull.requests,
      listings: pull.listings.length,
      protocol: 'zetaris-sql/v1.0',
    },
  )

  const listings = pull.listings

  const scope = request.context?.listingIds
  const selected =
    scope && scope.length > 0
      ? listings.filter((listing) => scope.includes(listing.listingId))
      : listings

  const now = () => new Date().toISOString()

  // One engine session per run: the memory engine, the canonical log and the
  // long-run engine that the roles work through.
  const session = createEngineSession({ now })

  const outcomes: ListingOutcome[] = []
  for (const listing of selected) {
    try {
      outcomes.push(
        await runListing({
          listing,
          registry,
          llm: port,
          llmHealth: health,
          providerConfigured,
          trace,
          now,
          session,
        }),
      )
    } catch (error) {
      // No step may abort the run. The failure becomes a trace line, and the run
      // continues with the next listing.
      trace.write(
        'telemetry-auditor',
        {
          action: 'audit_telemetry',
          outcome: 'error',
          input_summary: `${listing.listingId} could not be closed.`,
          output_summary: error instanceof Error ? error.message : 'unknown failure',
          target_agent: null,
          confidence: null,
        },
        { listingId: listing.listingId, error: String(error) },
      )
    }
  }

  const critiques = outcomes.filter(
    (outcome) => outcome.critique !== null && outcome.critique.verdict !== 'accept',
  )
  // A degraded run is also an evaluator finding: the auditor reports that the
  // listing was closed on the evidence that answered. It is a finding, not a
  // critique — it changed no decision, so it does not make the feedback loop true.
  const degradedFindings = outcomes
    .filter((outcome) => outcome.fallback)
    .map(
      (outcome) =>
        `Published on degraded evidence: ${outcome.listingId} was closed on the source(s) that answered, ` +
        `without the source(s) that did not.`,
    )

  const findings = outcomes.map(toFinding)
  const confidence =
    findings.length === 0
      ? 0
      : Math.round(
          (findings.reduce((total, finding) => total + finding.confidence, 0) / findings.length) *
            100,
        ) / 100

  const degraded = outcomes.some((outcome) => outcome.fallback) || pull.mode === 'file'

  // The route the model seam took this run — recorded in the trace, not in the
  // response contract.
  const memoryCount = session.index.size
  const auditCount = session.world.audit().length
  const eventCount = session.world.events().length

  trace.write(
    'telemetry-auditor',
    {
      action: 'audit_telemetry',
      outcome: degraded ? 'fallback' : 'ok',
      input_summary: 'Run finished.',
      output_summary:
        `The model route was: ${llmReason} ` +
        `The federated pull was: ${pull.mode} mode, ${pull.requests} request(s) over the Zetaris protocol. ` +
        `The engines recorded ${memoryCount} memor${memoryCount === 1 ? 'y' : 'ies'}, ` +
        `${eventCount} canonical event(s) and ${auditCount} audit entr${auditCount === 1 ? 'y' : 'ies'}.`,
      target_agent: null,
      confidence,
    },
    {
      llm: llmRun.source,
      health: health.state,
      reason: llmReason,
      zetaris: { mode: pull.mode, requests: pull.requests, protocol: 'zetaris-sql/v1.0' },
      engine: {
        hmem: { memories: memoryCount },
        worldModel: { events: eventCount, auditEntries: auditCount },
        markovian: { runs: outcomes.length },
      },
    },
  )

  return {
    request_id: request.request_id,
    trace_id: trace.runId,
    status: degraded ? 'degraded' : 'success',
    agents_used: trace.roles,
    result: {
      summary: buildSummary(request, outcomes),
      findings,
      confidence,
    },
    collaboration: {
      // True only when a critique actually changed the outcome of a listing. Every
      // challenge in this pipeline is answered — by a revision or by a hold — so a
      // challenge always changes the outcome, and an unchallenged run is false.
      feedback_loop_completed: critiques.length > 0,
      revision_count: critiques.length,
      evaluator_findings: [
        ...critiques.map((outcome) => outcome.critique?.reason ?? ''),
        ...degradedFindings,
      ],
    },
    log_path: trace.logPath,
  }
}
