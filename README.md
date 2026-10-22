# Conquest — the Agent Exchange

An exchange where autonomous agents are **priced, listed, and traded**. A human registers an
agent, pays a listing fee (inbound x402), and the protocol issues an **Agentic Valuation
Certificate (AVC)** — a public-key-verifiable record of *who* the agent is (a standardized
agentic identity in an Ethereum wallet), *what was paid* (the owner's declared price), and
*what it bought* (the listing/access term). The certificate is the product.

A **swarm** of agents does the listing work: it recruits agent listings, reconciles evidence
across fragmented sources, closes listings through escrow, critiques its own fidelity, and
audits its own telemetry — a fragmentated-intelligence problem solved by division of labour,
with real traces.

> **Status: pre-window.** The build window opens 2026-10-22T00:00Z. This README is written
> pre-window as part of the submission's declarations and setup contract. The agent swarm
> is built **inside the window**; the pre-existing product components are **declared** below.

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
cp .env.example .env        # fill placeholders; never commit .env
```

`.env.example` carries **placeholders only**. No secrets are committed; `.env` is gitignored.

## Usage

```bash
bun run swarm        # start the listing swarm (Volume Planner → Rec. → Closer ⇄ Critic → Auditor)
bun run conformance  # run the three Meterless conformance suites against OUR implementations
bun run recon        # verify the money invariant is balanced (delta 0)
```

**Every command maps to the engine service behind it.** This is the shape Meterless's own
hackathon starter uses, and it is how the engine-usage line of the rubric gets read:

| Command | What runs behind it | Meterless engine |
|---|---|---|
| `bun run swarm` | evidence reconciliation → canonical listing/trade event log → bounded long-run cadence | **H-MEM** · **World Model** · **Markovian** |
| `bun run conformance` | the three published conformance suites (`npx tsx conformance/runner.ts`) | H-MEM 13/13 · Markovian 8/8 · World Model 8/8 |
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
- **Dev env:** **Cursor** (Composer / Grok on Cursor credit) writes the code — rules in
  `.cursor/rules/conquest.mdc`, the mandated Meterless prompt files handed over with
  `@filename`. opencode is the reviewer that runs the gates and steers the next prompt.

---

## How we built it

**The build layer of this submission was built in Cursor**, on Cursor's included models
(Composer and Grok), paid from Cursor credit. The mandated **Meterless prompt library**
was the input to that build: each feature was started by handing Cursor the matching
prompt file from [`prompts/`](./prompts/) with `@filename`, then saying what to build.
The project rules in [`.cursor/rules/conquest.mdc`](./.cursor/rules/conquest.mdc) are
loaded automatically by Cursor and were in place for every run.

**The method** — one scoped feature per Cursor run, so a run is small, reviewable and
cheap on credit:

1. **Describe** — a scoped prompt per feature. Context is loaded from files, never
   pasted: the mandated pattern via `@filename`, the contracts from `src/types.ts`, the
   house rules from the rules file.
2. **Review** — the diff is read and the acceptance command is run. Where the output was
   not understood, it was read back rather than assumed.
3. **Steer** — the next prompt carries the error message, not a guess. A commit follows
   every working step, so a bad generation is rolled back rather than debugged.

**The prompts themselves are in the repo** — [`cursor-prompts/`](./cursor-prompts/) holds
one scoped prompt per feature, and [`prompts/`](./prompts/) holds the mandated Meterless
prompt files they bind to. That is the reproducible form of the build: anyone can re-run
a feature from its prompt.

| Run | Feature | Prompt handed to Cursor | Acceptance | Result |
|---|---|---|---|---|
| _(populated during the build window — one row per Cursor run, with the acceptance output)_ | | | | |

### Toolchain check, before the window

The organiser's own build check — *Cursor creates and runs a file, no API key* — was
passed first, so the build layer was known-good before any feature was started:

```
$ cursor-agent -p "Create a file hello.ts ... and then run it with bun" --model auto --force
Created `hello.ts` and ran it with bun. Output:
hello from cursor
```

Two engine prompts were then **rehearsed on throwaway copies outside this repo**, to
prove the prompt library is sound before the clock started. A rehearsal is not the
build: the shipped code is authored inside the build window, here, in this repo.

| Rehearsal | Feature | Acceptance | Result |
|---|---|---|---|
| pre-window | our H-MEM implementation | H-MEM conformance | **13/13 passed** |
| pre-window | our World Model implementation | World Model conformance | **8/8 passed** |

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

---

## Sponsor integration

See **[`SPONSORS.md`](./SPONSORS.md)** for the full write-up. Summary:

- **Cursor** — development environment; rules in `.cursor/rules/conquest.mdc`, and the final
  pass over the finished skeleton. **Live.**
- **Meterless** — agent engines. We use **H-MEM** (evidence reconciliation), **World Model**
  (canonical listing/trade event log) and **Markovian** (bounded-context long runs). All three
  are Apache 2.0, run locally with no API keys, and are **gated by Meterless's own
  conformance suites** (verified 13/13, 8/8, 8/8 on our build machine). **Live.**
- **Zetaris** — federated data. The hosted cluster was not provisionable (documented
  deviation); the documented federation pattern is reimplemented natively, with an adapter
  that speaks Zetaris's **published REST contract** (`OpenSqlQuery` → `PageSqlQuery` →
  `CloseSqlQuery`, bearer auth, `X-Org-ID` + `X-Request-ID`). **Declared deviation +
  native build.**
- **NVIDIA** — Nemotron inference, reached **through the Meterless fleet**. Super serves
  the reasoning agents, Nano the high-volume helpers, Ultra the escalation path. We hold no
  NVIDIA account, key or billing; the tier is selected by routing id at runtime. The
  offline and local-runtime fallbacks are real, not stubs.

---

## License & attribution

The federation pattern and client contract used here are modeled on Zetaris's open-source
`getting-started` (Apache 2.0) and `lightning-catalog` (MIT) repositories. No Zetaris source
is vendored or redistributed; any code adapted from those sources retains its license notice.
