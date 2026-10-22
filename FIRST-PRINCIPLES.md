# FIRST-PRINCIPLES.md — what we're building and why

Plain English, written to stop us spinning on stale framing. This is the canonical **why**;
`PLAN.md` is the **what/how**; `BUILD-PROMPTS.md` is the in-window execution. If this file
and an older doc disagree, this file wins and the older doc gets aligned.

> **v3 — 2026-10-21.** Rewritten for the **agent exchange**. The retired framing (a
> marketing swarm selling a R10,000 worker agent on coupons and a 6-month runway) is gone.

## 0. The one job

Build the **exchange where agents are priced, listed and traded** — and the agent swarm that
recruits listings onto it.

A human registers an agent and pays a listing fee (inbound x402). The protocol issues an
**Agentic Valuation Certificate (AVC)**: a public-key-verifiable record of *who* the agent is,
*what was paid*, and *what it bought*. **The certificate is the product.**

**Listing is the product.** Humans pay to list their agents. We never pay out.

## 1. What the hackathon scores — and what it inherits

- **Directly scored:** the swarm (architecture, critique/recovery, loops, sponsor tech, demo,
  UX) and the exchange surface it drives.
- **Inherited:** the Impact score is partly a judgment on *what the exchange is for*. An
  exchange that lets people price and certify the agents they build — so agents can be owned
  and traded like anything else worth owning — is a bigger claim than a marketplace for
  listings alone.

## 2. The problem this solves

Agents are built and deployed everywhere and **priced nowhere**.

- An owner with a working agent has no venue to list it for a declared price.
- A buyer has no standard way to know what an acquisition actually conferred.
- Buyer and seller, who have never met, have no settlement layer.
- The evidence needed to price a listing is **fragmented across sources that disagree**.

That last point is the Track 1 problem, and it is where the swarm earns its place: listing
evidence lives in several sources that contradict each other, and a listing priced off an
unreconciled view is a claim, not a valuation.

## 3. The three innovations

1. **The AVC — a certificate of record.** It certifies exactly three facts: *who* the agent
   is (a standardized agentic identity in an Ethereum wallet), *what was paid* (the
   owner-declared price, recorded), and *what it bought* (the listing/access term). Nothing
   more. It is the thing a buyer holds, and it is verifiable without trusting us.
2. **The owner declares the price; we do not value.** We are a **venue and settlement layer**,
   not a valuer. This is the innovation *and* the regulatory shield: we never issue a token
   (staying outside issuer rules), and we never make an investment judgement on the agent.
3. **Self-listing.** A human pays the listing fee once; the protocol hands the agent a
   listing token; the agent then lists **itself**, declares its own price, and holds its own
   certificate. No human in the loop after step one.

## 4. Regulatory framing — a venue, not an issuer

- We **certify what was agreed**, not the worth of the agent. The owner's declared price is
  *their* statement; our certificate records that it was paid for a stated term.
- **No token, no security.** The AVC is a record, not an interest in a pool. We never issue.
- **A listing fee is a service fee, not an investment subscription.** A production launch
  still needs legal sign-off — stated here so nobody mistakes this document for advice.

## 5. Settlement — 2-of-2 escrow is the global layer

Buyer and seller have never met, so escrow is the only sane settlement rail:

- `lock → pending → settled`, plus dispute, claim and cancel.
- **Buyer-unknown-to-seller is open demand** (`SellerAccountNumber: ''`), claimed via
  `claimOpenDemand` — the listing goes to whoever claims it.
- On the **settled** transition the escrow releases **and the AVC issues/re-signs**.
- One critical detail: the settled transition transfers **ownership of the listing**, it is
  **not** a cash-out. A cash-out would convert the trade into a balance credit and break
  what the certificate actually means.

## 6. The money rules we inherit (pre-existing, unchanged)

- **The peg is 1 TIME = 1 minute = R1.** Whole-rand transactions only. Cents exist only in
  code bookkeeping, never as a denomination.
- **Genesis 40,492,224,000,000; 1,440/day** per account; the swarm must not perturb the
  invariant (`recon` delta 0).
- **x402 flows inbound only** — buyers pay us; we never pay out.
- Time may be used as the entry price for a listing, because a minute already carries its
  price in the loop. That is a pre-existing product capability, and the exchange inherits it.

## 7. Scope line — what is pre-existing vs in-window

