# BUILD-PROMPTS.md — in-window build plan (prompt sequence)

**LOCKED v3 — 2026-10-21.** Rebuilt from code reality after the pivot to the **agent
exchange** (AVC). Supersedes v2 (whose P6/P7 pointed at the deleted `run.py`, and whose
contract facts were the retired worker-agent story). Stack, contract facts and prompts below
are the version of record for the **Oct 22 00:00Z → Oct 27 23:45Z** window.

> Note: Meterless's own page still shows the **old** dates (Oct 15–20). The authoritative
> GenAI.Works page (**Oct 22–27**) wins.

---

## 0. Stack — LOCKED: Bun + TypeScript + server-rendered HTML

- **The artifact is Bun + TypeScript.** Bun runs TS directly — NO build step, no
  bundler, no client framework. Operator surfaces are **server-generated HTML**
  (the proven WardByWard pattern). Traces/ledgers stay JSONL — repo stays light.
- **The retired Python prototype is declared pre-existing and is gone from the working
  tree** (history preserved). It is a design reference only; the judged artifact is TS.
  The official onboarding material uses Python for its starter, but states plainly that
  **"JavaScript or TypeScript works just as well"** — so TS is **sanctioned, not a deviation**.
- **BUILD MODE — where the work happens (CORRECTED 2026-10-21, organiser Module 3):**
  **the build happens in Cursor.** The event's Build layer is explicit: *"you must build in
  Cursor"*, the code-writing AI runs on **Cursor's included models (Composer / Grok) paid
  from Cursor credit**, and the submission must explain how Cursor was used. So every
  qualifying line of code is authored by **Cursor**, not by us.
  - **How we drive it:** the **Cursor CLI** (`cursor-agent`) on this machine, headless,
    one scoped feature per invocation. Same models, same credit, same
    `.cursor/rules/conquest.mdc` auto-loaded — just scriptable, which is what makes it
    affordable.
  - **How opencode fits:** opencode is the **reviewer and the steerer**, not the builder. It
    writes the scoped prompt for each feature, runs the gates (`bunx tsc --noEmit`, the
    Meterless conformance suites, `bun run recon`), reviews Cursor's diff, and commits.
    That is exactly the "Describe → Review → Steer" loop the organiser describes.
  - **Credit discipline (Cursor credit is finite):** one feature per run, context loaded
    from files rather than pasted, `prompts/*.md` handed over with `@filename`, and a
    commit after every working step so a bad generation is rolled back, not debugged.
    Priority if the credit runs short: **Meterless engines** (mandatory gate) →
    **Zetaris adapter** (mandatory gate) → **agents + orchestrator** (Impact) → **HTML
    surface** (Demo) → polish.
  - **The provider key never goes near Cursor.** Meterless credit pays for the *product*
    running; Cursor credit pays for *writing the code*.
- **Why we are confident Bun+TS builds this inside the window** (evidence, not vibes):
  1. The Meterless conformance toolchain **is TypeScript** (`npx tsx
     conformance/runner.ts`) — the mandatory sponsor gate forces TS anyway.
  2. **Verified 2026-10-21 on this machine:** H-MEM **13/13**, Markovian **8/8**,
     World Model **8/8** — all exit code `0`, all local, **no API keys, no cloud
     account, no card**. The sponsor's own reference implementations pass their own
     suites, so the gate is reachable, not theoretical.
  3. WardByWard (10k+ lines, this stack) already proves server-HTML rendering,
     raw `fetch` sponsor-style seams, bounded agent loops and JSONL discipline.
  4. Each prompt below has a hard **Done when** gate — nothing drifts.

---

## 1. The canonical pattern (from Meterless's own agent-ready docs)

Meterless engines are **AGENTS.md-driven implementation specs**, not runtime
libraries. The sanctioned way to build one is a short intent prompt — not a pasted
implementation:

```bash
npx degit meterless/meterless/engines/<engine> <dir>      # clone the spec folder
```

> Cursor → Agent mode → **"Implement the `<Engine>` engine in this project following AGENTS.md."**

The engine's `AGENTS.md` carries the full contract (architecture, service boundaries,
data shapes, build order). **Definition of done = the conformance suite is green:**

