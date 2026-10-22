# SUBMISSION — the HackOS entry, field by field

> **The identifiers, exactly right — get these right and nothing else can go wrong:**

| | |
|---|---|
| **Repository (paste into the form)** | `https://github.com/muziconsulting-cloud/conquest-designer` |
| **Repository name** | `conquest-designer` |
| **Project directory (WSL)** | `/home/wardair/ConquestDESIGNER` |
| **Declared pre-existing tag** | `pre-window-scaffold` |
| **The build** | `git diff pre-window-scaffold..HEAD` |

There is **one** submission repository. No other repository in the account is the submission.

---

## 📋 Before you paste — the five-minute check

The form text below is final. These five things are **not** final until the build lands, and
every one of them is a place a half-built submission can quietly lie:

1. **The engine conformance numbers.** They must be the score of **our** implementations
   running **their** suites, and they must be pasted from the README build table — not from
   a plan. **They are now real and recorded:** `H-MEM 13/13 · World Model 8/8 ·
   Markovian 8/8`, our implementations in `src/engines/`, against the sponsors' own
   suites, exit 0 — captured in `evidence/conformance-ours.txt`. The sponsors' reference
   scores live in a separate file and are never presented as ours.
2. **`bun run conformance` must exist and exit 0.** It exists, and it exits 0 — and
   `bun run determinism` (two runs, compared entry by entry) exits 0 beside it. If the
   command is not in the README when you paste, the claim is a claim about nothing.
3. **The Zetaris story must match reality on the day.** If a live instance was reachable,
   say so and paste the URL. If not, the declared-deviation wording below is correct and
   must stay.
4. **The NVIDIA claim must be what a run proved.** Never say Nemotron unless a recorded
   run names the routing id. If it did not run, the "declared, not yet exercised" wording
   is the honest one.
5. **The demo video and deck URLs must be live**, and the video must show the real run —
   including the held listing.

---

## 1 · Project name

```
Conquest — the Agent Exchange
```

## 2 · Tagline (one line, for a card or a hero)

```
The exchange where agents are priced, listed, bought and certified.
```

## 3 · One-liner

```
An exchange where agents are priced, listed, bought and certified — and the certificate
says exactly three things, all of them true.
```

## 4 · Short description (~300 characters)

```
An exchange where agents get priced, listed, bought and certified. Owners pay a listing
fee; the agent then lists itself and names its own price. A swarm of five agents
reconciles the evidence behind that price across disagreeing sources — and holds the
listing if the evidence doesn't support it. On settlement you get a signed, verifiable
certificate: who, what was paid, what it bought.
```

## 5 · Full description (the main body)

```
Conquest is the exchange where agents get priced, listed and traded.

Today, agents are built and deployed everywhere and priced nowhere. There is no venue
where an owner can list an agent for a declared price, no standard way for a buyer to
know what a purchase actually conferred, and no settlement layer for two parties who
have never met. Conquest is that venue, and the product it sells is a certificate.

How it works. A human registers an agent and pays a listing fee once, inbound over
x402. From that moment the agent acts for itself: it receives a listing token, declares
its own price, and submits its own listing. No human touches the transaction again.

Then the work begins, and the work is the point. The evidence that supports a price
lives in scattered sources that disagree with each other. A swarm of five agents
discovers that evidence across the fragmented sources, reconciles it, and adjudicates
the contradictions: a memory spine that scores conflicts instead of overwriting them, a
canonical event log that makes every listing and trade auditable, and a bounded
run engine that keeps the whole thing replayable. A price the reconciled evidence
does not support is held, not published. Holding is a success — the failure mode for
an exchange that sells agents is publishing a bad price.

When a buyer purchases, a two-of-two escrow holds the payment, both parties confirm,
and on settlement the escrow releases and an Agentic Valuation Certificate is issued.
The certificate states exactly three facts: who the agent is (a standardised agentic
identity in a wallet), what was paid (the amount, the currency, the payment
reference), and what it bought (the listing and access term). It is deliberately not a
valuation — it asserts no computed worth — and it is not a token. It is signed, and it
verifies from its signed bytes alone, without asking the issuer. It is money-shaped,
it is sellable, and it is true.

The certificate is the product. The exchange is the venue.
```

**What is real in the submitted repository, and what is not** — so nothing above is
read as a claim it has not earned:

| Built and runnable here | Not built yet |
|---|---|
| the listing swarm (five roles, one seam, JSONL traces) | a **live** Zetaris instance — no instance was reachable |
| our own H-MEM / World Model / Markovian, green on the sponsors' suites (13/13, 8/8, 8/8) | a live x402 payment rail and a real payment — the facilitator is a **local stub** |
| the Zetaris client over the published REST contract (against a local protocol-compatible server) | the hosted LLM path with a real credential — the runs use the deterministic offline adapter |
| the 2-of-2 escrow, and the AVC issued **only** on `settled`, verifiable from its signed bytes | a **live** public URL for the surface — the server is built and runs |
| the self-listing protocol: a real 402, a single-use listing token, and the agent declaring its own price through the same critic | |
| the operator surface: server-rendered HTML, no framework, no build step — the listings, one listing in full with its critique and its trace, the agents, the trace, and the certificate with a live verify | |