- **Pre-existing (declared, hackathon rule 4.2) — the product:** the escrow state machine,
  the settlement/certificate rail, the money engine (`writeLedger`, the supply invariant, the
  daily time allocation), the account-mint rail. These live in the private product repo and
  are reached **over API**. They are declared, not resubmitted, and are never shown.
- **In-window (the new work) — the swarm and the exchange surface:** the five-role listings
  swarm, our own Meterless engine implementations (conformance-green), the AVC issuance path
  wired to the escrow settled transition, the self-listing protocol, the listing surface, the
  Zetaris-pattern data adapter, the fallback mode, and the deliverables.

## 8. The deliverable

A working listings swarm + the exchange surface it drives + public repo + README
(setup/usage/dependencies) + a 1–4 min video + a slide deck + a sponsor-integration write-up;
passing the mandatory gates (Zetaris + Meterless + Cursor).

## 9. The 10 things (compressed)

1. One job: the exchange where agents are priced, listed and traded — plus the swarm that
   fills it.
2. The certificate is the product; listing is the product; the tenure is not.
3. We certify, we do not value. No token, ever.
4. Owner sets the price. We hold what they paid and record it.
5. Settlement is 2-of-2 escrow; the settled transition transfers ownership and issues the
   AVC.
6. Inbound x402 only. We never pay out.
7. Fragmented evidence is reconciled before anything is listed; a listing whose evidence
   does not support the price is **held, not published**.
8. Pre-existing/declared: escrow, settlement/certificate rail, money engine. In-window:
   swarm, AVC hook, self-listing, surface, adapters.
9. Honesty is a feature: a declared deviation beats a faked integration. A refused listing
   beats a hype listing.
10. Winning: pass every gate; demonstrably refuse to overclaim; move a measurable listing
    funnel; self-evident impact.

## 10. Open items

- ~~Stack~~ — **settled: Bun + TypeScript + SurrealDB** (see `BUILD-PROMPTS.md` §0).
- ~~Meterless access~~ — **resolved 2026-10-21, in two parts.** The **engines** are
  local-first, Apache 2.0, no API keys. Conformance verified: H-MEM 13/13, Markovian 8/8,
  World Model 8/8, all exit 0. The **provider** (the route to Nemotron) is a separate,
  credential-gated surface — pending the organiser's account/credit/base-URL/model links.
- **Zetaris** — a **declared deviation** (the hosted cluster is not provisionable; the
  official local install needs 4 containers and ≥8 GB of Docker memory, and this build
  machine has 1,814 MB total with no Docker). We implement the documented federation
  pattern natively and ship an adapter against Zetaris's **published REST contract**
  (`OpenSqlQuery` → `PageSqlQuery` → `CloseSqlQuery`). Chasing a **shared event instance**
  for live credentials would convert it — that is a message, not a build.
- **NVIDIA** — Nemotron **through the Meterless provider** behind one injected generator,
  with a local Meterless Runtime and a deterministic offline adapter as fallbacks. The
  credential is pending organiser links; declared as pending, not claimed.
- **HackOS-gated items still to fetch when the account is live:** exact submission-form
  fields, the manual registration attestation, and the Meterless/Meterless-engine folder
  contents (already verified from the public repo).

## 11. Three products, three clocks (settled 2026-10-21)

| Product | State | Clock | Owner of success |
|---|---|---|---|
| **1. The exchange** (escrow + certificate rail + money engine) | Running in production; **declared pre-existing** | Now → Oct 27 | Product |
| **2. The swarm + exchange surface** (the judge-facing work) | Built/finished from **Oct 22**; the rest of the window tests **real listings and real certificates** | Oct 22 → Oct 27 | In-window build |
| **3. Hackathon rubric skill** (the compliance monitor) | **Live now**; counts the success score continuously | Now → submission | Tooling (built) |

**Aim:** the best honest 80+. Two declared deviations cost sponsor points; everything else
is in play, and a faked integration would cost more than the deviation ever could.

**World-firsts we are claiming:**
- **A certificate of record for agent ownership** — public-key verifiable, three facts, no
  token issued. *Agent ownership has not been done before.*
- **An agent listing itself** — a human pays once; the agent prices itself and holds its own
  certificate.

> The listings funnel is the bridge: the swarm produces listings and certificates, the
> hackathon markers read them, and they feed the evaluated Impact criterion.