```bash
HMEM_IMPL=<your-build> npx tsx conformance/runner.ts
WORLD_MODEL_IMPL=<your-build> npx tsx conformance/runner.ts
```

Suites exit `0` on pass, `1` on failure, `2` if the implementation cannot be loaded.

## 2. Guardrail — avoid the "hand-built / pre-built" trap

- Keep every prompt **intent-level** ("implement X following AGENTS.md"), then let Cursor
  generate and iterate. This is the sponsor's own documented pattern.
- **Do not paste full implementations into prompts.** A prompt that contains the finished
  code reads as a pre-built solution and weakens the "new work" claim (rules §4.2 / §5.4).
- The declared pre-window material may be **READ** during the window — port its behavior,
  never paste it into a prompt, and never commit a transliteration without Cursor's own
  iteration on it.
- Every engine must pass its **conformance suite** — nothing faked — or sponsor points and
  the mandatory gate are both at risk.
- **Never claim an integration we do not have.** Zetaris is a declared deviation until a
  live instance is reachable; say so plainly rather than shipping a client with no server.

## 3. Pre-window prep (legal now; finished by Oct 21)

Explicitly allowed prep: docs, scaffolds, connector interfaces, sample data, **prompts**.

- [x] This prompt sequence (v3, locked).
- [x] `.cursor/rules/conquest.mdc` v2 — TS globs, Bun rules, aligned contract facts
      (this file also carries the `cursor_used` gate evidence).
- [x] `README.md` — setup / usage / dependencies + **pre-existing declaration**.
- [x] `SPONSORS.md` — honest sponsor write-up, Zetaris deviation evidenced, Meterless
      engines named and mapped to roster roles.
- [x] `metadata.json` — pre-existing declaration + engine↔role mapping.
- [x] `.env.example` — placeholders only, no keys; the three Meterless surfaces separated:
      **engines** (local, no creds), **provider** (one credential, organiser endpoint),
      **local runtime** (routing ids). No NVIDIA key anywhere in our path.
- [x] **Meterless path verified**: degit + conformance suites resolve and pass locally
      (13/13, 8/8, 8/8). The old `[NEED]` is closed.
- [x] `prompts/` folder — the **mandated Meterless prompt-library files** we will run in
      Cursor at the end (H-MEM memory, Markovian long-tasks, World Model shared-state,
      Scout Intent signed tool calls, "prove each test can fail"). Saved as plain
      `.md` so Cursor Agent chat can load them with `@filename`. **9 files + index.**
- [x] `package.json` (`bun`), `tsconfig.json`, `src/` folder shape + `src/types.ts`
      shared contracts only (no logic) — scaffold, legal prep. `bunx tsc --noEmit` exit 0.
      Also added the two **connector interfaces** (`src/llm/port.ts`,
      `src/zetaris/adapter.ts`) and the `src/README.md` folder map.
- [x] Fixtures: a listing set with deliberately **disagreeing** evidence across sources
      (the fragmentation the swarm exists to reconcile). `fixtures/listing-set.json` —
      four listings covering the four paths: **accept**, **revise**, **hold/escalation**,
      **fallback** (a source down).
- [ ] HackOS registration confirmed before 2026-10-22T23:59Z (hard gate).
- [ ] Ask Zetaris (Help channel) for **shared-event-instance credentials** — would convert
      the declared deviation into a live integration. Not build work; just a message.

**Forbidden before Oct 22 00:00Z:** implementing agents, orchestrator, engines, or
any qualifying logic — that work is born inside the window.

## 4. Prompt sequence (ordered, intent-level — paste into Cursor in order)

**P0–P11 is the entire build.** Every prompt below is pre-written; nothing is left to
invent inside the window.

