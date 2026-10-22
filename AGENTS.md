# AGENTS.md — Conquest (the agent exchange)

**Open Agent Hackathon 2026 · Track 1 "Solving Fragmented Intelligence"**
Repository: `https://github.com/muziconsulting-cloud/conquest-designer` · window: **2026-10-22T00:00Z → 2026-10-27T23:45Z**

This file is the operating context for any agent working in this repository. It overrides
generic assumptions about frameworks, build steps, or tooling. Read it first.

## 0 · Anti-hallucination facts (non-negotiable)

- **There is NO build step.** Bun executes TypeScript directly. No `tsc` emit, no bundler,
  no webpack/vite, no framework, no CDN tags. `bunx tsc --noEmit` is a **typecheck only**.
- **There are NO test files and NO test runner.** The Meterless **conformance runner is the
  suite** (`vendor/meterless/<engine>/conformance/runner.ts`). Do not create `*.test.ts`.
- **There is NO Python.** The retired `tools/` python helper is gone; do not reintroduce it.
- **There is NO Docker, no containers, no registry.**
- **There is NO live Zetaris instance** and no live Meterless provider (see §6 — both are
  declared deviations with a local protocol-compatible path).

## 1 · The build mode — this is the rule that decides the whole session

**Cursor authors every qualifying line of code. opencode is the reviewer and steerer.**

The organiser's Module 3 is *"you must build in Cursor."* That governs the **build
layer**; the product stack is free (any language, framework, model, cloud). So:

1. One scoped prompt per run: `cursor-agent -p "$(cat cursor-prompts/p<N>-<name>.md)" --model auto --force --trust --output-format json > logs/p<N>.json 2> logs/p<N>.err`
2. Read the diff. Run the step's acceptance gate. Fix by **steering** (a follow-up prompt
   through the same session), not by hand-writing the implementation.
3. Commit. Move to the next step.

**Exception (the only one):** the review, the steering, the acceptance gate, the git
history and the documentation are opencode's work. A prompt file, a rule file, a doc or a
commit message is not "the implementation" — writing those by hand is correct and
expected.

The full execution plan — order, gates, credit cut-order, honesty rules — is
[`cursor-prompts/RUNBOOK.md`](./cursor-prompts/RUNBOOK.md). **Read it before firing P0.**

## 2 · The product (one paragraph)

Conquest is **the exchange where agents get priced and traded**. A human registers and
pays once (x402, inbound) for a **listing**; the agent then **lists itself** and declares
its own price. The listing goes through an evidence pipeline — a price the reconciled
evidence does not support is **held, not published** — and a buyer purchases it through a
2-of-2 **escrow**. On settlement the escrow releases and an **Agentic Valuation
Certificate** is issued. The certificate states exactly three facts: **who** (agentic
identity), **what was paid** (amount, currency, payment ref), **what it bought** (the
listing/access term). It is **not a valuation** and **not a token**. The escrow is
implemented **in this repository** — there is no pre-existing settlement API to call.
Full spec: [`docs/AVC-SPEC.md`](./docs/AVC-SPEC.md).

## 3 · The rails you may not bypass or reimplement

- `src/types.ts` — the shared contracts. **Do not reshape them** without instruction.
- `src/llm/port.ts` — **one** LLM port. Adapters hang off it; do not add a second seam.
- `src/zetaris/adapter.ts` — the Zetaris adapter. One adapter; no parallel client.
- `prompts/` — the mandated Meterless prompt library, bound by `@filename`. Use these
  prompts; do not paraphrase the prompt library into your own text.
- `cursor-prompts/p0…p11` — the **12** scoped build prompts. **The build is reproducible
  from them** — that is the proof the work was done in Cursor.
- `POST /run` — the **programmatic entry point**, specified in `p0` and implemented in
  `src/server.ts`. A judge must be able to run the system without clicking anything.
  The request/response contract is fixed: `request_id`, `user_query`, `context` in;
  `trace_id`, `status`, `agents_used`, `result`, `collaboration`, `log_path` out.
