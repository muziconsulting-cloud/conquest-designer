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

**opencode authors the implementation, against a spec-first prompt library. Cursor was
unavailable and that is declared, not hidden.**

The organiser's Module 3 is *"you must build in Cursor."* We could not: the account's
monthly limit was spent, the API key's **weekly** limit was reached inside the window
and does not reset until after the deadline, and the sponsor credit was never
provisioned to us. The build therefore ran here, against the same scoped prompts, with
the same house rules and the same per-step acceptance gates.

**The rule that matters now: the prompts are the specification.** Every step in
`cursor-prompts/` carries the feature **and** its acceptance gate, so:

1. Implement the step against its prompt.
2. Run the step's acceptance gate from the prompt. Fix the implementation, never the gate.
3. Commit the step, with the prompt file named in the message.

**If the sponsor credit is provisioned before the deadline, the prompts get replayed in
Cursor** — `cursor-agent -p "$(cat cursor-prompts/p<N>-<name>.md)" --model auto --force
--trust --output-format json > logs/p<N>.json 2> logs/p<N>.err` — and the repo becomes a
genuine Cursor-built project. The build is written to be replayable; nothing in it
depends on the tool that wrote it.

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
- `cursor-prompts/p0…p11` — the **12** scoped build prompts. **They are the
  specification**: each one carries the feature and its acceptance gate, so the build is
  reproducible from them — in Cursor, or in any tool.
- `POST /run` — the **programmatic entry point**, specified in `p0` and implemented in
  `src/server.ts`. A judge must be able to run the system without clicking anything.
  The request/response contract is fixed: `request_id`, `user_query`, `context` in;
  `trace_id`, `status`, `agents_used`, `result`, `collaboration`, `log_path` out.
- The **JSONL trace schema** — fixed in `p0`: `timestamp`, `trace_id`, `agent_name`,
  `action`, `input_summary`, `output_summary`, `target_agent`, `confidence`,
  `retry_count`, `status` alongside the internal `AuditRecord` fields. `target_agent` is
  set on every handoff. A judge reads this file to see the collaboration.
- `src/escrow/index.ts` — the 2-of-2 escrow. One escrow, in-repo. The **settle**
  transition is the only transition that may issue a certificate.
- `src/listing/` — the self-listing protocol (P8). `register.ts` (the human registration
  and the 402), `token.ts` (the single-use listing token), `payment.ts` (the x402-shaped
  request/verify pair and the **local facilitator stub**), `self-list.ts` (the agent's own
  listing path, through the ordinary pipeline). **Pay once, list once**: the token is
  consumed on redemption, it grants the right to list and never value, and the agent's
  declared price is a claim that the same critic judges. The facilitator is stubbed
  locally and must be described as such, in plain words, wherever it is mentioned.
- `src/avc/certificate.ts` · `sign.ts` · `verify.ts` · `store.ts` — the certificate.
  **Issue only on `settled`**; the certificate carries **exactly three facts** (who /
  what was paid / what it bought) and never a valuation, a score or a token; the id is
  **content-derived**; the signature is **detached** and verifies **without the issuer**;
  the signing key comes from `Bun.env` (`AVC_PRIVATE_KEY`, `AVC_PUBLIC_KEY`) and **there
  is no default key** — a missing key fails loudly. Never log a key, never write one to
  disk, never inline one in the source.
- `p11` is **not optional**: three real output examples, the anti-hardcode audit, the
  documentation audit, and the clean-clone proof. Never cut it.
- `.cursor/rules/conquest.mdc` — the authoritative code-quality contract (no new deps,
  no invented APIs, bound every loop, whole-rand only, secrets from `Bun.env` only,
  never weaken an assertion). It governs every step of this build, whichever tool
  writes it, and it is what a Cursor replay would load automatically.

## 4 · The three engines (Meterless) and their roles

| Engine | Role in the product | Conformance target |
|---|---|---|
| **H-MEM** (hierarchical memory) | Evidence Reconciler (stores every observation, recalls the candidates for a field, cites the memory ids the answer stands on) + Conflict Critic (teaches the engine what survived the challenge) | **13/13** |
| **World Model** | Canonical listing/trade event log + audit — the Listing Closer writes the record, the Telemetry Auditor writes the decision and the escalation | **8/8** |
| **Markovian** | Volume Planner — the bounded expansion of the pull plan, with the carryover carrying the plan forward | **8/8** |

**The seam rule (P4/P5):** the engines **store, retrieve, cite, record and learn — they
never decide.** The exchange rule stays authoritative; the engine's ranking only chooses
which candidates are worth arguing about. `src/engines/session.ts` is the one seam: one
session per run, carrying the three engines. The H-MEM clock is **fixed**
(`MEMORY_EPOCH`) so the memory ids stay deterministic between runs; the World Model and
Markovian carry the wall clock, so their run ids and timestamps move (the determinism
gate strips those fields and nothing else).

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
- **x402 (payment rail):** the listing fee is collected over an **x402-shaped** request
  and response — a real `402`, the challenge in the headers, a signed payment, a
  verification step. The **facilitator is a local stub**: it verifies the request shape
  and the Ed25519 signature in process, and contacts no chain, no provider and no
  payment API. No money moves, no key of ours is held, and no receipt secret is ever
  logged. There is **no live x402 rail** — say so wherever the payment path is described.

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
src/listing/              the self-listing protocol: register, token, payment, self-list
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

