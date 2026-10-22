# SUBMISSION — the text for the HackOS form

Paste-ready. Field names follow rule 6.

---

## Project name

**Conquest — the Agent Exchange**

## One-liner

An exchange where agents are priced, listed, bought and certified — and the certificate
says exactly three things, all of them true.

## Track

**Track 01 — Solving Fragmented Intelligence**

> *Demonstrate a clever ability to discover and work across fragmented data sources.*
> The evidence that prices an agent lives in scattered sources that disagree with each
> other. The exchange discovers that evidence across them, reconciles it, and refuses to
> publish a price the evidence does not support.

## Team

WardByWard (solo)

## Repository

`https://github.com/muziconsulting-cloud/conquest-designer`

---

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
**auditable** — the same inputs must produce the same verdict, with the reasoning on the
record, which is exactly what a memory spine, a canonical event log and a bounded run
engine are for.

---

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

They are not decoration. They are the substrate:

| Engine | Role it backs | What it does for the product |
|---|---|---|
| **H-MEM** | Evidence Reconciler, Conflict Critic | tiered memory, provenance on every record, a capture/enrich/retrieve/dream/sleep lifecycle, and contradiction handling that **scores** conflicts instead of last-write-wins |
| **World Model** | Listing Closer, Telemetry Auditor | the canonical listing-and-trade event log — append-only, idempotent ingest, stable content-addressable IDs, bitemporal edges, an ordered audit entry per mutation |
| **Markovian** | Volume Planner | bounded-context chunking, compressed state carried forward, flat cost per step, per-step records for replay and diff |

**The proof is their own conformance suites, run against our implementations:**

```
H-MEM        13/13 passed
World Model   8/8  passed
Markovian     8/8  passed
```

All local, all with no API key, all exit code 0. `bun run conformance` reproduces it.

## How Cursor was used during development

Cursor was the build layer for the whole submission, on Cursor's included models
(Composer / Grok), on Cursor credit. The method was one scoped feature per run:

1. **Describe** — a scoped prompt per feature, in `cursor-prompts/`. Context is loaded
   from **files**, never pasted: the mandated Meterless pattern via `@filename`, the
   contracts from `src/types.ts`, the house rules from `.cursor/rules/conquest.mdc`
   (which Cursor loads automatically on every run).
2. **Review** — the diff is read and the acceptance command is run — the engine
   conformance suite for an engine, the fixture output for the orchestrator, the
   certificate verification for the AVC. Where output was not understood it was read
   back, not assumed.
3. **Steer** — the next prompt carries the failure output, not a guess. A commit follows
   every working step, so a bad generation is rolled back rather than debugged.

**The full prompt library is in the repository** (`cursor-prompts/`, eleven scoped
prompts, each with its acceptance command), so **any feature can be re-run from its
prompt**. The README's "How we built it" table carries one row per run with the
acceptance output.

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
- **The pre-window scaffold in this repository** (tag `pre-window-scaffold`): the
  contracts and interfaces (`src/types.ts`, `src/llm/port.ts`, `src/zetaris/adapter.ts`),
  the mandated Meterless prompt library, the scoped Cursor prompt library, the
  documentation, the deck and demo scripts, the fixtures and the toolchain. **Contracts
  and interfaces only — no implementation.**

Everything else in the repository was authored **inside** the build window, by Cursor.

## Links (fill at submission time)

- Demo video (1–4 min): `<url>`
- Slide deck: `<url>`
- Repository: `https://github.com/muziconsulting-cloud/conquest-designer`
