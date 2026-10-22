# P4 — the five agents

**Context, from files — do not ask for it to be pasted:**

- `src/types.ts` — our shared contracts, including `AgentRole`, `Evidence`, `Listing`,
  `Conflict`, `Critique`, `ListingRecord`, `AuditRecord`, `HoldingProof`.
- `src/engines/hmem/` — the memory engine (evidence spine).
- `src/engines/world-model/` — the canonical listing/trade event log.
- `src/llm/port.ts` — the one LLM port.
- `.cursor/rules/conquest.mdc` — the house rules.

**Mandated Meterless prompts.** Each agent is bound to one. Read each in full before you
write the agent it governs:

- `@prompts/01-hmem-memory-evidence-reconciler.md` → **Evidence Reconciler**
- `@prompts/02-world-model-canonical-listing-log.md` → **Listing Closer** (canonical log)
- `@prompts/03-markovian-bounded-long-runs.md` → **Volume Planner**
- `@prompts/04-scout-intent-signed-execution-contract.md` → **Telemetry Auditor**
- `@prompts/09-conflicting-memories-and-privacy.md` → **Conflict Critic**

**Objective.** Implement five agents under `src/agents/`, one file each, plus a small
`src/agents/index.ts` that exports them:

| Role | Does | Primary engine |
| --- | --- | --- |
| `volume-planner` | expands a listing into the evidence buckets that must be checked | Markovian |
| `evidence-reconciler` | gathers evidence, reconciles it, cites memory ids for every claim | H-MEM |
| `listing-closer` | writes the canonical listing record to the event log | World Model |
| `conflict-critic` | challenges a price against the evidence; scores conflicts | H-MEM |
| `telemetry-auditor` | records what every step did, and what it cost | World Model (audit) |

**The contract every agent honours**

- **Input:** a typed request. **Output:** a typed result. No agent reads another agent's
  private state; they exchange values through the orchestrator.
- **One JSONL trace entry per agent step.** Append to the trace sink the orchestrator
  passes in. The entry records: role, step id, what was asked, what was decided, the
  memory ids / entity ids cited, and the outcome. **A step with no trace entry is a
  failed step.**
- **Every recall cites its source.** If the evidence reconciler cannot name the memory
  ids behind a claim, it returns an error — it does not guess, and it does not return an
  empty success.
- **Deterministic by default.** The agents are wired against the `LlmPort`, but the
  offline adapter (`SAMPLE_MODE`) must produce the same decision shape without a
  network call. No agent may call a model directly.
- **The conflict critic is adversarial, not decorative.** It must be able to return
  `hold` — a listing whose evidence does not support its declared price is **held, not
  published**. A critic that never holds anything is a broken critic.

**Do not**

- No dependencies. Bun + TypeScript only.
- No test files, no test framework.
- Do not change `src/types.ts` or the engines. If a contract does not fit, say so in your
  report.
- No network calls.

**Stop rule — the run is done when:**

`bunx tsc --noEmit` exits 0, and `bun run swarm -- --dry-run` runs the five agents over
`fixtures/listing-set.json` and prints, for each of the four fixture paths, the
decision, the role that made it, and the trace lines written. If `bun run swarm` does not
exist yet, create it as a thin runner in `src/index.ts` and note that in your report.

Report back: the files you created, each agent's input and output type, the dry-run
output verbatim, and which fixture path produced which decision.