- **The build layer is opencode, not Cursor** — a declared deviation, stated everywhere
  it matters. Cursor's allowance was exhausted for the whole window (account monthly
  limit spent; API-key weekly limit reached inside the window, resetting after the
  deadline; sponsor credit never provisioned). The build is **spec-first** against the
  twelve scoped prompts in `cursor-prompts/`, each carrying its acceptance gate, with
  `.cursor/rules/conquest.mdc` governing every step. Replayable in Cursor if credit lands.
- **P0 is done and green.** The listing swarm runs end to end: `src/tracer.ts`,
  `src/orchestrator/`, `src/agents/` (the five roles, with real logic), `src/engine/`
  (registry + Meterless HTTP adapter + the deterministic offline renderer),
  `src/loading.ts`, `src/index.ts`, `src/server.ts`, `data/sources.json`, and the three
  scripts. Gates run and passing: `bunx tsc --noEmit`; `bun run swarm` (4 lines, the 4
  fixture paths); `--input` capture → `output_examples/`; `POST /run` → the full
  contract;   `scripts/verify-paths.ts` PASS; `scripts/recon.ts` PASS; two runs
  **decision-identical** (`bun run determinism` — timestamps, the trace id and the
  Markovian run uuid are the only fields that move).
- **The rule that makes it work:** the owner's declaration is the claim, never the
  evidence. Only independent sources resolve a field, so a claim can be contradicted —
  which is the only reason the hold exists.
- **Cursor's aborted P0 stubs were removed** (`src/pipeline.ts`, `src/agents/types.ts`,
  `src/llm/offline.ts`) — `src/agents/types.ts` read the answer straight out of the
  fixture's `expectedPath` field, which is the exact hardcoded answer the P11 audit
  hunts.
- **Two rehearsals ran on throwaway copies outside the repo** (P1 → 13/13, P2 → 8/8, both
  `tsc` clean) — proof the prompts work, and the source of the P3 rewrite. Pre-window,
  discarded, **not in the repository**; disclosed in `PRE-EXISTING.md` and the README.
- **P1–P3 are done: the three Meterless engines, written from the sponsors' contracts**
  in `src/engines/{hmem,world-model,markovian}/`. `bun run scripts/conformance.ts` runs
  each sponsor's suite against **our** module: **H-MEM 13/13, World Model 8/8,
  Markovian 8/8** — recorded in `evidence/conformance-ours.txt`. The sponsors' reference
  scores live in a separate file and are never presented as ours.
- **P4/P5 are done: the roles run on the engines.** `src/engines/session.ts` is the one
  seam. The volume planner expands the pull plan on **Markovian** (the buckets are read
  back out of the engine's own output — LST-0003 expands three buckets over two chunks,
  so the carryover is real); the reconciler stores and recalls on **H-MEM** and cites the
  memory ids its answer stands on; the critic teaches **H-MEM** what survived the
  challenge (the value that carried the record is reinforced, the contradicted claim is
  marked `wrong` and flagged for review, an independent loser is marked `not_helpful`);
  the closer writes the canonical record to the **World Model** and the auditor writes
  the decision and the escalation onto it. Every engine touch is in the trace under
  `detail.engine`. The engines never decide — the exchange rule stays authoritative.
- **`bun run determinism` is a gate** (`scripts/determinism.ts`): two runs, compared
  entry by entry. The response is identical, the trace length is identical and every
  trace entry is identical, once the volatile fields are stripped — wall-clock
  timestamps, the trace id/path, and the Markovian engine's random run uuid. Decisions,
  reconciled values, content ids, memory ids, entity ids and event ids are stable.

**Next move:** P10 (the LLM seam's hosted path) → **P11** → the two artifacts, one step at a
time, with the RUNBOOK's gates.

**Done so far:** P0 (the swarm) · P1–P3 (the three engines, written from the sponsors'
contracts, green on their own suites) · P4/P5 (the roles on the engines, one seam) ·
P6 (the Zetaris client against the published REST contract) · P7 (the money path: the
2-of-2 escrow, and the AVC issued only on `settled`, verifiable from its signed bytes) ·
**P8 (the self-listing protocol: a real 402, a locally stubbed facilitator that verifies
the request shape and the signature, a single-use listing token, and the agent declaring
its own price through the ordinary pipeline — where the critic can hold it)** ·
**P9 (the operator surface: server-rendered HTML on the same server, no framework, no
build step, no dependency — the listings, one listing in full with its critique and its
trace, the agents, the trace, and the certificate with a live verify; a held listing is
shown as held, and a certificate that was never issued says so)**.
**Still not built:** the hosted LLM path (P10), and the two artifacts
(`DECK.pdf`, `demo/demo.mp4`). P11 is the submission-integrity step: three real output
examples, the anti-hardcode audit, the documentation audit and the clean-clone proof —
and the regeneration of the real `DECK.md` and `DEMO.md`.

**The organiser's own final checklist, answered line by line:**
[`docs/COMPLIANCE-MAP.md`](./docs/COMPLIANCE-MAP.md) — including the four declared
deviations (Bun instead of Python, no Dockerfile, the Zetaris local protocol-compatible
server, and the build layer) and the reason for each.
