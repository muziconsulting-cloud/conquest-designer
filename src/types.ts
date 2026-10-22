/**
 * Shared contracts for the Conquest exchange swarm.
 *
 * TYPES ONLY — no logic. This is the shared vocabulary every agent, engine and
 * adapter speaks, so the five roles cannot drift apart.
 *
 * Contract facts of record (see `BUILD-PROMPTS.md` §8):
 *  - We are an exchange, not a valuer. The owner declares the price; we record it.
 *  - The certificate is the product. We never issue a token.
 *  - Whole rand only. No cent denominations anywhere a user or funding touches.
 *  - The swarm's job is LISTINGS ONLY.
 */

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

export type ListingId = string
export type TradeId = string
export type CertificateId = string
export type ObservationId = string
export type MemoryId = string
export type ContentId = string
export type RunId = string
export type AgentId = string

// ---------------------------------------------------------------------------
// Identity — the "who" of the certificate
// ---------------------------------------------------------------------------

/**
 * A standardized agentic identity living in an Ethereum wallet. We never mint an
 * identity here; we reference one that already exists.
 */
export interface AgentIdentity {
  agentId: AgentId
  /** Hash of the agent's key — safe to publish in a certificate. */
  agentKeyHash: string
  /** EVM address the settlement legs to. */
  walletAddress: string
  displayName: string
}

// ---------------------------------------------------------------------------
// Evidence — the fragmented inputs the swarm reconciles
// ---------------------------------------------------------------------------

/**
 * One observation from one source. Sources disagree on purpose; that is the
 * fragmentation this whole system exists to reconcile.
 */
export interface Evidence {
  observationId: ObservationId
  /** Which source produced this observation (a Zetaris federated query, a log, ...). */
  source: string
  /** The field this observation speaks to. */
  field: string
  value: string
  observedAt: string
  provenance: {
    /** Memory ids this observation was recalled from. A recall must cite them. */
    memoryIds: MemoryId[]
    contentId?: ContentId
    confidence: number
  }
}

// ---------------------------------------------------------------------------
// Listing — what the owner declares
// ---------------------------------------------------------------------------

export interface Listing {
  listingId: ListingId
  agent: AgentIdentity
  /** The owner's declared price. Whole rand. We record it; we do not argue it. */
  declaredPriceZar: number
  /** The term the declared price buys. */
  termMonths: number
  /** `human` pays to list; `agent` self-lists using the listing token it was handed. */
  declaredBy: 'human' | 'agent'
  /** The right to publish itself, handed over by the protocol after payment. */
  listingToken?: string
  /** The disagreeing observations attached to this listing. */
  evidence: Evidence[]
}

// ---------------------------------------------------------------------------
// Critique — what the Fidelity & Conflict Critic concludes
// ---------------------------------------------------------------------------

export interface Conflict {
  field: string
  positions: { source: string; value: string; trust: number }[]
  /** Why this position won. A resolution without a reason is not a resolution. */
  resolution: { winner: string; why: string }
}

export interface Critique {
  verdict: 'accept' | 'revise' | 'hold'
  reason: string
  conflicts: Conflict[]
  /** Memory ids that supported the verdict. */
  supportingMemoryIds: MemoryId[]
}

// ---------------------------------------------------------------------------
// ListingRecord — the canonical record (World Model output)
// ---------------------------------------------------------------------------

export type ListingStatus = 'draft' | 'published' | 'held' | 'sold' | 'transferred'

export interface ListingRecord {
  listingId: ListingId
  agent: AgentIdentity
  declaredPriceZar: number
  /** What the reconciled evidence supports. `null` when it supports nothing. */
  reconciledPriceZar: number | null
  status: ListingStatus
  /** Field -> the source that won that field. Per-field provenance, always. */
  provenance: Record<string, string>
  /** Stable, content-addressable id. */
  contentId: ContentId
  recordedAt: string
}

// ---------------------------------------------------------------------------
// Audit — one trace entry per agent step
// ---------------------------------------------------------------------------

export type AgentRole =
  | 'volume-planner'
  | 'evidence-reconciler'
  | 'listing-closer'
  | 'conflict-critic'
  | 'telemetry-auditor'

export interface AuditRecord {
  runId: RunId
  role: AgentRole
  step: number
  outcome: 'ok' | 'escalated' | 'fallback' | 'error'
  detail: Record<string, unknown>
  at: string
}

// ---------------------------------------------------------------------------
// The certificate — exactly three facts, never more
// ---------------------------------------------------------------------------

/** A public-key-verifiable proof of holding, verified against a JWKS endpoint. */
export interface HoldingProof {
  alg: string
  kid: string
  /** base64url signature over the canonicalized payload. */
  value: string
  /** JWKS URL a third party uses to verify offline. */
  verify: string
  /** The exact fields signed. */
  payload: Record<string, unknown>
}

export interface Avc {
  certificateId: CertificateId
  /** WHO — the agent, as an agentic identity in an Ethereum wallet. */
  who: AgentIdentity
  /** WHAT WAS PAID — the value the owner declared and paid. */
  whatWasPaid: {
    amountZar: number
    currency: 'ZAR'
    /** Always true: the certificate attests a value the owner declared, not one we computed. */
    declaredByOwner: boolean
    paidAt: string
    method: 'x402' | 'escrow'
  }
  /** WHAT IT BOUGHT — the access term, for that term. */
  whatItBought: {
    listingId: ListingId
    termMonths: number
    accessGrantedAt: string
  }
  issuedAt: string
  proof?: HoldingProof
}

// ---------------------------------------------------------------------------
// Escrow bridge — the pre-existing product's states (API, not a rebuild)
// ---------------------------------------------------------------------------

export type EscrowState = 'pending' | 'suspense' | 'claimed' | 'settled' | 'cancelled'

/**
 * The settle transition is the hook: it transfers listing ownership and issues
 * the AVC. It is NOT a cash-out. The value moves as a transfer of the listing.
 */
export interface SettlementEvent {
  tradeId: TradeId
  listingId: ListingId
  state: EscrowState
  amountZar: number
  at: string
}
