# `prompts/` — the mandated Meterless prompt library, bound to Conquest

These are **Meterless's own published prompts** (verbatim from `https://meterless.ai/engines.html`,
the "All 57" library: Ideate 8 · Implement 10 · Combine 10 · Harden 12 · Power 17), each
**bound** to one of our swarm roles with a hard stop rule.

Meterless's own onboarding says to copy the prompt files you want into your project (for
example a `prompts/` folder) and load them into Cursor's Agent chat with `@filename`. That
is the mechanism here.

**Build mode:** the implementation is written in **opencode** against the `AGENTS.md`
contracts and the conformance suites. **Cursor runs these once, at the end, over the
finished skeleton** — that session is the judge-visible evidence that the mandated library
was used.

> The library is not Cursor-only. Meterless publishes it for Cursor, Claude Code, Copilot,
> Gemini and Claude Code alike, and the engine specs are plain `AGENTS.md` files that any
> coding agent can implement.

## The binding rule

Never run a prompt raw. A raw Meterless prompt is open-ended ("Find my best use case") and
wastes the window. Each file below is:

```
mandated prompt  +  our binding (the exact role, the exact file, the exact claim)  +  stop rule
```

The **stop rule** is the exit condition. For an engine, it is the conformance suite being
green **for our own implementation** — not for the reference.

## The set

| # | File | Mandated prompt | Bound to | Stop rule |
|---|---|---|---|---|
| 01 | `01-hmem-memory-evidence-reconciler.md` | *Give my agent memory* (Implement) | Evidence Reconciler + Fidelity & Conflict Critic | `HMEM_IMPL=… npx tsx conformance/runner.ts` green (13/13) |
| 02 | `02-world-model-canonical-listing-log.md` | *Keep parallel agents in sync* (Implement) | the canonical listing & trade event log | `WORLD_MODEL_IMPL=… npx tsx conformance/runner.ts` green (8/8) + re-ingest diff empty |
| 03 | `03-markovian-bounded-long-runs.md` | *Long tasks, flat context* (Implement) | Volume Planner + Telemetry Auditor | `MARKOVIAN_IMPL=… npx tsx conformance/runner.ts` green (8/8) + flat context per step |
| 04 | `04-scout-intent-signed-execution-contract.md` | *Sign every tool call* (Implement) | the signed contract in front of settlement | one accepted call, one refused call, `npm run evals` report |
| 05 | `05-full-stack-one-agent.md` | *The full stack in one agent* (Combine) | the whole swarm as one pipeline | three conformance suites + evals green + the data-flow diagram |
| 06 | `06-many-drafts-one-shared-state.md` | *Many drafts, one shared state* (Combine) | the five agents running in parallel on one state | three drafts that saw one another's changes |
| 07 | `07-prove-each-test-can-fail.md` | *Prove each test can fail* (Harden) | the acceptance gates | one deliberate break per engine **fails** the suite, then is reverted |
| 08 | `08-provider-llm-seam.md` | *Add Meterless as a provider* (Power) | the single LLM port | wrong token → unauthorized (not offline); `meterless/auto` returns a string |
| 09 | `09-conflicting-memories-and-privacy.md` | *Settle conflicting memories* + *Audit memory for privacy* (Harden) | the Critic's evidence gate + local-first posture | each resolution records why it won; a test fails if memory leaves the machine |

## Attribution

The prompt texts are from Meterless's public prompt library (`meterless.ai/engines.html`,
mirrored in `github.com/Meterless/Meterless`, Apache 2.0). The **bindings and stop rules are
ours.** No Meterless source is vendored; the engine specs are fetched at build time and
attributed in `SPONSORS.md`.
