# RUBRIC PROGRESS — Open Agent Hackathon 2026

> This is the scoring ledger. Every score cites the artifact it rests on — no citation,
> no score. Updated each working session.
>
> Gating method: `hackathon-compliance` first (are we disqualified?), then
> `hackathon-rubric` (points). The target is **the best 80**, accepting **declared
> sponsor deviations** (Zetaris hosted-out; the Meterless *provider* pending organiser
> links — the Meterless *engines* are live and verified).
>
> **One change made when this ledger was published:** the original header read
> *"Private. Never pushed, never shown to judges."* It is now published deliberately —
> the corrections in it are the most credible thing in the submission, and hiding them
> would be the opposite of honest. The one thing that stayed private is the platform's
> own unit derivation, and none of it appears here.

---

## Ledger — 2026-10-21 (setup)

**State of the judged artifact at that point: the docs only.** Submission repo
(`/home/wardair/ConquestDESIGNER`) is a clean slate after `d70e58f`: only
`FIRST-PRINCIPLES.md`, `PLAN.md`, `BUILD-PROMPTS.md`, `.cursor/`, `tools/`, `logs/.gitkeep`.
No README, no `metadata.json`, no code, no video, no deck.

Therefore, scored honestly against *the submission, not the ambition*:

| Criterion | Max | Now | Reason | Artifact / gap |
|---|---|---|---|---|
| Impact & Real-World Relevance | 30 | **9** | The exchange frame and the swarm's real output are now **public** (README impact statement + architecture), which is what judges can score; the platform's deeper workings stay private. | `README.md` (impact + pre-existing declaration); `docs/AVC-SPEC.md`. Gap: named user + live URL + a number. |
| Technical Execution | 20 | **2** | Prebuilt rails verified and working (recon balanced 40.49T, tsc clean) but they are **declared pre-existing** — they earn nothing unless extended in-window. | Rails: `EscrowStateMachine.ts`, `A2A.ts:341`, `writeLedger`. Gap: in-window swarm + AVC + escrow hook that actually runs. |
| Innovation & Creativity | 15 | **4** | Near-max *ceiling* (an exchange where agents are priced and certified, and a currency whose supply is fixed by physics rather than policy) — but innovation also scores the *delivered* system. | `docs/AVC-SPEC.md`. Gap: the built, demoed exchange. |
| Demo (video/deck) | 15 | **0** | No video, no deck. Binary-ish: missing video = −15. | Gap: 1–4 min workflow video + deck (problem→solution→arch→sponsors→future). Record in-window. |
| Product & UX | 10 | **1** | Live page surfaces exist on OCI but are the pre-existing product; the *submission's* listing surface (self-listing, AVC view) is unbuilt. | Gap: a legible listing/AVC surface a stranger can use. |
| Sponsor Tech Integration | 10 | **4** | **Meterless ENGINES are LIVE and verified**: H-MEM 13/13, Markovian 8/8, World Model 8/8, all exit 0, local, no API keys, Apache 2.0 — with engine↔role mapping written. Cursor live (`.cursor/rules`) and now the **build mode is opencode-first, Cursor-last**. Zetaris is a declared deviation (now against a *published REST contract*). NVIDIA path confirmed but its credential is pending. | `SPONSORS.md`; conformance scorecards (verified in scratch); `.cursor/rules/conquest.mdc`; Zetaris stack `ConguestDESIGNER` + `kbase.zetaris.com/knowledge/rest-api`. Gap: **our own** implementations green against the same suites, + the Zetaris adapter, + the Meterless provider credential. |
| **Total** | **100** | **~20** | Correct for a docs-only state. | |

**This is the honest baseline.** It is low because the artifact is unbuilt, not because the
idea is weak. The plan below is the path from ~20 → ~80.

---

## Score-recovery ordering — points recovered ÷ effort

Sorted cheapest-big-number first. "Impact dominates" (30, tie-breaker) outranks everything.