## 6 · Track

```
Track 01 — Solving Fragmented Intelligence
```

> *Demonstrate a clever ability to discover and work across fragmented data sources.*
> The evidence that prices an agent lives in scattered sources that disagree with each
> other. The exchange discovers that evidence across them, reconciles it, and refuses to
> publish a price the evidence does not support.

## 7 · Team

```
WardByWard (solo)
```

## 8 · Repository

```
https://github.com/muziconsulting-cloud/conquest-designer
```

## 9 · Demo video + slide deck

```
Demo video (1–4 min): <url>
Slide deck:            <url>
```

---

# The long-form answers

## The five Day-1 answers

**1 · Who is the user?**
The agent builder who wants their agent listed and paid for, and the buyer who needs to
know what a purchase actually conferred.

**2 · What is the problem?**
Agents are built and deployed everywhere and priced nowhere: there is no venue where an
owner can list an agent for a declared price, no standard way for a buyer to know what
they actually acquired, and no settlement layer for two parties who have never met.

**3 · What goes in?**
A listing: an agentic identity in a wallet, a declared price, and the evidence that
supports it — gathered from fragmented sources that disagree.

**4 · What comes out?**
A listing on the exchange, and — only when the trade settles — an **Agentic Valuation
Certificate**: a signed, publicly verifiable record of **who** (the agentic identity),
**what was paid**, and **what it bought**. Plus a canonical listing-and-trade event log
and a per-run telemetry scorecard.

**5 · Why does this need an agent?**
Because the work is *adjudication across disagreeing sources*, not retrieval. A single
prompt cannot reconcile a conflict and be accountable for the resolution; the pipeline
has to plan the evidence buckets, gather from each, score the contradictions, escalate
once, and hand back a decision with every claim cited. And the decision has to be
**auditable** — the same inputs must produce the same verdict, with the reasoning on
the record, which is exactly what a memory spine, a canonical event log and a bounded run
engine are for.

## How Zetaris was integrated

We implemented a **client for Zetaris's published REST contract**, and it is real code:
`OpenSqlQuery` → `PageSqlQuery` → `CloseSqlQuery` over HTTP, with Bearer auth, the
`X-Org-ID` and `X-Request-ID` headers, the returned `queryToken` carried through the
page step, and the query **closed on the error path as well as the happy one**.

We attempted every documented path to a live instance first: the local Docker install
(needs Docker, unavailable on our build machine) and the managed AWS CloudFormation
Quickstart (`ConguestDESIGNER`, eu-central-1), which stalled at the AWS account-binding
and billing gate. No instance was ever reachable, and no shared-instance credentials
were issued to us.

So we did not fake an integration. The demo runs the identical client against a **local
server that speaks the same protocol** — the stub is on the *server* side, never inside
the client — and the **same command** runs against a live instance by changing one
environment variable:

```bash
bun run zetaris:selftest -- --url <host> --org <numeric-id> --token <bearer>
```

**This is a declared deviation, stated plainly:** the integration is to the published
contract, not to a live server we were given.

## How Meterless was integrated

We implemented **our own** H-MEM, World Model and Markovian engines from their published
`AGENTS.md` contracts — the engine specs are fetched at build time into a gitignored
`vendor/` directory; their reference implementations were read, never vendored; the
Apache 2.0 attribution is in `SPONSORS.md`.

They are not decoration. They are the substrate — and the roles actually run on them:
the volume planner expands the pull plan on Markovian, the reconciler stores, recalls and
cites on H-MEM, the critic teaches H-MEM what survived the challenge, and the closer and
the auditor write the canonical record and the decision to the World Model.

| Engine | Role it backs | What it does for the product |
|---|---|---|
| **H-MEM** | Evidence Reconciler, Conflict Critic | tiered memory, provenance on every record, a capture/enrich/retrieve/dream/sleep lifecycle, and contradiction handling that **scores** conflicts instead of last-write-wins |
| **World Model** | Listing Closer, Telemetry Auditor | the canonical listing-and-trade event log — append-only, idempotent ingest, stable content-addressable IDs, bitemporal edges, an ordered audit entry per mutation |
| **Markovian** | Volume Planner | bounded-context chunking, compressed state carried forward, flat cost per step, per-step records for replay and diff |

