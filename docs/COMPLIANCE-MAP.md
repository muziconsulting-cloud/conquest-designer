# Compliance map — the organiser's final checklist, answered

**One page, so a judge never has to hunt.** Every item on the organiser's own
pre-submission checklist, and where in this repository it is satisfied. Where we
**deviate**, it is stated plainly and the reason is given.

> The organiser's guide says: *"Where this guide and the Official Rules on the event
> page disagree, the Official Rules apply."* The Official Rules permit any language,
> framework, model or cloud. The deviations below are all in that space.

## The three declared deviations

| # | The guide's suggestion | What we did | Why |
|---|---|---|---|
| 1 | Python 3.11 + FastAPI + `run.py` + `requirements.txt` | **Bun + TypeScript**, no build step, `src/index.ts` + `src/server.ts`, `package.json` scripts | The Official Rules allow any language/framework. Bun runs the TypeScript directly — no build, no bundler, no install step to go wrong for a judge. `bun run swarm` and `bun run serve` are the entry points, and they are documented in the README. |
| 2 | A `Dockerfile` (marked *Recommended*, not required, and **not** on the checklist) | **None** | There is no Docker on the build machine, so it could not be built or tested. An untested Dockerfile is worse than none: a judge who tries `docker build` on a file nobody ever ran gets a broken submission. The guide's checklist does not require it. |
| 3 | Zetaris over a live instance | **The published REST contract**, against a **local protocol-compatible server** | No instance was reachable: the local install needs Docker (unavailable) and the managed AWS stack stalled at account-binding and billing. The client is real — `OpenSqlQuery` → `PageSqlQuery` → `CloseSqlQuery`, Bearer auth, `X-Org-ID`, `X-Request-ID`, the `queryToken` carried through the page step, and the query **closed on the error path too**. The stub is on the *server* side, never in the client, and the **same command** runs against a live instance by changing one environment variable. |

**A fourth thing that is not a deviation but must be read honestly:** the Meterless
**engines are live and verified** against their own conformance suites. The Meterless
*hosted provider* credential and the **NVIDIA routing id** have not been issued to us.
The LLM seam therefore ships **three** adapters — the hosted provider, a local runtime,
and a deterministic offline adapter — behind one port, and the demo runs on the offline
one so nothing waits on a credential that has not arrived. **We do not claim to have
run Nemotron unless a recorded run names the routing id.**

## The checklist, answered

### Repository

| Item | Where |
|---|---|
| Entry point exists and is documented | `src/index.ts` (`bun run swarm`) and `src/server.ts` (`bun run serve`) — **and `POST /run`**, the programmatic entry point a judge can call without clicking anything. Both are in the README's quick start. |
| `.env.example` and `README.md` exist | Both, at the repository root. `.env` is gitignored; `.env.example` holds placeholders only. |
| At least 3 input examples and 3 real output examples | `input_examples/` (3) and `output_examples/` (3), captured from **real runs** by the run itself. No runtime code reads them — that is checked. |
| No real `.env` or API keys committed | `.env` is gitignored; `.env.example` holds placeholders; the P10 gate is "no key in the tree". |
| Repository is public | `https://github.com/muziconsulting-cloud/conquest-designer` |

### Sponsor technology

| Item | Where |
|---|---|
| Zetaris integrated, with a real role in the build | `src/zetaris/` — the listing-and-trade event log. The client is the published contract; the demo runs it against the local protocol-compatible server (deviation 3 above). |
| Meterless integrated, with a real role in the build | `src/engines/` — **H-MEM** (evidence reconciler, conflict critic), **World Model** (the canonical event log, the telemetry auditor), **Markovian** (the volume planner). Green against their own suites. |
| Project developed in Cursor | The build layer was Cursor, one scoped prompt per feature, all eleven prompt files in `cursor-prompts/` — so any feature can be re-run from its prompt. `.cursor/rules/conquest.mdc` was loaded on every run. |
| NVIDIA used wherever it contributes | Reached through the Meterless fleet's model routing. Declared, not yet exercised, until a run names the routing id. |

### Agents

| Item | Where |
|---|---|
| At least 2 agents with distinct roles | Five: `volume-planner`, `evidence-reconciler`, `listing-closer`, `conflict-critic`, `telemetry-auditor`. |
| At least one feedback loop | The critic challenges a proposed listing against the evidence and sends it back to the reconciler, which either strengthens the evidence (→ close) or cannot (→ **hold**). One escalation, at most. |
| An evaluator critiques another agent's work | The conflict critic critiques the closer's proposal; the telemetry auditor critiques the run. Both critiques are in the trace. |
| Output is revised or approved based on that critique | `collaboration.revision_count` and `feedback_loop_completed` are reported per run, and the `revise` step in the trace names the critique it is answering. |

### Logs

| Item | Where |
|---|---|
| Written to `logs/` and stdout | `src/tracer.ts` — one JSONL line per agent step, `logs/<runId>.jsonl`. |
| Show agent names, actions, handoffs and statuses | Each line carries `timestamp`, `trace_id`, `agent_name`, `action`, `input_summary`, `output_summary`, `target_agent`, `confidence`, `retry_count`, `status` **alongside** the internal `AuditRecord` fields. `target_agent` is set on every handoff. |
| Tied to the actual request | The response returns `log_path`, and that file exists when the response is sent. |

### Anti-hardcoding

| Item | Where |
|---|---|
| No prewritten final answers | The agents process the input; there is no branch on a known question. Audited in P11 with a grep pass and a two-unrelated-queries test. |
| `output_examples/` not loaded at runtime | Grep-checked in P11. They are evidence, not fixtures. |
| `SAMPLE_MODE` uses sample inputs only | It loads **sample input data**. It never returns a prewritten answer, fakes agent interaction, or pretends a sponsor service was called. |
| Different inputs produce meaningfully different outputs | The three shipped examples take three different paths — publish, **hold**, fallback. |

### Submission

| Item | Where |
|---|---|
| Demo video, 1–4 minutes | **A post-build artifact.** The plan is `docs/DEMO-draft.md` (a timed, word-for-word script written before the system existed). The real `DEMO.md` is regenerated from the running app by the p11 step — every shot a screen or command that exists — and the recording is exported to `demo/demo.mp4` **in the repository** (the compliance monitor looks for a real video file, not a form URL) and uploaded unlisted for the form. |
| Slide deck complete | **A post-build artifact.** The plan is `docs/DECK-draft.md` (fourteen slides, on-slide copy, speaker notes, visual direction). The real `DECK.md` is regenerated from the running app by the p11 step — every number on every slide from a run that was actually performed — and exported to `DECK.pdf`. |
| Sponsor technology explanation written | `SPONSORS.md` and `SUBMISSION.md`. |
| Pre-existing components declared | `PRE-EXISTING.md`, in full, with the `pre-window-scaffold` tag as the audit trail. |
