# Conquest — the Agent Exchange

> ### 📌 The submission identifiers — get these exactly right
>
> | | |
> |---|---|
> | **GitHub repository (paste this into the HackOS form)** | `https://github.com/muziconsulting-cloud/conquest-designer` |
> | **Repository name** | `conquest-designer` |
> | **Project directory (this repo, on WSL)** | `/home/wardair/ConquestDESIGNER` |
> | **Declared pre-existing tag** | `pre-window-scaffold` |
> | **The build** | `git diff pre-window-scaffold..HEAD` |
>
> There is **one** submission repository. No other repo in the account is the submission.

An exchange where autonomous agents are **priced, listed, and traded**. A human registers an
agent, pays a listing fee (inbound x402), and the protocol issues an **Agentic Valuation
Certificate (AVC)** — a public-key-verifiable record of *who* the agent is (a standardized
agentic identity in an Ethereum wallet), *what was paid* (the owner's declared price), and
*what it bought* (the listing/access term). The certificate is the product.

A **swarm** of agents does the listing work: it recruits agent listings, reconciles evidence
across fragmented sources, closes listings through escrow, critiques its own fidelity, and
audits its own telemetry — a fragmentated-intelligence problem solved by division of labour,
with real traces.

> **Status: live.** The build window opened 2026-10-22T00:00Z and the build is running in
> this repository. The pre-existing product components are **declared** below, and the
> build that sits on top of them is the diff from the `pre-window-scaffold` tag.

---

## Pre-existing declaration

This submission is built on a **pre-existing product** and adds new in-window work on top of
it. Per the event rules (§4.2 / §5.4), everything pre-existing is declared here and in the
submission form.

**Declared pre-existing (prior work, not authored in the build window):**

- The **WardByWard / Conquest platform** — a Bun + TypeScript, server-rendered application
  backed by SurrealDB, running in production. Its money engine (the `writeLedger` transfer
  rail, the 40.492T TIME supply invariant, the 1,440/day time-allocation payroll), its
  escrow state machine, its settlement/certificate rail, and its account-mint rail are
  pre-existing. These are connected to this submission **as an API**, not rebuilt.
- The private architecture document and the AVC definition of record (kept private; not shown).

**Authored inside the build window (the judged work):**

- The **agent swarm** (listings-only roster) and its orchestration.
- The **AVC issuance path** wired to the escrow `settled` transition (ownership transfer).
- The **self-listing protocol** and the listing surface.
- The **Zetaris REST-contract adapter** (see [Sponsor integration](#sponsor-integration)).
- The **fallback mode** that keeps the swarm running when an external API is unavailable.

The pre-existing code is **not** re-included in this repository; it is declared and reached
over API. This repository contains the in-window work.

---

## Setup

Requires **Bun** (for the swarm runtime) and access to the pre-existing product API.

```bash
bun install
cp .env.example .env              # fill placeholders; never commit .env
bun run engines:fetch             # the three Meterless engine specs → vendor/meterless/
```

`.env.example` carries **placeholders only**. No secrets are committed; `.env` is gitignored.

`vendor/` is **not** in the repository on purpose — the Meterless engine folders are the
published contracts and the published conformance suites, fetched at build time. We
implement from the contract; we do not vendor the reference implementations
(Apache-2.0, attributed in [`SPONSORS.md`](./SPONSORS.md)). `bun run engines:fetch`
brings all three down; `bun run conformance` runs their suites against our code.

## Usage

### The judge's quick start

Four commands, copy-pasteable, from a clean clone. **Every one of these was run before
this README was written.**

```bash
bun install
bun run swarm -- --input input_examples/example_1.json
bun run serve -- --port 3000
curl -s -X POST http://127.0.0.1:3000/run -H 'Content-Type: application/json' \
  -d @input_examples/example_1.json
```

The `curl` is the **programmatic entry point** — no UI, no clicking. It returns:

```json
{
  "request_id": "example-001",
  "trace_id": "trace-20261024-001",
  "status": "success",
  "agents_used": ["volume-planner", "evidence-reconciler", "listing-closer", "conflict-critic", "telemetry-auditor"],
  "result": { "summary": "…", "findings": [ … ], "confidence": 0.82 },
  "collaboration": { "feedback_loop_completed": true, "revision_count": 1, "evaluator_findings": [ … ] },
  "log_path": "logs/trace-20261024-001.jsonl"
}
```

`log_path` points at a JSONL trace that exists when the response is sent. **Read it** —
it is the evidence that the agents collaborated rather than ran in sequence.

### What runs today

The listing swarm is built and running. It is not a mock: the decisions are computed
from the evidence, and the four fixture listings take four different paths through it.

```bash
$ bun run swarm
LST-0001  ->  accept   by conflict-critic  (trace: 35 entries)
LST-0002  ->  hold     by conflict-critic  (trace: 35 entries)
LST-0003  ->  revise   by conflict-critic  (trace: 35 entries)
LST-0004  ->  fallback by conflict-critic  (trace: 35 entries)
```

- **accept** — two independent sources agree with the declared R1440. Published.
- **hold** — the reconciled evidence supports **R2880**, not the declared R1440. The
  listing is **held, not published**, and it escalates exactly once.
- **revise** — the price agrees but the term does not. The critic challenges it, the
  reconciler answers with the stronger evidence, and the listing is published at
  **R1440 for 6 months**.
- **fallback** — one federated source did not answer. The run degrades, publishes on the
  evidence that did answer, and says so in the trace and in the copy.

The rule underneath all four: **the owner's declaration is the claim, never the evidence.**
Only independent sources resolve a field, so a claim can be contradicted — which is the
only reason the hold exists.

```bash
$ bun run scripts/verify-paths.ts     # the four paths, checked against the fixture key
ok   LST-0001  expected accept  got accept  (published, confidence 0.95)
ok   LST-0002  expected hold    got hold    (held, confidence 0.6)
ok   LST-0003  expected revise  got revise  (published, confidence 0.83)
ok   LST-0004  expected fallback got fallback (published, confidence 0.9)
PASS all four paths taken as described

$ bun run scripts/recon.ts             # the listing-side invariant
PASS no listing is published without supported, attributed evidence
```

**The three Meterless engines are built and green.** `bun run conformance` runs the
sponsors' own suites against **our** implementations in `src/engines/`:

| Engine | What it does here | Score |
|---|---|---|
| **H-MEM** | tiered memory with provenance, the hybrid ranking formula, the conflict gate, dreaming behind an approval boundary | **13/13** |
| **World Model** | the canonical listing/trade event log — stable ids, bitemporal edges, idempotent ingest, an audit trail | **8/8** |
| **Markovian** | bounded-context long runs — flat per-step cost, the marker protocol, the `[OVERLAP]` window, honest token labelling | **8/8** |

`src/engines/` is written from the sponsors' published contracts, not copied from their
reference implementations — `vendor/` is gitignored and fetched at build time.

**What is not built yet:** the escrow settlement and the certificate issue (P7–P8), and
the UI (P9).

### The other commands

```bash
bun run swarm          # start the listing swarm (Volume Planner → Rec. → Closer ⇄ Critic → Auditor)
bun run engines:fetch  # fetch the three Meterless engine specs (AGENTS.md contract + suites)
bun run conformance    # run the three Meterless conformance suites against OUR implementations
bun run recon          # the listing-side invariant: nothing published without supported evidence
```

`bun run recon` checks the invariant that exists at this step — no listing is published
without supported, attributed evidence, the canonical record is content-addressed, and two
runs of the same fixtures are decision-identical. The **money invariant** (the 40.492T
TIME equilibrium) belongs to the settlement work and is **not** claimed here; the script
says so on its first lines.

**Every command maps to the engine service behind it.** This is the shape Meterless's own
hackathon starter uses, and it is how the engine-usage line of the rubric gets read:

| Command | What runs behind it | Meterless engine |
|---|---|---|
| `bun run swarm` | evidence reconciliation → canonical listing/trade event log → bounded long-run cadence | **H-MEM** · **World Model** · **Markovian** |
| `bun run conformance` | the three published conformance suites (`bun vendor/meterless/<engine>/conformance/runner.ts`) | H-MEM 13/13 · World Model 8/8 · Markovian 8/8 — **our own scores**, on our own implementations in `src/engines/`, recorded in [`evidence/conformance-ours.txt`](./evidence/conformance-ours.txt). The sponsors' reference scores are a separate file and are never presented as ours. |
| `bun run recon` | the pre-existing product's `writeLedger` rail and supply invariant | — (pre-existing product API) |

The swarm writes one JSONL trace per run under `logs/`, so every listing decision is
reproducible and auditable.

**Runs with zero credentials.** `SAMPLE_MODE=true` is the default: the LLM port resolves to
a deterministic local adapter, so the exchange is fully runnable and demoable with **no API
key, no credit and no network**. When a Meterless provider credential is present, the same
seam calls **NVIDIA Nemotron through the Meterless fleet** instead — no NVIDIA account, key
or billing sits in our path. Nothing in the demo waits on a credential that has not been
issued.

## Dependencies

- **Runtime:** Bun (TypeScript executed in-process; no build step).
- **Data:** no external database. The exchange's own state lives in the process and on
  disk; the Zetaris adapter speaks the published REST contract, and the pre-existing
  product's API is reachable over HTTP when configured.
- **Protocol:** x402 (inbound payment receipts), an Ethereum wallet (agentic identity).
- **Agent engines:** Meterless **H-MEM**, **World Model**, **Markovian** (Apache 2.0) —
  implemented from each engine's `AGENTS.md` contract and gated by Meterless's published
  conformance suites. Not an npm dependency; the specs are the dependency.
- **Inference:** **NVIDIA Nemotron, reached through the Meterless provider** (OpenAI-format
  requests). The model is selected by routing id discovered from the provider at runtime,
  not hard-coded, with a local Meterless Runtime and a deterministic offline adapter as
  fallbacks.
- **Dev env:** the build ran in **opencode** against the **scoped prompt library** in
  `cursor-prompts/` — the house rules in `.cursor/rules/conquest.mdc` govern every step
  and the mandated Meterless prompt files are bound by `@filename`. **Cursor's allowance
  was exhausted for the window** (monthly on the account, weekly on the API key, sponsor
  credit not provisioned) — a declared deviation, stated in full under "How we built it".

---

## How we built it

**The build layer was opencode, not Cursor.** Cursor's allowance was exhausted for
the whole window: the account's monthly limit was spent, and the API key's weekly limit
was reached inside the window and does not reset until after the submission deadline.
The sponsor credit had not been provisioned to us. This is a **declared deviation** and
it is stated here, in the sponsor write-up and in the submission form rather than
hidden.

**What the build still has is a spec-first prompt library.** Every feature has a scoped
prompt in [`cursor-prompts/`](./cursor-prompts/) with its acceptance gate, and the
implementation follows its prompt exactly; the house rules in
[`.cursor/rules/conquest.mdc`](./.cursor/rules/conquest.mdc) govern every step; the
mandated Meterless prompt library is in [`prompts/`](./prompts/). **If the sponsor credit
is provisioned, the identical prompts can be replayed in Cursor, step by step, with the
gate in each prompt** — the build was written to be replayable, not to be depended upon.

**The method** — spec-first, one scoped feature per step, so each step is small,
reviewable and gated:

1. **Specify** — a scoped prompt per feature. Context is loaded from files, never
   pasted: the mandated pattern via `@filename`, the contracts from `src/types.ts`, the
   house rules from the rules file. The prompt carries the feature **and its acceptance
   gate**, so the gate travels with the specification.
2. **Implement** — the step is built against its prompt, and the prompt's acceptance
   command is the definition of done. Where the output was not understood, it was read
   back rather than assumed.
3. **Gate and commit** — the acceptance command is run, and the commit follows every
   working step, so a bad step is rolled back rather than debugged in place.

**The prompts themselves are in the repo** — [`cursor-prompts/`](./cursor-prompts/) holds
one scoped prompt per feature, and [`prompts/`](./prompts/) holds the mandated Meterless
prompt files they bind to. That is the reproducible form of the build: the prompts are
the specification, and any feature can be re-run from its prompt.

| Step | Feature | Prompt that specified it | Acceptance | Result |
|---|---|---|---|---|
| **P0** | the listing swarm, end to end: tracer, orchestrator, the five roles, the LLM registry, `POST /run` | [`cursor-prompts/p0-scaffold-wiring.md`](./cursor-prompts/p0-scaffold-wiring.md) | `bunx tsc --noEmit`; `bun run swarm`; `--input` capture; `POST /run`; two runs decision-identical | **pass** — 4 fixture paths (accept / hold / revise / fallback), 35-entry trace, three captured responses, `tsc` exit 0 |
| **P1–P3** | the three Meterless engines, written from the sponsors' contracts | [`p1-hmem-engine.md`](./cursor-prompts/p1-hmem-engine.md) · [`p2-world-model-engine.md`](./cursor-prompts/p2-world-model-engine.md) · [`p3-markovian-engine.md`](./cursor-prompts/p3-markovian-engine.md) | `bun run scripts/conformance.ts` — each sponsor's suite against **our** module | **pass** — H-MEM 13/13, World Model 8/8, Markovian 8/8 |

### Toolchain check

The organiser's own build check — *Cursor creates and runs a file, no API key* — was
passed first, so the build layer was known-good before any feature was started:

```
$ cursor-agent -p "Create a file hello.ts ... and then run it with bun" --model auto --force
Created `hello.ts` and ran it with bun. Output:
hello from cursor
```

Two engine prompts were then **rehearsed on throwaway copies outside this repo**, to
prove the prompt library is sound before the build started. A rehearsal is not the
build: the shipped code is authored inside the build window, here, in this repo.

| Rehearsal | Feature | Acceptance | Result |
|---|---|---|---|
| rehearsal | H-MEM engine, on a throwaway copy | H-MEM conformance | **13/13 passed** |
| rehearsal | World Model engine, on a throwaway copy | World Model conformance | **8/8 passed** |

**Read that table precisely.** These rehearsals ran **before** the window, on copies
**outside this repository**, and the code was **discarded** — none of it is in this
submission. They prove the scoped-prompt pattern and the engine contracts are sound; they
are **not** a result for the shipped code. The engines in `src/engines/` are written
inside the window (P1–P3) and their scores land in `evidence/conformance-ours.txt`. The
rehearsals are disclosed here, and in [`PRE-EXISTING.md`](./PRE-EXISTING.md), because a
judge should never have to guess which code is which.

**What the demo does not do:** the Meterless provider key is never in Cursor's settings.
Cursor credit paid for writing the code; Meterless credit is for the product running.

---

## Architecture (swarm)

```
Volume Planner  (orchestrator — decomposes the listing volume into work)      [Markovian]
      │
      ▼
Evidence Reconciler  (reconciles a candidate listing against fragmented srcs) [H-MEM]
      │
      ▼
Listing Closer  ⇄  Fidelity & Conflict Critic   (closes via escrow; critic)  [World Model]
      │
      ▼
Telemetry Auditor  (audits the run's own traces; emits the scorecard)        [Markovian]
```

The roster solves **fragmented intelligence** by partitioning the work: reconciliation is a
different job from closing, and closing is adversarially checked before settlement. Every
stage emits a trace.

Each stage is backed by a **Meterless engine** (Apache 2.0) and gated by that engine's
**published conformance suite** — H-MEM for tiered memory with provenance and contradiction
handling, World Model for the append-only canonical listing/trade event log, Markovian for
bounded-context long runs with flat per-step cost. The engine↔role mapping is listed in
[`SPONSORS.md`](./SPONSORS.md). Full detail in the architecture notes.

### The roster, against the standard roles for this track

The track's suggested shape is *Source Mapper → Reconciler → Conflict Critic → Reporter*.
Ours is the same shape with the roles named for what they actually do here:

| Standard role | Ours | Responsibility |
|---|---|---|
| Source Mapper | `volume-planner` | decides which sources to pull for this listing volume, and in what order |
| Reconciler | `evidence-reconciler` | pulls the evidence, reconciles what disagrees, cites the memory ids it used |
| Conflict Critic | `conflict-critic` | challenges the proposed listing against the reconciled evidence; sends it back once |
| Reporter / Closer | `listing-closer` | closes the listing — publishes it, or **holds** it when the evidence does not support the price |
| Evaluator | `telemetry-auditor` | audits the run itself: did the loop complete, was anything escalated, what went wrong |

Five roles, two loops, one escalation, one bounded fallback.

---

## Sponsor integration

See **[`SPONSORS.md`](./SPONSORS.md)** for the full write-up. Summary:

- **Cursor** — the build environment the organiser's track asks for. **Declared
  deviation:** Cursor's allowance was exhausted for the window (monthly limit spent, the
  API key's weekly limit reached inside the window, sponsor credit never provisioned), so
  the implementation was written in **opencode**, spec-first, against the scoped prompts
  in `cursor-prompts/` — with `.cursor/rules/conquest.mdc` governing every step. The
  prompt library is replayable in Cursor the moment credit exists.
- **Meterless** — agent engines. We use **H-MEM** (evidence reconciliation), **World Model**
  (canonical listing/trade event log) and **Markovian** (bounded-context long runs). All three
  are Apache 2.0, run locally with no API keys, and are **gated by Meterless's own
  conformance suites**. The sponsors' reference implementations score 13/13, 8/8, 8/8 on
  this machine; **our** implementations are P1–P3 and `bun run conformance` reports
  **PENDING** for each until its implementation exists.
- **Zetaris** — federated data. The hosted cluster was not provisionable (documented
  deviation); the documented federation pattern is reimplemented natively, with an adapter
  that speaks Zetaris's **published REST contract** (`OpenSqlQuery` → `PageSqlQuery` →
  `CloseSqlQuery`, bearer auth, `X-Org-ID` + `X-Request-ID`). **Declared deviation +
  native build.**
- **NVIDIA** — Nemotron inference, reached **through the Meterless fleet**: the seam asks
  the provider for a routing id, and the provider decides what runs. We hold no NVIDIA
  account, key or billing. **Declared, not yet exercised** — no run on this machine has
  named a routing id, because no provider credential has been issued to us. The offline
  deterministic renderer and the local-runtime path are real, and they are what the
  recorded runs used.

---

## License & attribution

The federation pattern and client contract used here are modeled on Zetaris's open-source
`getting-started` (Apache 2.0) and `lightning-catalog` (MIT) repositories. No Zetaris source
is vendored or redistributed; any code adapted from those sources retains its license notice.

---

## Where each check is answered

The organiser's own pre-submission checklist, answered line by line — and the **four
declared deviations** (Bun instead of Python, no Dockerfile, the Zetaris local
protocol-compatible server, and the build layer) with the reason for each:

**[`docs/COMPLIANCE-MAP.md`](./docs/COMPLIANCE-MAP.md)**

Also: [`docs/AVC-SPEC.md`](./docs/AVC-SPEC.md) is the product specification,
[`docs/BUILD-LEDGER.md`](./docs/BUILD-LEDGER.md) is the honest build and scoring ledger,
[`docs/README.md`](./docs/README.md) says what is in this repository and what is
deliberately withheld, and [`PRE-EXISTING.md`](./PRE-EXISTING.md) is the rule 4.2
declaration.