- The **JSONL trace schema** — fixed in `p0`: `timestamp`, `trace_id`, `agent_name`,
  `action`, `input_summary`, `output_summary`, `target_agent`, `confidence`,
  `retry_count`, `status` alongside the internal `AuditRecord` fields. `target_agent` is
  set on every handoff. A judge reads this file to see the collaboration.
- `p11` is **not optional**: three real output examples, the anti-hardcode audit, the
  documentation audit, and the clean-clone proof. Never cut it.
- `.cursor/rules/conquest.mdc` — auto-loaded by Cursor on every run. It is the
  authoritative code-quality contract (no new deps, no invented APIs, bound every loop,
  whole-rand only, secrets from `Bun.env` only, never weaken an assertion).

## 4 · The three engines (Meterless) and their roles

| Engine | Role in the product | Conformance target |
|---|---|---|
| **H-MEM** (hierarchical memory) | Evidence Reconciler + Conflict Critic — every recall cites its memory/entity id | **13/13** |
| **World Model** | Canonical listing/trade event log + audit — stable ids, provenance, bitemporal edges | **8/8** |
| **Markovian** | Volume Planner + bounded long runs — **three-way overlap contract** (implement passes, reject passes, accept-and-ignore FAILS) | **8/8** |

Specs are **degit'd at build time** into gitignored `vendor/`:
`npx degit meterless/meterless/engines/hmem vendor/meterless/hmem` (and
`world-model`, `markovian`). **Implement from `AGENTS.md` inside each spec**; the
reference implementation may be read but must **not** be vendored into the repo. Apache-2.0
is attributed in [`SPONSORS.md`](./SPONSORS.md).

## 5 · The swarm

Five agents: **volume-planner → evidence-reconciler → listing-closer ⇄ conflict-critic →
telemetry-auditor**. Two loops, **one** escalation (max once), **one** bounded
deterministic fallback that is marked in the trace. One JSONL trace entry per agent step.
Every recall cites its source. The orchestrator is `src/` code (P5) and the agents are P4.

## 6 · The sponsor integrations — and the honest gaps

- **Zetaris (mandatory):** the adapter speaks the **published REST contract** —
  `OpenSqlQuery` `{"select","pageLimit":1-100}` → `PageSqlQuery` (returned
  `queryToken`) → `CloseSqlQuery`; `Authorization: Bearer <idToken>`,
  `X-Org-ID: <numeric>`, `X-Request-ID: <uuid v4>`; **close the query on the error path
  too**. The demo runs the identical client against a **local protocol-compatible
  server** (the stub lives on the server side only); the same command runs against a live
  instance by changing one env var. **No live instance is reachable** — no Docker, 1.8 GB
  RAM against an 8 GB requirement, and the cloud stack is stalled at billing. This is a
  **declared deviation**, stated plainly in `SUBMISSION.md`.
- **Meterless (mandatory):** the **engines are live and verified** in this repo. The
  *hosted provider* and the **NVIDIA Nemotron** routing id are **not** issued yet.
  The LLM seam has three adapters: hosted provider / local Meterless Runtime /
  deterministic offline `SAMPLE_MODE`. **Never claim Nemotron unless a recorded run names
  the routing id.** NVIDIA's contribution is reached **through the Meterless fleet** —
  there is no NVIDIA account, key or billing in our path.
- **NVIDIA:** the contribution is the hosted Meterless fleet's model routing. Declare it
  as *not yet exercised* until a run proves it.

## 7 · The honesty rules (the thing that will be judged)

- **Never claim what did not run.** If the Zetaris instance was not live, the demo says
  it is running the local protocol-compatible server.
- **Never claim Cursor credit we did not get.** `evidence/` holds the organiser's build
  check transcript and the usage records; the quota limit is written down in
  `evidence/quota-note.md` rather than hidden.
- **A held listing is a success, not a failure** — say so in the demo.
- **Every score cites the artifact it rests on.** See [`docs/BUILD-LEDGER.md`](./docs/BUILD-LEDGER.md).
- The pre-existing platform is **declared, not shipped**: [`PRE-EXISTING.md`](./PRE-EXISTING.md).
  Its private derivation is **not** in this repository and must never be added.