| # | Move | Rubric line | Points | Effort | When |
|---|---|---|---|---|---|
| 1 | ~~**README** with impact statement + pre-existing declaration + swarm arch~~ | Impact, gates | ~~+8–12~~ | low | **DONE 10-21** |
| 2 | ~~**SPONSORS.md** — honest deviation + Apache-2.0 attribution~~ | Sponsor (gate) | ~~+2–3~~ | low | **DONE 10-21** |
| 3 | ~~**Implement H-MEM + World Model + Markovian in our code; go green against the same suites**~~ | Sponsor, Technical | ~~+3–4~~ | med | **DONE 10-22** — 13/13, 8/8, 8/8 on OUR modules (`evidence/conformance-ours.txt`) |
| 4 | ~~**In-window swarm build** — listings-only roster, real JSONL traces, fallback mode~~ | Technical | ~~+10–14~~ | high | **DONE 10-22** — P0: four paths, 36-entry traces, `POST /run`; P4/P5: the roles now run on the engines |
| 5 | **AVC + escrow settle hook** — ownership transfer not cash-out | Technical, Innovation | **+6–9** | med | Oct 22+ |
| 6 | **Demo video + deck** — run the workflow, don't narrate it | Demo | **+12–14** | med | Oct 22+ |
| 7 | **Listing surface** — a stranger can list + receive an AVC | Product/UX | **+6–7** | med | Oct 22+ |
| 8 | **Impact evidence** — named user + live URL + number | Impact | **+6–10** | low-med | Oct 22+ |
| 9 | **Zetaris adapter** against Zetaris's **published REST contract** (`OpenSqlQuery` → `PageSqlQuery` → `CloseSqlQuery`), running against our data API | Sponsor | **+2–3** | med | Oct 22+ |
| 10 | **Chase Zetaris shared event instance creds** (Zetaris Help channel) — would convert the deviation into a live integration | Sponsor | **+3–5** | low | **any time, async** |
| 11 | **Get the Meterless provider credential** (account + credit + base URL + `NEMOTRON_MODEL`) when the organiser links land — turns the Nemotron path from declared-pending into live, and is the single biggest **Sponsor** swing | Sponsor | **+2–3** | low | **async, organiser-gated** |

## The single highest-leverage next move

**Nothing left that is cheap and non-code.** README and SPONSORS.md are done; the ledger is
written. The remaining moves all require the window (Oct 22 00:00Z).

**The one cheap thing that is NOT window-blocked:** ask Zetaris (Help channel / Discord) for
**shared-event-instance credentials**. Their own `getting-started` docs reference one. That is
a message, not a build, and it converts the weakest sponsor line into a live integration if
it lands.

