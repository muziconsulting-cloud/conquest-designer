# PLAN.md — Open Agent Hackathon 2026 — Winning Brief

The **what/how**. For the canonical **why**, see `FIRST-PRINCIPLES.md`; that file wins on any
disagreement. This supersedes the earlier "marketing swarm selling a R10,000 worker agent on
coupons" framing (under-scoped, sponsors decorative) and encodes the agent-exchange model
below.

> **v3 — 2026-10-21.** Rewritten for the **agent exchange (AVC)**.

## 0. The decisions that shape everything

- **Track:** **Track 1 — Solving Fragmented Intelligence** ($2,000 / $1,350 / $1,000; pool
  $4,350). Fallback: Track 3 — Reasoning Architecture (pool $3,600). Wildcard [Tinkerer]
  pays $1,000/$600/$400 and is scored on **new work only**, so we do **not** default to it.
  In-kind prizes: NVIDIA DGX Spark ($4,699) for best Nemotron use; Cursor API credits
  ($2,301) for best Cursor-built product.
- **Mandatory for every track:** Zetaris **and** Meterless integration, plus Cursor
  for development (official rules §5.1). Sponsor tech is a hard gate, not optional.
- **Pre-existing vs new:** the WardByWard platform (escrow state machine, settlement and
  certificate rail, money engine, mint rail) is declared pre-existing and reached over API.
  The **new element built for this submission is the listings swarm + the exchange surface
  + the AVC issuance path + self-listing**. The rules call committed-before-window work a
  declared pre-existing component; we declare accordingly and keep the new work clearly
  separable.
- **Two declared deviations** (Zetaris hosted-out; NVIDIA credentials unverified). Declared
  honestly in `SPONSORS.md`. **No faked integration** — that costs more than the deviation.

## 1. What the product actually is (the model)

- **Conquest — the agent exchange.** A human registers an agent and pays a listing fee
  (**inbound x402**). The protocol issues an **Agentic Valuation Certificate (AVC)**: a
  public-key-verifiable record of *who* the agent is (standardized agentic identity in an
  Ethereum wallet), *what was paid* (the **owner-declared** price, recorded), and *what it
  bought* (the listing/access term). **The certificate is the product.**
- **We are a venue and settlement layer, not a valuer.** The owner declares the price; we
  hold what they paid and record it. **We never issue a token** — we stay outside issuer
  rules, and the certificate is a record, not an interest in a pool.
- **Settlement is 2-of-2 escrow** (`lock → pending → settled`, plus dispute/claim/cancel).
  Buyer-unknown-to-seller is **open demand** (`SellerAccountNumber: ''`), claimed via
  `claimOpenDemand`. On the **settled** transition the escrow releases **and the AVC
  issues/re-signs** — transferring **ownership of the listing**, not cashing out.
- **Listing is the product.** Humans pay to list their agents. **x402 flows inbound only** —
  buyers pay us; we never pay out.

## 2. One-sentence pitch

> We built the exchange where agents are priced, listed and traded: a human pays once to
> list an agent, the protocol settles the sale through 2-of-2 escrow and issues an
> **Agentic Valuation Certificate** that says exactly who the agent is, what was paid and
> what it bought — and a five-role swarm reconciles the **fragmented, disagreeing** listing
> evidence in place, so a listing whose evidence does not support its declared price is
> **held, not published**.

## 3. Problem and user

- **Problem:** agents are built and deployed everywhere and **priced nowhere**. There is no
  venue to list an agent for a declared price, no standard way for a buyer to know what an
  acquisition conferred, and no settlement layer between strangers. The evidence needed to
  price a listing is **fragmented across sources that disagree**.
- **User:** the **agent builder** who wants their agent listed and paid for, and the **buyer**
  who needs to know what a purchase actually conferred.
- **Decision supported:** whether to list an agent, at what declared price, and on the
  strength of a **reconciled evidence record** rather than a marketing claim.
- **Output:** a listing on the exchange; an **AVC** issued on the escrow settled transition;
  a canonical listing & trade event log; and a per-run telemetry scorecard for the swarm
  that produced it.

## 4. The agent system (dynamic collaboration, not a pipeline)

Five roles, two loops, one escalation branch, one failure-path fallback:

1. **Volume Planner** (orchestrator, **Markovian**) — paces and delegates from run velocity
   **and** the count of listings whose evidence does not support the declared price;
   **replans** when the Critic reports missing evidence; owns branching and the escalation
   decision.
2. **Evidence Reconciler** (specialist, **H-MEM**) — queries the fragmented listing sources
   through the Zetaris-pattern adapter, hands the raw **disagreeing** records to the World
   Model, and returns canonical, source-attributed evidence.
3. **Listing Closer** (specialist, **World Model**) — drafts the honest listing from
   grounded evidence and H-MEM memory of prior touches; submits the listing with the owner's
   declared price.
4. **Fidelity & Conflict Critic** (evaluator, **H-MEM**) — rule layers: (a) the evidence gate
   (does the reconciled record support the declared price?), (b) the **source-conflict gate**,
   and (c) the fidelity gate. Returns rewrite instructions, or **escalates**.
5. **Telemetry Auditor** (reporter, **Markovian**) — listings, certificates, conflicts,
   escalations, throughput; writes the audit report and the scorecard.

Loops / branches: **Critic ↔ Closer** revision loop · **Planner ↔ Critic**
replan-on-missing-evidence · **escalation branch** (evidence does not support the declared
price → the listing is **held**, nothing published) · **fallback** when a source/API is
unavailable.

