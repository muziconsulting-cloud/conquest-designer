/**
 * The surface's data layer — the pipeline's own output, read back.
 *
 * Every number on a page comes from here, and here reads only two things:
 *
 *  - the JSONL traces the swarm wrote (`logs/<runId>.jsonl`), and
 *  - the in-process escrow and certificate store the settlement path filled.
 *
 * **Nothing is recomputed.** The surface does not decide what a listing is worth, does
 * not re-derive a price, and does not keep its own tally. Where a listing was
 * published, held or revised, the page says what the pipeline said, and shows the
 * line that said it. If a number is not in the pipeline's output, the page does not
 * show it — it shows an em dash.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../loading.ts'
import { certificates, escrow } from '../settlement/index.ts'
import type { AgentIdentity, AgentRole } from '../types.ts'

/** One line of a JSONL trace, as the tracer wrote it. */
export interface TraceLine {
  runId: string
  role: AgentRole
  step: number
  outcome: string
  detail: Record<string, unknown>
  at: string
  action: string
  input_summary: string
  output_summary: string
  target_agent: AgentRole | null
  confidence: number | null
  status: string
}

/** One run, as the surface sees it. */
export interface RunView {
  runId: string
  /** The path the trace was written to, relative to the repo root. */
  tracePath: string
  lines: number
  /** The listings this run closed. */
  listingIds: string[]
  startedAt: string
  endedAt: string
  /** The run-level outcomes, in order — `ok`, `escalated`, `fallback`. */
  outcomes: string[]
}

/** The listing, as the pipeline left it. */
export interface ListingView {
  listingId: string
  /** The run that last closed it. */
  runId: string
  tracePath: string
  at: string
  agent: AgentIdentity | null
  declaredPriceZar: number | null
  reconciledPriceZar: number | null
  termMonths: number | null
  declaredBy: string | null
  decision: string | null
  status: string | null
  contentId: string | null
  confidence: number | null
  /** The pipeline's own words for the listing. */
  listingCopy: string
  /** What the critic objected to. */
  critique: {
    verdict: string
    reason: string
    conflicts: unknown[]
    supportingMemoryIds: string[]
  } | null
  /** The reconciler's answer to the critique. */
  revision: { answers: unknown } | null
  /** What the evidence said, and where it came from. */
  evidence: {
    fields: string[]
    sources: string[]
    buckets: string[]
    values: Record<string, string>
    provenance: Record<string, string>
    corroborated: Record<string, string[]>
    conflicts: unknown[]
  } | null
  /** The memory ids the evidence cites. */
  memoryIds: string[]
  /** Why the close was degraded, if it was. */
  fallbackReasons: string[]
  /** Whether the auditor escalated it, and what it said. */
  escalated: boolean
  escalation: string
  /** The trace lines of this listing, in order — the proof. */
  lines: TraceLine[]
}

/** One agent, and what it did. */
export interface AgentView {
  role: AgentRole
  /** The role's job, in one line. */
  duty: string
  steps: number
  runs: string[]
  actions: string[]
  outcomes: string[]
  /** The last thing it said. */
  lastOutput: string
  /** The agent it handed off to, when it handed off. */
  handoff: AgentRole | null
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '')

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const strArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}

const strRecord = (value: unknown): Record<string, string> => {
  const source = record(value)
  const out: Record<string, string> = {}
  for (const [key, entry] of Object.entries(source)) {
    if (typeof entry === 'string') out[key] = entry
  }
  return out
}

const strRecordOfLists = (value: unknown): Record<string, string[]> => {
  const source = record(value)
  const out: Record<string, string[]> = {}
  for (const [key, entry] of Object.entries(source)) {
    if (Array.isArray(entry)) out[key] = strArray(entry)
  }
  return out
}

const agentOf = (value: unknown): AgentIdentity | null => {
  const source = record(value)
  const agentId = str(source.agentId)
  if (agentId === '') return null
  return {
    agentId,
    agentKeyHash: str(source.agentKeyHash),
    walletAddress: str(source.walletAddress),
    displayName: str(source.displayName),
  }
}

// ---------------------------------------------------------------------------
// Reading the traces
// ---------------------------------------------------------------------------

/** The logs directory the tracer writes to. */
const LOG_DIR = join(ROOT, 'logs')