## 8 · Git discipline

- Work on `master`. `pre-window-scaffold` is the **declared pre-existing boundary**;
  `git diff pre-window-scaffold..HEAD` is the build. Never move that tag.
- One commit per build step, message naming the step (`p3: …`). Reference the Cursor
  session id in the body.
- **Never push without the owner's explicit go-ahead.** The remote is
  `origin` = `https://github.com/muziconsulting-cloud/conquest-designer.git`.
- Never commit `.env`, keys or tokens. `.env.example` documents the names only.

## 9 · The pre-existing platform (read-only, external)

`/home/wardair/thegearmerchant` is the **live production** platform (PM2, nginx, shared
database). It is the declared pre-existing component. It is **read-only** for this
submission: read it for reference, **never write to it, never run its server, never
deploy it.** Nothing private from it may be copied into this repository (see
[`docs/README.md`](./docs/README.md) for what is withheld and why).

## 10 · Where things are

```
src/types.ts              shared contracts (types only)
src/llm/port.ts           the one LLM port
src/zetaris/adapter.ts    the Zetaris adapter
src/README.md             what goes in src/ and in what order
prompts/                  mandated Meterless prompt library (9 files, @filename-bound)
cursor-prompts/           11 scoped Cursor prompts + README + RUNBOOK
fixtures/listing-set.json the four fixture paths: accept / revise / hold / fallback
evidence/                 the build evidence, published
docs/                     AVC-SPEC, BUILD-LEDGER, COMPLIANCE-MAP, docs/README
input_examples/           three request files, three different paths
output_examples/          three REAL responses, captured from runs
data/                     the sample source records the offline adapter reads
logs/                     Cursor run transcripts (.jsonl ignored)
tools/hackathon-compliance/  the gate + deliverable monitor
README.md SPONSORS.md metadata.json  the front door
PRE-EXISTING.md SUBMISSION.md               the declarations and the submission text
docs/DECK-draft.md docs/DEMO-draft.md  PROVISIONAL plans for the two artifacts
DECK.md DEMO.md            GENERATED POST-BUILD from the running app (p11)
```

## 11 · Current state (2026-10-22, live)

- **Cursor is authenticated** (`muziconsulting@gmail.com`) and the organiser's build
  check **passed** (`evidence/check-2-cursor.txt`).
- **The Cursor free-tier quota is exhausted** and the account is on the **Free** plan, so
  named models are refused. The **sponsor credit is not yet live** — the organiser's
  Cursor access instructions are still marked TBC. **The build is blocked on Cursor
  capacity** — see `evidence/quota-note.md` for the options (sponsor credit on HackOS /
  Cursor Plus $8mo / the free-tier monthly reset).
- **Two rehearsals ran on throwaway copies outside the repo** (P1 → 13/13, P2 → 8/8, both
  `tsc` clean) — proof the prompts work, and the source of the P3 rewrite.
- **No implementation exists in `src/` yet** — everything there is contracts and
  interfaces. `git diff pre-window-scaffold..HEAD` is the honest build: so far, evidence,
  docs and rules.

**Next move:** as soon as Cursor capacity exists, fire P0 → P1 → P2 → P3 (the three
engines to 13/13, 8/8, 8/8) → P4 → P5 → P6 → P7 → P8 → P9 → P10 → **P11**, one step at a
time, with the RUNBOOK's gates. P11 is the submission-integrity step: three real output
examples, the anti-hardcode audit, the documentation audit and the clean-clone proof.

**If capacity does not arrive:** the fallback order is in the RUNBOOK, and the **honest
ledger** gets updated either way. But check one thing first — the organiser's guide says
the Cursor credit is activated *"using the instructions in the Space XAI and Cursor
folder in Resources on HackOS"*. That folder is where the credit lands, and it is
cheaper than a paid plan.

**The organiser's own final checklist, answered line by line:**
[`docs/COMPLIANCE-MAP.md`](./docs/COMPLIANCE-MAP.md) — including the three declared
deviations (Bun instead of Python, no Dockerfile, the Zetaris local protocol-compatible
server) and the reason for each.