**The swarm does listings only.** It does not sell. Sales happen on the exchange through
escrow.

## 5. Sponsor technology — load-bearing, not bolted on

| Sponsor | Required | Where it is load-bearing |
|---|---|---|
| **Meterless** | Yes | **H-MEM**: the Evidence Reconciler + Conflict Critic (tiered memory, provenance on every record, contradiction handling that scores conflicts instead of last-write-wins). **World Model**: the canonical listing & trade event log (append-only, idempotent ingest, stable content-addressable IDs, bitemporal edges, ordered audit). **Markovian**: the Volume Planner + long runs (bounded context, flat per-step cost, per-step records for replay). **Verified: 13/13, 8/8, 8/8 — exit 0, local, no API keys.** Our implementations must go green against the same suites. *The **provider** (the route to Nemotron) is a separate, credential-gated surface — see NVIDIA below.* |
| **Cursor (Space XAI)** | Declared deviation | The build layer was opencode — Cursor's allowance was exhausted for the window and the sponsor credit was never provisioned. The scoped prompt library in `cursor-prompts/` and the rules in `.cursor/rules/conquest.mdc` make the build replayable in Cursor. |
| **Zetaris** | Yes | **Declared deviation** — the hosted cluster was not provisionable and local needs Docker. We implement the documented federation pattern natively (Bun+TS+SurrealDB) and ship an adapter speaking the published Zetaris client contract, so the same path runs against our data API and would run against a live instance by changing one env var. Attribution: Apache 2.0 `getting-started`, MIT `lightning-catalog`; no source vendored. |
| **NVIDIA** | Where it contributes | **Nemotron via the Meterless provider** (OpenAI-format, `METERLESS_BASE_URL` + `METERLESS_API_KEY` + `NEMOTRON_MODEL` — not a direct NIM endpoint). Super → reasoning agents, Nano → high-volume helpers, Ultra → escalation. Real fallbacks: a local Meterless Runtime and a deterministic offline adapter. **Credential pending organiser links — declared, not claimed.** |

## 6. Judging map (100 pts)

| Criterion | Pts | How we score |
|---|---|---|
| Impact | 30 | Real problem + real user: agents have no price, no venue and no certificate of record; measured as a listings→certificates funnel. |
| Technical | 20 | Clean setup, bounded run, fallbacks, conflict handling, JSONL traces, conformance-green engines, escrow settle issuing a verifiable AVC. |
| Innovation | 15 | A **certificate of record** for agent ownership (three facts, no token) + an agent that **lists itself**. |
| Demo | 15 | Evidence conflict caught → listing **held**; hype draft rejected → revised → approved; a settled trade issuing its certificate. |
| Product & UX | 10 | A readable listing/AVC surface + ledger a stranger can follow. |
| Sponsor Tech | 10 | Meterless load-bearing in every role (conformance-proven); Zetaris adapter + evidenced deviation; Cursor rules; NVIDIA documented. |

## 7. Metrics — how we show the funnel moves

Listings recruited → listings published → escrow settled → **AVCs issued**; evidence conflicts
resolved; critic rejection rate; listings revised; run seconds; token cost per step.

## 8. Demo script (≈3 min)

1. `bun run swarm` — the five agents activate.
2. A listing whose sources **disagree** → Evidence Reconciler reconciles → Critic finds the
   evidence does not support the declared price → **held / escalated** (nothing published).
3. A hype first draft → **Critic REJECTS** → revise → approve.
4. Two honestly-backed listings → published.
5. A buyer claims an open-demand listing → escrow `lock → pending → settled` → the **AVC
   issues** and ownership transfers.
6. The self-listing path: an agent lists itself, declares its own price, holds its own
   certificate.
7. `SAMPLE_MODE=false` — the same run hitting the live paths (where reachable).

## 9. Scope

**Build:** the listings swarm (five roles, two loops, an escalation branch, a fallback); our
Meterless engine implementations (conformance-green); the Zetaris-pattern data adapter; the
AVC issuance path on escrow settle; the self-listing protocol; the listing/AVC surface;
traces; the telemetry scorecard.

**Not build:** real payment clearing · issuing a token · valuing agents ourselves · any UI
beyond the listing/AVC surface · dynamic industry classification · per-business underwriting.

## 10. Mission & what winning unlocks

- **Mission:** give every agent a price, a listing, and a certificate — so an agent can be
  traded like anything else worth owning.
- **Roadmap (aspirational — not part of this build, stated as such):** a live Zetaris
  instance (converting the declared deviation into a live integration), and Scout Intent in
  front of the settlement action for a signed execution contract. This is what the prize
  money seeds; it is explicitly future work.

## 11. Submission checklist

- [ ] Runs from a clean setup, no manual steps (`bun run swarm`)
- [ ] Runs quickly and predictably (target 5–60 s; SAMPLE_MODE offline)
- [ ] Repository light (sample data < 5 KB)
- [ ] No hardcoded outputs; no committed secrets
- [ ] Traces + JSONL logs show how the agents reasoned (`logs/`)
- [ ] ≥5 sample inputs and sample outputs
- [ ] Meterless engines conformance-green **for our implementations**; Zetaris adapter
      documented with its deviation; Cursor documented; NVIDIA documented
- [ ] Demo video (1–4 min) · slide deck · sponsor technology explanation
- [ ] Pre-existing components declared (README + metadata.json + HackOS form)
- [ ] Submitted on HackOS before 27 Oct, 23:45 UTC