| # | Prompt (intent) | Builds | Rubric / gate | Done when |
|---|---|---|---|---|
| P0 | Scaffold the Bun+TS entry: `bun run swarm` runs end-to-end against stubs; shared typed contracts for Listing / Evidence / Critique / ListingRecord / AuditRecord; JSONL tracer; `.env.example`. | Skeleton | Technical | `bun run swarm` exits 0; types compile |
| P1 | Implement the **H-MEM** engine following AGENTS.md; keep the surface thin over the memory spine; every recall must cite memory ids. | Memory of prior touches / listing recall | Technical + Sponsor | conformance green (13/13) |
| P2 | Implement the **World Model** engine following AGENTS.md; ingest the **disagreeing** listing sources as separate observations; emit canonical records with per-field provenance; ingest idempotent + resumable. | Reconciliation + provenance | Innovation + Sponsor | conformance green (8/8); re-ingest does not duplicate |
| P3 | Implement the **Markovian** engine following AGENTS.md to drive the listing cadence and log projected-vs-actual context savings. | Bounded cadence loop | Technical + Sponsor | conformance green (8/8) |
| P4 | Implement the **five agents** — Volume Planner, Evidence Reconciler, Listing Closer, Fidelity & Conflict Critic, Telemetry Auditor — as separate TS modules behind one shared typed contract; each writes a JSONL trace entry. | Agent roster | Technical | `bun run swarm` runs all five; traces present |
| P5 | Implement the **orchestrator**: Critic↔Closer revision loop; Planner↔Critic replan on missing evidence; **escalation branch** → a listing is held when the reconciled evidence does not support the declared price; source-unavailable fallback. Bounded budgets. | Collaboration + escalation | Innovation + Demo | escalation demonstrably fires on a fixture (incl. a no-escalation fixture) |
| P6 | Implement the **Zetaris-pattern adapter** against Zetaris's **published REST contract**: `POST` a SQL body `{ "select": ..., "pageLimit": N }` to open a query, page it with the returned `queryToken`, then **close it** to release server memory; send `Authorization: Bearer <idToken>` + `X-Org-ID` + `X-Request-ID`; run against **our own data API** with federated SQL **in place** over the listing sources (no ETL); map rows to the World Model input shape. `SAMPLE_MODE` uses a same-shape local fixture. | Federated data layer | Sponsor | adapter hits our API and returns rows; sample parity offline |
| P7 | Wire the **escrow settlement** path: on the escrow `settled` transition, transfer **ownership** of the listing and issue the **AVC** (identity, declared price paid, term acquired) — an ownership transfer, not a cash-out. | AVC issuance | Technical + Innovation | a settled trade issues a verifiable certificate; balance invariant unchanged |
| P8 | Implement the **self-listing protocol**: a human registers and pays the listing fee once (inbound x402); the protocol hands the agent a listing token; the agent then lists itself, declares its own price, and holds its own AVC. | Self-listing | Impact + Product | an agent lists itself with no human in the loop after step 1 |
| P9 | Add the **operator surface**: Bun serves a **server-generated HTML** page (listings, AVCs, conflicts, escalations, throughput) plus the ledger from run artifacts. Read-only. | Operator report | Product & UX | page renders from artifacts in a browser |
| P10 | Put inference behind the one LLM port: OpenAI-format `chat/completions` against the Meterless provider, the model **discovered from the provider's routing ids at runtime** rather than hard-coded (Nemotron tiers included), then a local Meterless Runtime, then a deterministic offline adapter. No NVIDIA account, key or billing in our path. | LLM seam | Impact + in-kind | one seam; a tier swap is config, not a rewrite; fallback works offline |
| P11 | Deliverables (not code): README **Setup / Usage / Dependencies**, sponsor write-up, slide deck, 1–4 min demo video; finalize the pre-existing declaration in README + metadata. | Submission package | Demo + gates | compliance monitor green |
| P12 | **Cursor evidence + the README build record.** Keep the per-feature Cursor transcript (one row per run in the README's "How we built it" table: run → prompt file → files touched → the acceptance command output), and run the organiser's own check 2 inside the project — Composer or Grok creates and runs a file with no API key. The mandated prompt library is attached with `@filename` in the runs themselves, not in a separate session at the end. | Cursor evidence | Sponsor | Cursor transcripts in the README; check 2 passes in-project |
| P13 | Run the in-repo compliance monitor and fix every remaining gap; confirm the public repo, the HackOS form entries (pre-existing list mirrors `metadata.json`) and submit before 2026-10-27T23:45Z. | Gates + submit | All hard gates | `python3 tools/hackathon-compliance/scripts/compliance_check.py --repo .` clean; submitted |

## 5. The mandated Meterless prompt library — used, but adapted

Meterless publishes an open prompt library (`https://meterless.ai/engines.html` — "the one
prompt" + 40 numbered prompts). We **use these prompts** — they are the sanctioned path.

**But never raw.** The raw prompts are open-ended ("Find my best use case"), and fed to a
model as-is they wander and burn the window. So each one is **bound** to a concrete
objective with a **hard stop rule**. Sequence = `step · mandated prompt · our binding · stop rule`.

The runnable sequence is rebuilt from code reality as P1–P3 above (the engines) with the
conformance suite as each stop rule. A 10-step *worked example* is the demo artifact only
(discarded before submission).

### The `prompts/` folder — how the mandated library is actually run

Meterless's own onboarding says to **copy the prompt files you want into your project** (for
example a `prompts/` folder) and then load them into Cursor's Agent chat with `@filename`.
That is the mechanism we use, and it is why the build mode is **Cursor-first**:

- The `prompts/` files are the **judge-visible artifact** — they show the mandated library
  being used, bound to our objectives, with hard stop rules.
- The **implementation is written by Cursor**, against the `AGENTS.md` contracts and the
  conformance suites, with the matching `prompts/*.md` handed over via `@filename` in the
  same run. That is the sanctioned loop: hand the Agent the pattern file, then say what
  you want built.
- The library is **not Cursor-only** — Meterless publishes it for Cursor, Claude Code,
  Copilot, Gemini and Claude Code alike — but the event's Build layer names **Cursor**
  specifically, so Cursor is where the code gets written.

**The four we run, each bound to one of our roles:**

| Prompt file (from the library) | Bound to | Stop rule |
|---|---|---|
| *Give my agent memory* (H-MEM) | Evidence Reconciler + Conflict Critic | the H-MEM conformance suite is green **for our implementation** |
| *Long tasks, flat context* (Markovian) | Volume Planner + Telemetry Auditor | Markovian suite green; a second run needs fewer chunks than the first |
| *Keep parallel agents in sync* (World Model) | the canonical listing/trade event log | World Model suite green; re-ingest does not duplicate |
| *Sign every tool call* (Scout Intent) | the signed execution contract in front of settlement | a tampered tool call is rejected; a clean one settles |
| *Prove each test can fail* | the acceptance gates | a deliberately broken build fails the gate |

## 6. Acceptance gates (all must hold before submission)

- [ ] Every engine: conformance suite **green** (nothing faked) — our implementations, not
      only the reference.
- [ ] Zetaris: adapter returns rows against our data API **and** sample parity offline.
      If a live instance became available, a live call too; otherwise the declared
      deviation stands, stated plainly.
- [ ] Escalation branch **demonstrably fires** on a fixture (evidence does not support the
      declared price) **and does not fire** on a supported-price fixture.
- [ ] Five agents collaborate (loops + escalation visible in traces).
- [ ] A settled trade issues an **AVC** and the money invariant is unchanged (delta 0).
- [ ] `bun run swarm` runs the full pipeline; HTML surface renders.
- [ ] No secrets; `logs/` traces present; README has Setup / Usage / Dependencies.
- [ ] `python3 tools/hackathon-compliance/scripts/compliance_check.py --repo .` —
      every **hard gate** PASS.

## 7. Build plan — atomic Day 1, then five days of rubric scoring

**Day 1 — Oct 22 (build it whole):**
1. Confirm the HackOS registration before **23:59Z** (hard gate).
2. Execute **P0 → P13** as a sequence of **Cursor** runs (each one scoped, with its
   `prompts/*.md` bound and its conformance suite as the stop rule): scaffold → Meterless engines (each
   conformance-green) → five agents → orchestrator + escalation → Zetaris-pattern adapter
   → AVC on escrow settle → self-listing → server-rendered HTML surface → Nemotron seam.
3. **Day-1 acceptance (all must hold or the build is not done):**
   - `bun run swarm` runs the full pipeline end to end.
   - Every engine conformance suite green **for our implementations**.
   - Adapter returns rows against our data API **and** sample mode returns the same shape.
   - Escalation fixture fires (evidence does not support the price) **and** the
     supported-price fixture does not.
   - A settled trade issues an AVC; the money invariant is unchanged.
   - HTML surface renders from run artifacts.
4. **One clean TS artifact in the repo.** The retired Python prototype is already removed
   from the working tree; history keeps it.

**Days 2–6 — Oct 23–27 (score it, don't extend it):**
- Work the **§9 rubric loop**, lowest-scoring criterion first (points per effort).
- Produce the deliverables (P11): README Setup/Usage/Dependencies, sponsor write-up,
  slide deck, 1–4 min demo video.
- **P12 — the one Cursor session**, over the finished skeleton, running the `prompts/`
  files with `@filename` (plus the organiser's Cursor check).
- Re-run the in-repo compliance monitor + conformance daily.
- **Oct 27 (AM SAST):** final compliance run, flip the repo public, confirm the
  HackOS form (pre-existing list mirrors `metadata.json`), submit **well before
  23:45Z**.

## 8. Contract facts of record (do not rebuild stale terms)

Spec-of-record: the private architecture document + `docs/AVC-DEFINITION.md` (WardByWard
repo, private).

- **We are an exchange, not a valuer.** The **owner declares the price**; we record it.
- **The AVC certifies exactly three facts**: *who* (standardized agentic identity in an
  Ethereum wallet), *what was paid* (the owner-declared price, recorded), *what it bought*
  (the listing/access term). Nothing more.
- **Never issue a token.** The certificate is the product; we stay outside issuer rules.
- **Listing is the product.** Humans pay to list their agents. **x402 flows inbound only** —
  buyers pay us; we never pay out.
- **Settlement is 2-of-2 escrow** (`lock → pending → settled`, plus dispute/claim/cancel).
  Buyer-unknown-to-seller is open demand, claimed via `claimOpenDemand`.
- **The settled transition transfers ownership and (re)issues the AVC.** It is *not* a
  cash-out — the value is a transfer of the listing, not a balance credit.
- **Whole-rand only.** No cent denominations anywhere a user or funding touches.
- **The swarm's job is LISTINGS ONLY.** It does not sell. It recruits listings; sales happen
  on the exchange through escrow.
- 1:1 baseline: `1 TIME = 1 min = R1`; genesis **40,492,224,000,000**; **1,440/day** per
  account. These are pre-existing product facts; the swarm must not perturb them
  (`recon` delta 0).

## 9. Rubric scoring loop (Days 2–6 — the actual win condition)

Verified against the **live** official page on 2026-10-19: weights, dates, tracks and
prizes match `requirements.json` exactly — **no drift**. Judging is 100 points:

| Criterion | Max | What the judges score | Our evidence (built Day 1) |
|---|---|---|---|
| **Impact & Real-World Relevance** | **30** | fit to the challenge statement; meaningful problem for intended users | Track 1 statement = "work across fragmented data sources"; the swarm reconciles disagreeing listing sources into one provenance-backed view, and refuses to list an agent whose evidence does not support the declared price. |
| **Technical Execution** | **20** | implementation, reliability, architecture | 5 typed TS modules + orchestrator, bounded loops, JSONL traces, graceful sponsor fallbacks, World Model idempotent/resumable ingest, conformance green, escrow settle issuing a verifiable AVC. |
| **Innovation & Creativity** | **15** | originality of approach | A certificate-of-record for agent ownership, priced by the owner and certified by a venue that refuses to value for anyone; refusal as a feature (the Critic's evidence gate + escalation). |
| **Demo** | **15** | clarity, functionality, value | 1–4 min video: full loop, the hype-draft→critic-reject→rewrite moment, the escalation case, and a settled trade issuing its certificate; slide deck. |
| **Product & UX** | **10** | intuitive, accessible for intended users | server-generated HTML surface (listings, AVCs, conflicts, escalations) + ledger, readable by a stranger. |
| **Sponsor Tech** | **10** | effective use of sponsor tech | Meterless engines (hard gate, conformance, named per role) + the Zetaris-pattern adapter against the published REST contract with an evidenced deviation + Cursor (rules + the final `prompts/` pass) + NVIDIA Nemotron through the Meterless provider. |

**The loop (each of Days 2–6):**
1. Run the compliance monitor + conformance; record PASS/FAIL.
2. Score all six criteria honestly (the monitor prints the table; fill it per run).
3. Fix the single lowest criterion with the highest points-per-effort.
4. Re-run the acceptance gates; only then move on.
5. Keep `metadata.json` + README declarations in sync with the repo.

Ties break on Impact, then submission timestamp — so submit early, not at the buzzer.
