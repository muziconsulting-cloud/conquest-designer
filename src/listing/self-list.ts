/**
 * The self-listing path — the agent lists itself.
 *
 * A human registers once and pays once. The payment buys a listing token. The agent
 * then spends that token to list **itself**: it declares its own price, and the
 * evidence pipeline decides whether that price stands.
 *
 * **The agent does not get a shortcut.** The listing a self-listing agent produces is
 * an ordinary `Listing`, with `declaredBy: 'agent'`, and it goes through the same
 * planner, the same reconciler, the same critic and the same closer as any other
 * listing. The critic does not know who declared the price, and it does not care: the
 * declared price is a claim, and a claim the independent evidence contradicts is
 * held, whoever made it.
 *
 * The evidence for a self-listing comes from the same federated layer as every other
 * listing — the agent gathers the observations the independent sources hold about it,
 * over the Zetaris protocol, and its own declaration joins them as the claim.
 */

import type { Evidence, Listing, ListingStatus } from '../types.ts'
import { loadSourceRegistry, toEvidence } from '../loading.ts'
import type { FlatObservation } from '../loading.ts'
import { pullCandidates } from '../zetaris/pull.ts'
import type { PullMode, PullResult } from '../zetaris/pull.ts'
import { createEngineSession } from '../engines/session.ts'
import { runListing } from '../orchestrator/loops.ts'
import { resolveRunLlm } from '../orchestrator/index.ts'
import { createTraceSink } from '../orchestrator/trace.ts'
import type { TraceSink } from '../orchestrator/trace.ts'
import { listingIdFor } from './token.ts'
import type { ListingTokenBook } from './token.ts'
import type { ListingRegistry } from './register.ts'

export interface SelfListInput {
  registry: ListingRegistry
  tokens: ListingTokenBook
  registrationId: string
  /** The listing token's secret. The id is not enough. */
  secret: string
  /** The agent's own price. Whole rands. */
  declaredPriceZar: number
  /** The term the price buys. Whole months. */
  termMonths: number
  trace?: TraceSink
  now?: () => string
  /** Injectable, so a caller can reuse a pull it already made. */
  pull?: PullResult
}

export interface SelfListResult {
  ok: boolean
  /** Why the listing was refused, or how it ended. */
  reason: string
  tokenId: string | null
  listingId: string | null
  decision: 'accept' | 'revise' | 'hold' | 'fallback' | null
  status: ListingStatus | null
  declaredPriceZar: number | null
  reconciledPriceZar: number | null
  listingCopy: string
  contentId: string | null
  /** The independent sources that answered. */
  sources: string[]
  tracePath: string | null
  pull: { mode: PullMode; requests: number } | null
}

const refuse = (reason: string): SelfListResult => ({
  ok: false,
  reason,
  tokenId: null,
  listingId: null,
  decision: null,
  status: null,
  declaredPriceZar: null,
  reconciledPriceZar: null,
  listingCopy: '',
  contentId: null,
  sources: [],
  tracePath: null,
  pull: null,
})

/**
 * The agent's own evidence.
 *
 * The independent observations the federated layer holds about this agent, plus the
 * agent's own declaration as the claim. The declaration is never evidence: it goes
 * in as the owner's source, which the reconciler refuses to resolve with.
 */
function collectEvidence(input: {
  agentId: string
  declaredPriceZar: number
  termMonths: number
  pull: PullResult
  ownerSourceId: string
  listingId: string
  at: string
}): Evidence[] {
  const source = input.pull.listings.find((listing) => listing.agent.agentId === input.agentId)

  const independent: FlatObservation[] = (source?.evidence ?? [])
    .filter((evidence) => evidence.source !== input.ownerSourceId)
    .map((evidence) => ({
      source: evidence.source,
      field: evidence.field,
      value: evidence.value,
      observedAt: evidence.observedAt,
      confidence: evidence.provenance.confidence,
    }))

  const claim: FlatObservation[] = [
    {
      source: input.ownerSourceId,
      field: 'priceZar',
      value: String(input.declaredPriceZar),
      observedAt: input.at,
      confidence: 1,
    },
    {
      source: input.ownerSourceId,
      field: 'termMonths',
      value: String(input.termMonths),
      observedAt: input.at,
      confidence: 1,
    },
  ]

  // The same mapper the file loader uses, so the observation ids, the memory ids and
  // the content ids are derived the same way everywhere.
  return [...independent, ...claim].map((flat, index) =>
    toEvidence(input.listingId, index, flat),
  )
}

/**
 * The agent lists itself.
 *
 * The order matters and it is the whole point:
 *
 *   1. the declaration is checked (a malformed price never reaches the pipeline);
 *   2. the token is redeemed, and redemption is the single-use gate;
 *   3. the agent's evidence is gathered over the federated layer;
 *   4. the listing runs through the ordinary pipeline, which may hold it.
 */
export async function selfList(input: SelfListInput): Promise<SelfListResult> {
  const now = input.now ?? (() => new Date().toISOString())

  const registration = input.registry.get(input.registrationId)
  if (!registration) {
    return refuse('the registration is not known to the exchange')
  }
  if (registration.status !== 'paid') {
    return refuse('the listing fee has not been paid — a listing token buys the right to list')
  }

  if (!Number.isInteger(input.declaredPriceZar) || input.declaredPriceZar <= 0) {
    return refuse('the declared price is a whole rand, greater than zero')
  }
  if (!Number.isInteger(input.termMonths) || input.termMonths <= 0) {
    return refuse('the declared term is a whole number of months, greater than zero')
  }

  // The single-use gate. The token is spent before the pipeline runs, so a second
  // listing needs a second payment.
  const redeemed = input.tokens.redeem({
    secret: input.secret,
    agentId: registration.agent.agentId,
    at: now(),
  })
  if (!redeemed.ok) {
    return refuse(redeemed.reason)
  }

  const token = redeemed.token
  const listingId = listingIdFor(token)
  input.tokens.bindListing(token.tokenId, listingId)

  const pull = input.pull ?? (await pullCandidates())

  const registry = loadSourceRegistry()
  const ownerSourceId = registry.find((source) => source.kind === 'owner')?.id ?? 'owner-declaration'

  const evidence = collectEvidence({
    agentId: registration.agent.agentId,
    declaredPriceZar: input.declaredPriceZar,
    termMonths: input.termMonths,
    pull,
    ownerSourceId,
    listingId,
    at: now(),
  })

  const listing: Listing = {
    listingId,
    agent: registration.agent,
    declaredPriceZar: input.declaredPriceZar,
    termMonths: input.termMonths,
    declaredBy: 'agent',
    // The token id, never the secret. The id grants nothing on its own.
    listingToken: token.tokenId,
    evidence,
  }

  const trace = input.trace ?? createTraceSink()
  const llm = await resolveRunLlm()
  const session = createEngineSession({ now })

  const outcome = await runListing({
    listing,
    registry,
    llm: llm.port,
    llmHealth: llm.health,
    providerConfigured: llm.providerConfigured,
    trace,
    now,
    session,
  })

  return {
    ok: true,
    reason: outcome.reason,
    tokenId: token.tokenId,
    listingId,
    decision: outcome.decision,
    status: outcome.status,
    declaredPriceZar: outcome.declaredPriceZar,
    reconciledPriceZar: outcome.reconciledPriceZar,
    listingCopy: outcome.listingCopy,
    contentId: outcome.contentId,
    sources: outcome.sources,
    tracePath: trace.logPath,
    pull: { mode: pull.mode, requests: pull.requests },
  }
}