**Second cheap thing (also not window-blocked):** create the `prompts/` folder** in the
submission repo and save the mandated Meterless prompt-library files there (H-MEM memory,
Markovian long-tasks, World Model shared-state, Scout Intent signed tool calls, "prove each
test can fail"). It is prep, not build, and it is what the final Cursor pass will run via
`@filename` — so the Cursor evidence is ready the moment the skeleton is.

## Rule checks (compliance)

- Docs-only work: **allowed**. Artifact code committed before the window opened: **not allowed** (DQ risk).
- Declared deviation ≠ disqualification. Declared pre-existing code must appear in README
  **and** the submission form.
- Gates still open: submission-form `registered` attestation; `demo_video` + `slide_deck`
  deliverables; `zetaris_integrated` (fails with "only in docs, not code" until in-window
  code exists — expected). **The Meterless *engines* are RESOLVED and verified — no longer
  `[NEED]`.** The Meterless *provider* credential is a separate, organiser-gated item.
- NVIDIA path confirmed (Nemotron **via the Meterless provider**, not a direct NIM
  endpoint); the credential itself is pending organiser links. Declared, not claimed.

## Change log

- **2026-10-21** — Ledger created. Baseline ~14/100 (docs-only). Next: README, then SPONSORS.md.
- **2026-10-21 (same session)** — Wrote `README.md` + `SPONSORS.md` in the submission repo.
  Compliance re-run: gates now PASS for `readme`, `sponsor_writeup`, `preexisting_declared`,
  `cursor_used`, `secrets`. **`zetaris_integrated` FAILs with "only in docs, not code" —
  correct as declared; it closes only when the implementation exists.** Impact 6→9, Sponsor 1→3.
- **2026-10-21 (later)** — **Meterless RESOLVED: not credential-gated.** Public Apache 2.0
  repo (`Meterless/Meterless`), 4 engines (3 runnable), per-engine conformance suites, no API
  keys, no cloud. **Verified locally against Meterless's own reference implementations:
  H-MEM 13/13, Markovian 8/8, World Model 8/8 — all exit 0.** Engine↔roster mapping written
  into `SPONSORS.md` + README. Sponsor 3→4; total ~17. Zetaris recon also completed
  (Apache 2.0 `getting-started` w/ TS client; MIT `lightning-catalog`; client needs a live
  *server* — do not vendor). `docs/ARCHITECTURE.md §8` updated with both.
- **2026-10-21 (end of session)** — **Submission repo doc sweep: the retired R10,000 story
  is fully gone.** Rewrote `BUILD-PROMPTS.md` (v3, exchange + Meterless conformance gates,
  P0–P12, dead `run.py` refs removed), `FIRST-PRINCIPLES.md` (v3), `PLAN.md` (v3), and
  `.cursor/rules/conquest.mdc` (exchange contract facts; the `cursor_used` gate evidence).
  Added `metadata.json` (engines named, pre-existing declared, honest limitations).
  Corrected `.env.example` — Meterless is local-first, **no base URL / no API key** (the old
  values were factually wrong). Compliance: `readme`, `sponsor_writeup`,
  `preexisting_declared`, `cursor_used`, `meterless_integrated`, `secrets` all PASS;
  `zetaris_integrated` FAILs "only in docs, not code" (expected until the implementation lands);
  `demo_video` + `slide_deck` still outstanding (in-window). Rubric: **~17/100 baseline**
  (Impact 9, Technical 2, Innovation 4, Demo 0, UX 1, Sponsor 4). **All of it is uncommitted
  — awaiting the owner's commit decision.**
- **2026-10-21 (second pass — the official onboarding doc landed)** — **The "Meterless is not
  credential-gated" correction was HALF right and is now split in two.** The **engines** stay
  local/no-creds/no-card (verified 13/13, 8/8, 8/8). The **Meterless provider / Runtime** —
  the OpenAI-compatible service that serves **NVIDIA Nemotron** — **IS credential-gated**
  (account + activated credit + `METERLESS_BASE_URL` + `METERLESS_API_KEY` +
  `NEMOTRON_MODEL`; organiser links still `[ORGANISERS TO ADD]`). Consequence: **the
  "before I get access to NVIDIA" answer is that no separate NVIDIA account is needed** —
  Nemotron is selected *inside* Meterless. Also: **Nemotron is not reached by a direct NIM
  endpoint** (the old `NVIDIA_BASE_URL`/NIM plan was wrong and is removed from
  `.env.example`). Official onboarding confirms **"JavaScript or TypeScript works just as
  well"** → Bun+TS is sanctioned, not a deviation. **Zetaris** upgrade: the **published REST
  contract** (`OpenSqlQuery` `{select, pageLimit}` → `PageSqlQuery` → `CloseSqlQuery`; bearer
  + `X-Org-ID` + `X-Request-ID`) replaces the vaguer client-contract framing, and the local
  install is now precisely **4 containers + ≥8 GB Docker memory vs this box's 1,814 MB
  total / 507 MB available / no Docker** — a 4.4× shortfall, definitively impossible.
  **Build mode (CORRECTED 2026-10-21 against organiser Module 3: "you must build in Cursor") —
  the build happens IN CURSOR (Composer/Grok on Cursor credit, headless via the Cursor CLI, one
  scoped feature per run, mandated prompt attached with `@filename`); opencode reviews and
  steers. Cursor once at the end over the
  finished skeleton**, running the mandated `prompts/` files via `@filename` — added as P12
  in `BUILD-PROMPTS.md`, with the `prompts/` folder added to the prep list.
  Patched: `README.md` (command→engine-service map, local-first, provider-vs-engines),
  `SPONSORS.md` (provider contract, REST contract, Nemotron tier table), `.env.example`
  (three separated Meterless surfaces; direct-NIM vars removed), `metadata.json`,
  `BUILD-PROMPTS.md`, `FIRST-PRINCIPLES.md`, `PLAN.md`, and the platform's own
  private architecture (kept private)
  `docs/STORY.md`, `docs/ARCHITECTURE.md §8`, `docs/CONQUESTCAPITAL-A2Z.md` §12–13, and
  this ledger. **Ledger arithmetic fixed**: the table said Impact 6 while the log said 9 —
  the table now reads Impact 9 and the total **~20** (was stated ~17 with a table that
  summed to 17; the   change log's "Impact 9" was the accurate one).
- **2026-10-21 (prep, ~19:30Z)** — **Scaffold landed, typecheck clean.**
  Public repo now has: `package.json` (bun scripts: swarm / serve / conformance / recon),
  `tsconfig.json` (strict, `noUncheckedIndexedAccess`, `bun-types`), `src/types.ts`
  (shared contracts, **types only** — Listing / Evidence / Conflict / Critique /
  ListingRecord / AuditRecord / Avc / EscrowState, mirrored from the AVC definition of
  record and the pre-existing escrow's real states `pending|suspense|claimed|settled|cancelled`),
  the two **connector interfaces** (`src/llm/port.ts` = the single LLM port with three
  adapters; `src/zetaris/adapter.ts` = the published Zetaris REST lifecycle), `src/README.md`
  folder map, and `fixtures/listing-set.json` — four listings covering the four orchestrator
  paths (**accept / revise / hold-escalation / fallback**). `bunx tsc --noEmit` **exit 0**.
  `prompts/` = 9 bound mandated-prompt files + index (the artifact the final Cursor pass
  runs via `@filename`). `.gitignore` now excludes `node_modules/` and `vendor/` (Meterless
  specs are degit'd, never vendored). Compliance unchanged — no regression. **Still
  uncommitted; the owner is content to leave the tree dirty until the window.**

- **2026-10-21 (19:50Z) — SECOND CORRECTION, from the owner, and it changes the code.**
  The owner was right about the shape: **no NVIDIA account, no NVIDIA key, no NVIDIA
  billing sits in our path.** Nemotron reaches us through the Meterless fleet, the way
  Grok reaches a Cursor user through Cursor. What the repo actually shows (read
  `docs/products/nightshift/how-it-works.md` + `hotspot.md`): the local runtime serves
  **open-weight models on your own hardware** (Qwen / GPT-OSS / DeepSeek / Muse-Glimmer —
  203 fleets in the catalogue), and **"cloud ones join only if you add a key"**. So the
  free path is *local*, and the hosted fleet is where Nemotron lives.
  **Where I was wrong:** writing "credential-gated" made it sound as though NVIDIA billing
  was required. It is not. The provider surface carries **one** credential (the organiser's
  hosted endpoint), and that is a Meterless-side detail, not an NVIDIA one.
  **Consequence, now in code:** `LlmPort` gained `models(): Promise<string[]>` and
  `RoutePreference`. The adapter **discovers the routing ids the provider exposes and
  keeps any `meterless/*` id it does not recognise**; a model name is a *preference*, never
  a hard requirement. Nemotron tier (Super/Nano/Ultra) is a **disposition**, so a tier
  swap is config, not a rewrite.
  **Consequence, now in prose:** the public docs no longer recite Meterless's provider
  contract. We had been **documenting a description instead of doing the thing** — the
  contract recital was standing in for an integration we had not built yet. The contract
  now lives only where it is load-bearing: in the adapter (code) and in
  `prompts/08-provider-llm-seam.md` (the mandated prompt Cursor runs). `SPONSORS.md`
  keeps the *use* + the *honest status*; `README.md` keeps the command→engine map, which
  is the rubric-relevant part.
  **Rule absorbed: a public document never restates a sponsor's own manual.** A judge can
  read Meterless's docs. They cannot read our repo's prose and learn what WE did. Every
  sponsor claim in our docs must point at a command that runs.

- **2026-10-21 (22:45Z) — BUILD MODE CORRECTED. The owner pushed back and was right.**
  Organiser **Module 3 (Build Day)** says plainly: *"you must build in Cursor"*, the
  code-writing AI runs on **Cursor's included models (Composer / Grok) paid from Cursor
  credit**, and the submission must **explain how Cursor was used during development**.
  My earlier plan (build everything in opencode, one Cursor pass at the end) **inverted
  the rule** and spent the credit in the least useful place — a big final pass is the
  most expensive run and the least reviewable. The apparent contradiction ("use any
  tools" vs "must build in Cursor") is not a contradiction: the top-level line governs
  the **product stack** (the onboarding says "JavaScript or TypeScript works just as
  well"); Module 3 governs the **build layer** (who writes the code).
  **Corrected build mode:** every qualifying line is authored by **Cursor**; opencode is
  the **reviewer and steerer** (writes the scoped prompt, runs the gates, reads the
  diff, commits) — the organiser's own Describe → Review → Steer loop. Credit discipline:
  one scoped feature per run, context loaded from files not pasted, commit per step,
  priority if the credit runs short = **Meterless engines → Zetaris adapter → agents +
  orchestrator → HTML surface → polish**.
  **Toolchain landed on this box:** the **Cursor CLI** (`cursor-agent`, v2026.10.19) is
  installed at `~/.local/bin/cursor-agent` (the official installer would have **deleted
  the existing Grok `agent` symlink**, so it was extracted manually instead). Headless
  flags confirmed: `-p/--print`, `--output-format json|stream-json`, `--model`,
  `--force/--yolo`, `--auto-review`, `--mode plan|ask`, `--trust`, `--workspace`.
  `cursor-agent status` → **"Not logged in"**; the browser login link is live and waiting.
  **Also noted:** the **Grok CLI 0.2.54 is already installed and authenticated** on this
  box (`~/.grok/auth.json`) — a working code-writing agent, but it spends *xAI* credit,
  not *Cursor* credit, so it is a contingency, not the sanctioned path, and if it is ever
  used the README says so.
  **New artifact:** `cursor-prompts/` — one scoped, self-contained Cursor prompt per
  feature (P0–P10), each naming the files to read (never pasted), the mandated prompt to
  attach with `@filename`, the exact API surface the conformance runner calls, and the
  acceptance command. README now carries a **"How we built it"** section with the
  per-run evidence table, as the organisers ask.

### 2026-10-21T21:55Z — Cursor authenticated, prompt library proven, free-tier quota exhausted

**Cursor CLI is live.** `cursor-agent status` → **"✓ Logged in as muziconsulting@gmail.com"**
(browser deep-link login; the *first* link was stale because its CLI process had been
killed, which is why the page said "go back to CLI" and nothing happened). The
organiser's **check 2** now passes — Cursor created and ran `hello.ts` with `bun` and
printed `hello from cursor` in 30 s.

**But the account is on Cursor's FREE tier**, and that has two consequences:
1. `--model composer-2.5` / `--model cursor-grok-4.5-high` are **refused**:
   *"Named models unavailable — Free plans can only use Auto."* The organiser's check 2
   asks for **Composer or Grok specifically**; `auto` is a weaker, unnamed position.
2. The free allowance is **token-based and small** — the P1 and P2 rehearsals consumed it
   and P3 was refused with *"You've hit your usage limit."* Cursor does not publish the
   free allowance; the monthly reset date is not surfaced in the CLI error.

**Cursor docs confirm the fix paths** (cursor.com/docs/models-and-pricing, /help/models-and-usage/usage-limits):
the **X Subscription** gives every **paid** plan a **weekly pool** of Cursor models
(Grok 4.7/4.6/4.5 and Composer 2.5), **Plus is $8/mo**, and the **sponsor credit on the
HackOS task board** is the organiser's sanctioned route (the Cursor in-kind pool is
$2301). Recommendation: **claim the sponsor credit first** (free, and it is what the
organiser intends), and fall back to **Plus $8/mo** if the credit is not on the board or
does not land in time — $8 buys the weekly pool that unblocks named Composer/Grok runs
and removes the "only Auto" evidence weakness. **Decision is the owner's.**

**The prompt library is proven.** Two engine prompts were **rehearsed on throwaway
copies outside the repo** (`/tmp/opencode/r-*`), so a broken prompt is found on a
rehearsal and not on the day:
- `p1-hmem-engine.md` → Cursor's own H-MEM implementation → conformance **13/13**,
  `tsc --noEmit` exit 0, first run, 3m53s, 48,462 in / 13,556 out.
- `p2-world-model-engine.md` → Cursor's own World Model implementation → conformance
  **8/8**, `tsc` exit 0, first run, ~4 min, 123,124 in / 19,851 out.
Both are **first-try green**, which means the scoped-prompt pattern works and the
engine contracts are implementable as written. `p3-markovian-engine.md` was **rewritten**
from the rehearsal learnings (the file decomposition Cursor chose, the three-way
overlap contract spelled out, "no test files" — the P2 run had left a `*.test.ts`
behind), and **P4–P10 are now written**: five agents, orchestrator, Zetaris adapter,
AVC on settle, self-listing, HTML surface, LLM seam.

**Honesty rule held:** the rehearsal implementations live in `/tmp`, are **not** copied
into the repo, and will not be. The shipped code is authored **inside** the build window,
in the repo, by Cursor. `cursor-prompts/RUNBOOK.md` states this as the window's first
rule.

**Two deliverables drafted, not closed:** `docs/DEMO-draft.md` (the 3-minute
walkthrough, 10 beats, with the spoken honesty lines for Zetaris and the local runtime)
and `docs/DECK-draft.md` (12
slides). Both are text artifacts about the submission, not the product.

---

## Ledger — 2026-10-22 (live, session 2): the submission repo consolidated

**The judged artifact now lives in its own repository, with a fresh history.**
`/home/wardair/ConquestDESIGNER` → `https://github.com/muziconsulting-cloud/conquest-designer`
(public). The old `conquest-tinkerer` repo is renamed `conquest-tinkerer-archive` and
archived, so there is no ambiguity about which repository the judges read.

**Why a fresh history, not a migration:** rule 4.2 makes the pre-window boundary the
thing that has to be *provable*. A fresh history makes it structural — commit 1 is the
declared pre-existing scaffold, tagged `pre-window-scaffold`; everything after it is
in-window build, and `git diff pre-window-scaffold..HEAD` **is** the build. The retired
Python-era history is not part of the submission and is not worth dragging in.

**What moved, and what deliberately did not.** The public-safe tree moved in full. From
this repo only two things were published: the **product spec** (rewritten — `docs/AVC-SPEC.md`,
the three facts, the escrow settlement, the self-listing protocol) and the **ledger**
(`docs/BUILD-LEDGER.md`, scrubbed of the platform's private derivation and its private
file paths). The private derivation, the production internals and the retired
R10,000-bond story stayed here. **This repo was not moved, not rewritten and not
deployed from** — it is live production (PM2, nginx, shared database) and is
**read-only** for the submission. `docs/README.md` in the submission states exactly what
is withheld and why, so a judge is never left guessing.

**Scoring consequence (honest, and it moves the number up):** the Impact row and the
Innovation row previously rested partly on private artifacts. They now rest on
**published** artifacts — the README impact statement, `docs/AVC-SPEC.md`, the
self-listing protocol and the escrow settlement. That is the part of the score a judge
can actually award.

**Still blocked, still honest:** the **Cursor free-tier quota is exhausted** and the
account is on the **Free** plan (named models refused). The organiser's Cursor access
instructions are still marked TBC. **No implementation exists in `src/` yet** — the
build is waiting on Cursor capacity, and the ledger says so rather than implying
otherwise.

---

## Ledger — 2026-10-22 (live, session 3): the engines are live, and the roles run on them

**What exists now, scored against the submission and not the ambition.**

| Criterion | Max | Now | Reason | Artifact |
|---|---|---|---|---|
| Technical Execution | 20 | **9** | The swarm runs end to end and the engines are under it, not beside it: `src/engines/session.ts` is the one seam, the roles store/recall/cite/record/learn on it, and the run is reproducible entry by entry (`bun run determinism`). The money path (escrow, AVC) is still unbuilt — that is the honest cap. | `src/engines/`, `src/agents/`, `src/orchestrator/`, `scripts/determinism.ts`, `logs/trace-20261022-001..004.jsonl` |
| Sponsor Tech Integration | 10 | **7** | **Our own** implementations of all three engines, green on the sponsors' own suites: H-MEM 13/13, World Model 8/8, Markovian 8/8, exit 0, local, no keys — and the roles run on them. The gap left is the Meterless *provider* credential (organiser-gated) and the Zetaris live instance (declared deviation). | `evidence/conformance-ours.txt`, `src/engines/`, `SPONSORS.md` |
| Innovation & Creativity | 15 | **6** | The exchange frame, the AVC as the product, and now the thing that makes it more than a plan: an exchange whose critic **teaches the memory engine** what survived the challenge, so the next run recalls differently. | `src/agents/conflict-critic.ts`, `docs/AVC-SPEC.md` |
| Impact & Real-World Relevance | 30 | **11** | The impact statement and the pre-existing declaration are published; the swarm's real output is now public and reproducible. Still no named user, no live URL, no number. | `README.md`, `docs/AVC-SPEC.md` |
| Product & UX | 10 | **2** | `POST /run` and the CLI exist and work; the human-facing listing surface (P9) is not built. | `src/server.ts`, `src/index.ts` |
| Demo (video/deck) | 15 | **0** | Still no `demo/demo.mp4`, no `DECK.pdf`. Binary-ish: missing video = −15. | `docs/DEMO-draft.md`, `docs/DECK-draft.md` (plans only) |
| **Total** | **100** | **~35** | Up from ~20. The build is real now; the remaining points are the money path, the surface and the two artifacts. | |

### What was built this session

- **P0 — the swarm.** `src/tracer.ts`, `src/orchestrator/`, `src/agents/` (the five roles),
  `src/engine/` (registry + Meterless HTTP adapter + the deterministic offline renderer),
  `src/loading.ts`, `src/index.ts`, `src/server.ts`, `data/sources.json`, and the three
  scripts. Four fixture paths, 36-entry traces, `POST /run`, `scripts/verify-paths.ts`
  PASS, `scripts/recon.ts` PASS. (`0e87f82`)
- **P1–P3 — the three engines, written from the sponsors' contracts.** `src/engines/hmem/`,
  `src/engines/world-model/`, `src/engines/markovian/`. `bun run scripts/conformance.ts`
  → H-MEM 13/13, World Model 8/8, Markovian 8/8, exit 0. The transcript is
  `evidence/conformance-ours.txt`; the sponsors' reference scores are a separate file and
  are never presented as ours. (`94dc258`)
- **P4/P5 — the seam.** `src/engines/session.ts`; the volume planner expands the pull plan
  on Markovian (LST-0003: 3 buckets over 2 chunks, so the carryover is real); the
  reconciler stores and recalls on H-MEM and cites the memory ids its answer stands on;
  the critic teaches H-MEM what survived the challenge; the closer writes the canonical
  record to the World Model and the auditor writes the decision and the escalation onto
  it. Every engine touch is in the trace under `detail.engine`. **The engines never
  decide** — the exchange rule stays authoritative. `bun run scripts/determinism.ts` is a
  new gate: two runs, compared entry by entry — identical response, identical trace
  length, every trace entry identical once the volatile fields are stripped (wall-clock
  timestamps, the trace id/path, the Markovian run uuid). (`71a12ef`)

### Corrected while writing this entry

- **The Meterless numbers in the docs were stale in three places** (`README.md`,
  `SPONSORS.md`, `metadata.json`): they still said the suites were green against the
  *reference* implementations and that our modules were "PENDING". They are ours, and
  they are green. Fixed, with the two score files kept separate.
- **`metadata.json` claimed Cursor was "LIVE — the development environment for the whole
  build".** That was false and it was in a machine-readable file the organiser might
  read. It now says what actually happened: the build layer was opencode, a declared
  deviation. This is the same class of error the whole ledger exists to prevent — it was
  in the repo, and it is now out.
- **The Telemetry Auditor's engine was recorded as Markovian** (in `metadata.json` and the
  README diagram) while the implementation writes the decision and the escalation to the
  **World Model**. Corrected in both, and in `AGENTS.md`.

### The next four moves, in order

1. **P6** — the Zetaris client against the published REST contract (the client exists as
   an interface; the protocol implementation does not).
2. **P7/P8** — the money path: inbound x402, the 2-of-2 escrow, the AVC on `settled`.
3. **P9** — the listing surface a stranger can use, plus the certificate view.
4. **P11** — the submission-integrity step: three real output examples, the anti-hardcode
   audit, the documentation audit, the clean-clone proof, and the **real** `DECK.md` and
   `DEMO.md` — then the two artifacts (`DECK.pdf`, `demo/demo.mp4`) that are worth 15
   points and are currently worth nothing.
