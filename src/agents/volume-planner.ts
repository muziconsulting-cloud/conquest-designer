/**
 * The volume planner — which sources to pull, and in what order.
 *
 * It decides, per listing, which federated sources speak to the fields the listing
 * claims, and orders the pull by each source's base trust. A source that could not
 * answer is marked here, so the reconciler can degrade instead of the run dying.
 *
 * The expansion runs on the **Markovian** engine (Meterless). The buckets — one per
 * field per independent source — are produced in bounded chunks, and the engine's
 * carryover carries the plan forward, so a later chunk does not redo what an earlier
 * one planned. The engine's own accounting (tokens used, tokens saved) comes back with
 * the plan, labelled as an estimate, because that is what it is.
 *
 * It does not decide anything about the price. That is the reconciler's job, and the
 * critic's.
 */

import type { Listing } from '../types.ts'
import type { Plan, SourceDescriptor } from './contracts.ts'
import type { EngineSession } from '../engines/session.ts'
import type { MarkovianRun } from '../engines/markovian/markovian.ts'

export interface PlanInput {
  listing: Listing
  registry: SourceDescriptor[]
  session: EngineSession
}

export interface PlanResult {
  plan: Plan
  /** One line per source the pull touched. */
  queries: Array<{ source: string; fields: string[]; answered: boolean }>
  /** The engine run that expanded the plan. */
  engine: {
    runId: string
    chunks: number
    tokensUsed: number
    tokensSaved: number
    efficiencyPercent: number
    tokenLabel: 'measured' | 'estimated'
  }
}

/** How many buckets a chunk carries. The carryover keeps the rest. */
const BUCKETS_PER_CHUNK = 2

/**
 * The deterministic expander. It reads the carryover the engine hands it — the
 * COMPLETED line of the previous chunk's state block — and plans only what is left.
 */
function bucketExpander(buckets: string[]): (prompt: string) => Promise<{ text: string }> {
  return async (prompt: string): Promise<{ text: string }> => {
    const completed = parseCompleted(prompt)
    const remaining = buckets.filter((bucket) => !completed.includes(bucket))
    const slice = remaining.slice(0, BUCKETS_PER_CHUNK)
    const planned = [...completed, ...slice]
    const left = remaining.length - slice.length

    const state = [
      `COMPLETED: ${planned.join(', ')}`,
      `REMAINING: ${left}`,
      `DECISIONS: each bucket is checked against its independent source`,
      `CONTEXT: ${planned.length} of ${buckets.length} evidence buckets planned`,
    ].join('\n')

    const body = slice.map((bucket) => `bucket: ${bucket}`).join('\n')
    const text = left === 0 ? `${body}\n[TASK_COMPLETE]\n${state}` : `${body}\n[STATE_CHECKPOINT]\n${state}`
    return { text }
  }
}

/** The COMPLETED line of the carryover block, if the prompt carries one. */
function parseCompleted(prompt: string): string[] {
  const line = prompt
    .split('\n')
    .find((candidate) => candidate.startsWith('COMPLETED:'))
    ?.trim()
  if (!line) return []
  const value = line.slice('COMPLETED:'.length).trim()
  if (value === '') return []
  return value.split(',').map((entry) => entry.trim()).filter((entry) => entry !== '')
}

export async function planSources({ listing, registry, session }: PlanInput): Promise<PlanResult> {
  const referenced = new Set(listing.evidence.map((evidence) => evidence.source))

  const sources = registry
    .filter((source) => referenced.has(source.id))
    .map((source) => {
      // A source that answered with nothing is a source that did not answer: the
      // sample data carries an unavailable observation as an empty value at zero
      // confidence, and the planner is where that becomes visible.
      const observations = listing.evidence.filter((evidence) => evidence.source === source.id)
      const silent =
        observations.length > 0 &&
        observations.every(
          (evidence) => evidence.value === '' && evidence.provenance.confidence === 0,
        )
      return { ...source, available: source.available && !silent }
    })
    .sort((a, b) => b.trust - a.trust || a.id.localeCompare(b.id))

  // The owner's declaration is the claim, not a source to pull: it is already in
  // the listing. Only the independent sources are queried.
  const independent = sources.filter((source) => source.kind !== 'owner')
  const unavailable = independent
    .filter((source) => !source.available)
    .map((source) => source.id)
  const answered = independent
    .filter((source) => source.available)
    .map((source) => source.id)

  const fields = [...new Set(listing.evidence.map((evidence) => evidence.field))].sort()

  const queries = independent.map((source) => ({
    source: source.id,
    fields: [
      ...new Set(
        listing.evidence
          .filter((evidence) => evidence.source === source.id)
          .map((evidence) => evidence.field),
      ),
    ].sort(),
    answered: source.available,
  }))

  // ---- the expansion, on the Markovian engine --------------------------------
  const buckets: string[] = []
  for (const query of queries) {
    if (!query.answered) continue
    for (const field of query.fields) buckets.push(`${field}@${query.source}`)
  }

  let run: MarkovianRun | undefined
  if (buckets.length > 0) {
    run = await session.markovian.run({
      goal: `Expand ${listing.listingId} into the evidence buckets that must be checked.`,
      generator: bucketExpander(buckets),
      mode: 'architect',
      reflect: false,
    })
  }

  // The buckets are read back out of the engine's own output — the plan is what the
  // engine produced, not what the caller hoped for.
  const planned: string[] = []
  for (const chunk of run?.chunks ?? []) {
    for (const line of chunk.content.split('\n')) {
      const match = /^bucket:\s*(.+)$/.exec(line.trim())
      if (match?.[1]) planned.push(match[1].trim())
    }
  }

  return {
    plan: { sources, fields, unavailable, answered, buckets: planned },
    queries,
    engine: {
      runId: run?.id ?? '',
      chunks: run?.chunks.length ?? 0,
      tokensUsed: run?.totalTokensUsed ?? 0,
      tokensSaved: run?.totalTokensSaved ?? 0,
      efficiencyPercent: run?.efficiencyPercent ?? 0,
      tokenLabel: run?.tokenLabel ?? 'estimated',
    },
  }
}