/** Every trace line on disk, newest run last. A malformed line is skipped, not fatal. */
export function readTraceLines(): TraceLine[] {
  let names: string[] = []
  try {
    names = readdirSync(LOG_DIR).filter((name) => name.endsWith('.jsonl')).sort()
  } catch {
    return []
  }

  const lines: TraceLine[] = []
  for (const name of names) {
    let text = ''
    try {
      text = readFileSync(join(LOG_DIR, name), 'utf8')
    } catch {
      continue
    }
    for (const raw of text.split('\n')) {
      if (raw.trim() === '') continue
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        continue
      }
      const entry = record(parsed)
      lines.push({
        runId: str(entry.runId) || name.replace(/\.jsonl$/, ''),
        role: str(entry.role) as AgentRole,
        step: num(entry.step) ?? 0,
        outcome: str(entry.outcome),
        detail: record(entry.detail),
        at: str(entry.at),
        action: str(entry.action),
        input_summary: str(entry.input_summary),
        output_summary: str(entry.output_summary),
        target_agent: (str(entry.target_agent) || null) as AgentRole | null,
        confidence: num(entry.confidence),
        status: str(entry.status),
      })
    }
  }
  return lines
}

/** The runs on disk, in the order they were written. */
export function listRuns(): RunView[] {
  const byRun = new Map<string, TraceLine[]>()
  for (const line of readTraceLines()) {
    const bucket = byRun.get(line.runId)
    if (bucket) bucket.push(line)
    else byRun.set(line.runId, [line])
  }

  const runs: RunView[] = []
  for (const [runId, lines] of byRun) {
    const listingIds: string[] = []
    for (const line of lines) {
      const listingId = str(line.detail.listingId)
      if (listingId !== '' && !listingIds.includes(listingId)) listingIds.push(listingId)
    }
    runs.push({
      runId,
      tracePath: `logs/${runId}.jsonl`,
      lines: lines.length,
      listingIds,
      startedAt: lines[0]?.at ?? '',
      endedAt: lines[lines.length - 1]?.at ?? '',
      outcomes: lines.map((line) => line.outcome),
    })
  }
  return runs
}

/** One run's lines, in order. */
export function readRun(runId: string): TraceLine[] {
  return readTraceLines().filter((line) => line.runId === runId)
}

// ---------------------------------------------------------------------------
// The listings, assembled from the lines that closed them
// ---------------------------------------------------------------------------

const assemble = (runId: string, lines: TraceLine[]): ListingView => {
  const listingId = str(lines[0]?.detail.listingId ?? '')

  /** The line that carries an action — the one whose words the page shows. */
  const lineOf = (action: string, phase?: string): TraceLine | undefined =>
    lines.find(
      (line) =>
        line.action === action && (phase === undefined || str(line.detail.phase) === phase),
    )
  const detailOf = (action: string, phase?: string): Record<string, unknown> =>
    lineOf(action, phase)?.detail ?? {}

  const plan = detailOf('plan_sources')
  const reconcile = detailOf('reconcile')
  const critiqueLine = lines.find((line) => line.action === 'critique')
  const critiqueDetail = critiqueLine?.detail ?? {}
  const draftLine = lineOf('close_listing', 'draft')
  const closeLine = lineOf('close_listing', 'close')
  const close = closeLine?.detail ?? {}
  const draft = draftLine?.detail ?? {}
  const reviseLine = lines.find((line) => line.action === 'revise')
  const auditLine = lines.find(
    (line) => line.action === 'audit_telemetry' && str(line.detail.listingId) === listingId,
  )
  const auditDetail = auditLine?.detail ?? {}

  const memoryIds: string[] = []
  for (const id of [
    ...strArray(reconcile.memoryIds),
    ...strArray(critiqueDetail.supportingMemoryIds),
  ]) {
    if (!memoryIds.includes(id)) memoryIds.push(id)
  }

  return {
    listingId,
    runId,
    tracePath: `logs/${runId}.jsonl`,
    at: closeLine ? closeLine.at : '',
    agent: agentOf(plan.agent) ?? agentOf(draft.agent) ?? agentOf(close.agent),
    declaredPriceZar:
      num(plan.declaredPriceZar) ?? num(draft.declaredPriceZar) ?? num(close.declaredPriceZar),
    reconciledPriceZar: num(close.reconciledPriceZar),
    termMonths: num(plan.termMonths) ?? num(draft.termMonths) ?? num(close.termMonths),
    declaredBy: str(plan.declaredBy) || str(draft.declaredBy) || str(close.declaredBy) || null,
    decision: str(close.decision) || str(critiqueDetail.verdict) || null,
    status: str(close.status) || null,
    contentId: str(close.contentId) || str(draft.contentId) || null,
    confidence: lines.find((line) => line.confidence !== null)?.confidence ?? null,
    listingCopy: closeLine ? closeLine.output_summary : draftLine ? draftLine.output_summary : '',
    critique: critiqueLine
      ? {
          verdict: str(critiqueDetail.verdict),
          reason: critiqueLine.output_summary,
          conflicts: Array.isArray(critiqueDetail.conflicts) ? critiqueDetail.conflicts : [],
          supportingMemoryIds: strArray(critiqueDetail.supportingMemoryIds),
        }
      : null,
    revision: reviseLine ? { answers: reviseLine.detail.answers } : null,
    evidence: {
      fields: strArray(plan.fields),
      sources: strArray(plan.sources),
      buckets: strArray(plan.buckets),
      values: strRecord(reconcile.values),
      provenance: strRecord(reconcile.provenance),
      corroborated: strRecordOfLists(reconcile.corroborated),
      conflicts: Array.isArray(reconcile.conflicts) ? reconcile.conflicts : [],
    },
    memoryIds,
    fallbackReasons: strArray(close.fallbackReasons),
    escalated: auditDetail.escalated === true,
    escalation: str(auditDetail.escalation),
    lines,
  }
}