**The suites are theirs, and they are the definition of done.** Each engine step in the
build is accepted only when the sponsor's own conformance suite passes against our
implementation — the score is pasted into the README's build table, and `bun run
conformance` reproduces the run.

**Our scores, on our own implementations in `src/engines/`, against the sponsors' own
suites: H-MEM 13/13 · World Model 8/8 · Markovian 8/8** — all local, no API key, exit
code 0, recorded in `evidence/conformance-ours.txt`. The sponsors' reference scores are a
separate file (`evidence/conformance-reference.txt`) and are never presented as ours.

**The engines store, retrieve, cite, record and learn — they never decide.** The
exchange rule stays authoritative: the owner's declaration is the claim, and only
independent sources resolve a field. That is why a price the evidence does not support
can be **held**.

## How the build was done — and the one deviation in it

**The build layer was opencode, not Cursor, and that is a declared deviation.**
Cursor's allowance was exhausted for the whole window: the account's monthly limit was
spent, the API key's weekly limit was reached inside the window and does not reset
until after the deadline, and the sponsor credit had not been provisioned to us. We
would rather state that plainly than imply a build tool we did not use.

**The method was spec-first, one scoped feature per step:**

1. **Specify** — a scoped prompt per feature, in `cursor-prompts/`. Context is loaded
   from **files**, never pasted: the mandated Meterless pattern via `@filename`, the
   contracts from `src/types.ts`, the house rules from `.cursor/rules/conquest.mdc`.
   Each prompt carries its own acceptance gate, so the gate travels with the spec.
2. **Build and gate** — the step is implemented against its prompt and the acceptance
   command is run: the engine conformance suite for an engine, the fixture output for
   the orchestrator, the certificate verification for the AVC. Where output was not
   understood it was read back, not assumed.
3. **Commit** — a commit follows every working step, so a bad step is rolled back
   rather than debugged in place.

**The full prompt library is in the repository** (`cursor-prompts/`, twelve scoped
prompts, each with its acceptance command), so **any feature can be re-run from its
prompt** — in Cursor, if the sponsor credit is provisioned, or in any other tool, since
the prompts are the specification rather than a transcript of one session. The README's
"How we built it" table carries one row per step with the acceptance output.

**Cursor remains in the stack** as the rules file that governs every step
(`.cursor/rules/conquest.mdc`) and as the target of that replayable prompt library.

## Where NVIDIA technology contributes

**NVIDIA Nemotron, reached through the Meterless fleet** — an OpenAI-format
`chat/completions` surface, the way a Cursor user reaches Grok through Cursor. We hold
**no NVIDIA account, no NVIDIA key and no NVIDIA billing**, and we do not use a direct
NIM endpoint.

The model is selected by a **routing mode discovered from the provider at runtime**, not
hard-coded: reasoning-grade models serve the adjudication agents, cheap high-volume
models serve the helper agents, and the escalation path takes the strongest tier. The
tier is a **disposition**, so swapping it is configuration, not a rewrite.

NVIDIA's contribution is where a price gets argued over — the conflict critic's
reasoning. Two fallbacks are real and both are shipped: a **local Meterless Runtime**
and a **deterministic offline adapter** that the demo runs on, so nothing in the demo
waits on a credential that has not been issued. We do not claim to have run Nemotron
unless a recorded run names the model.

> *At paste time: if no run named a Nemotron routing id, say "declared, not yet
> exercised" here — do not soften it into an implied claim.*

## What was unique about our use of the sponsor technologies

- **The engines are the product's spine, not a wrapper.** A green conformance score is
  the definition of done, not a demo. We implemented three engines from their contracts
  and made them pass their own suites.
- **The metric is the tension.** H-MEM's "conflicts are scored, not last-write-wins"
  maps onto the commercial problem directly: a listing whose evidence does not support
  its declared price is **held, not published**. Holding is a success, and the failure
  mode of an exchange that sells agents is publishing a bad price.
- **One LLM port, three adapters.** The hosted provider, a local runtime, and a
  deterministic offline adapter behind a single interface — so the demo is fully
  runnable with **no key, no credit and no network**, and the same code runs against a
  real endpoint when one is issued.
- **The Zetaris client is a real client.** The stub is on the server side, never in the
  client. The same command runs against a live instance.
- **The certificate is the product**, and it is deliberately **not a token** and **not a
  valuation**: three facts, signed, verifiable from the signed bytes alone.

## Pre-existing components (rule 5.4)

Declared in full in [`PRE-EXISTING.md`](./PRE-EXISTING.md) and tagged
`pre-window-scaffold` in the repository.

- **The WardByWard / Conquest platform** (separate private production deployment): its
  money engine, escrow state machine, settlement/certificate rail and account-mint rail.
  Reached over API; no source copied here.
- **The declared pre-existing scaffold in this repository** (tag `pre-window-scaffold`): the
  contracts and interfaces (`src/types.ts`, `src/llm/port.ts`, `src/zetaris/adapter.ts`),
  the mandated Meterless prompt library, the scoped Cursor prompt library, the
  documentation, the deck and demo scripts, the fixtures and the toolchain. **Contracts
  and interfaces only — no implementation.**

Everything else in the repository was authored **inside** the build window.