/**
 * Every listing the pipeline has closed — one entry per listing, taken from the run
 * that closed it last. A listing closed by three runs is one listing, not three.
 */
export function listListings(): ListingView[] {
  const byRun = new Map<string, TraceLine[]>()
  for (const line of readTraceLines()) {
    if (str(line.detail.listingId) === '') continue
    const bucket = byRun.get(line.runId)
    if (bucket) bucket.push(line)
    else byRun.set(line.runId, [line])
  }

  const latest = new Map<string, ListingView>()
  for (const [runId, lines] of byRun) {
    const listingIds: string[] = []
    for (const line of lines) {
      const listingId = str(line.detail.listingId)
      if (listingId !== '' && !listingIds.includes(listingId)) listingIds.push(listingId)
    }
    for (const listingId of listingIds) {
      const own = lines.filter((line) => str(line.detail.listingId) === listingId)
      const view = assemble(runId, own)
      const seen = latest.get(listingId)
      if (!seen || view.at > seen.at) latest.set(listingId, view)
    }
  }

  return [...latest.values()].sort((a, b) => a.listingId.localeCompare(b.listingId))
}

/** One listing, in full — including the lines that closed it. */
export function getListing(listingId: string): ListingView | null {
  return listListings().find((listing) => listing.listingId === listingId) ?? null
}

// ---------------------------------------------------------------------------
// The agents
// ---------------------------------------------------------------------------

const DUTIES: Record<AgentRole, string> = {
  'volume-planner': 'decides which sources to pull, and from which field',
  'evidence-reconciler': 'reconciles what the sources said into one value, per field',
  'listing-closer': 'drafts and closes the listing on the reconciled evidence',
  'conflict-critic': 'challenges the draft, and holds it when the evidence does not stand',
  'telemetry-auditor': 'audits the close, and escalates what it cannot account for',
}

/** The five agents, and what each one actually did. */
export function listAgents(): AgentView[] {
  const lines = readTraceLines()
  const roles: AgentRole[] = [
    'volume-planner',
    'evidence-reconciler',
    'listing-closer',
    'conflict-critic',
    'telemetry-auditor',
  ]

  return roles.map((role) => {
    const own = lines.filter((line) => line.role === role)
    const actions: string[] = []
    const outcomes: string[] = []
    const runs: string[] = []
    for (const line of own) {
      if (!actions.includes(line.action)) actions.push(line.action)
      if (!outcomes.includes(line.outcome)) outcomes.push(line.outcome)
      if (!runs.includes(line.runId)) runs.push(line.runId)
    }
    const last = own[own.length - 1]
    return {
      role,
      duty: DUTIES[role],
      steps: own.length,
      runs,
      actions,
      outcomes,
      lastOutput: last ? last.output_summary : '',
      handoff: last ? last.target_agent : null,
    }
  })
}

// ---------------------------------------------------------------------------
// The money — from the in-process escrow and certificate store
// ---------------------------------------------------------------------------

/** The trades this process settled, and the certificates it issued. */
export function listSettlements(): {
  trades: ReturnType<typeof escrow.list>
  settled: number
  certificates: string[]
} {
  const trades = escrow.list()
  const settled = trades.filter((trade) => trade.state === 'settled').length
  const issued = certificates.list().map((entry) => entry.avc.certificateId)
  return { trades, settled, certificates: issued }
}
