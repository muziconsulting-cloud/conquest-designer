# P5 — the orchestrator: two loops, one escalation, one fallback

**Context, from files — do not ask for it to be pasted:**

- `src/types.ts` — `AgentRole`, `Listing`, `ListingRecord`, `ListingStatus`, `Conflict`,
  `Critique`, `AuditRecord`.
- `src/agents/` — the five agents from P4.
- `src/engines/` — the three engines.
- `fixtures/listing-set.json` — the four fixture paths (accept, revise, hold, fallback).
- `.cursor/rules/conquest.mdc` — the house rules.

**Objective.** Implement the orchestrator in `src/orchestrator/`:

- `src/orchestrator/index.ts` — the public entry point.
- `src/orchestrator/loops.ts` — the two loops.
- `src/orchestrator/escalation.ts` — the escalation branch.
- `src/orchestrator/fallback.ts` — the fallback path.
- `src/orchestrator/trace.ts` — the JSONL trace sink.

**What the orchestrator must report back.** The HTTP response (P0's `POST /run`
contract) has a `collaboration` block, and it is the **proof that the agents actually
collaborated** rather than ran in sequence. The orchestrator returns it:

```ts
collaboration: {
  feedback_loop_completed: boolean  // true only if a critique CHANGED a decision
  revision_count: number            // how many times a listing was sent back
  evaluator_findings: string[]      // the critiques raised, in order
}
```

- `feedback_loop_completed` is `false` when the critic raised nothing, and `false` when
  it raised something that nobody acted on. It is `true` only when a critique changed
  the outcome of a listing.
- `revision_count` counts the sends-back. It must never exceed one per listing.
- `evaluator_findings` is empty when there were none. **Do not invent a critique to
  make the block look better.**

**The trace must show the handoff, not just the steps.** The tracer writes the
judge-readable fields specified in P0 (`action`, `input_summary`, `output_summary`,
`target_agent`, `confidence`, `retry_count`, `status` alongside the `AuditRecord`
fields). Two things are non-negotiable in it:

- **`target_agent` is set on every handoff** — the role the step handed to. A trace
  where every `target_agent` is `null` shows no collaboration.
- The critic's `action` is `critique` and its `output_summary` says what it objected
  to, in words. The revised step's `action` is `revise` and its `input_summary` names
  the critique it is answering. That pair is what a judge reads to see a feedback loop.

**The trace is the deliverable.** A judge who reads only `logs/<runId>.jsonl` must be
able to reconstruct the collaboration: who was called, in what order, with what, and
what came back.

**The shape**

```
volume-planner  ──▶  evidence-reconciler  ──▶  listing-closer  ──┐
                            │                                       │
                            └──▶  conflict-critic  ◀──(evidence)─────┘
                                        │                    (loop 2, if challenged)
                                        ▼
                                    telemetry-auditor
```

- **Loop 1 (draft):** plan → gather evidence → propose a listing.
- **Loop 2 (challenge):** the conflict critic challenges the proposed listing against the
  evidence. A challenge sends the listing back to the evidence reconciler, which then
  either produces stronger evidence (→ close it) or cannot (→ hold).
- **One escalation branch.** A listing that survives challenge but whose price the
  evidence still does not support escalates once to the telemetry auditor, which records
  the conflict and its resolution. **Escalate at most once** — a listing that escalates
  twice is a bug, and the orchestrator must not loop forever.
- **One fallback.** When a dependency is unavailable — the LLM port reports
  `offline` or `unauthorized`, the event log is unreachable, a memory read throws — the
  orchestrator must **degrade to a deterministic decision and still finish the run**.
  Never throw out of the orchestrator because a dependency was down. The fallback
  decision is marked in the trace so it is visible, never silently substituted.

**The decisions the orchestrator can return**

`accept` · `revise` · `hold` · `fallback` — and each one maps to a `ListingStatus`. A
listing whose evidence does not support its declared price is **held, not published**.
Holding is a success, not an error.

**Do not**

- No dependencies. Bun + TypeScript only.
- No test files, no test framework.
- Do not change `src/types.ts`, the agents, or the engines.
- No unbounded loops, no retries without a cap, no swallowed exceptions without a trace
  entry.

**Stop rule — the run is done when:**

`bunx tsc --noEmit` exits 0, and `bun run swarm` over `fixtures/listing-set.json` prints
one line per fixture path of the form:

```
<fixture-id>  ->  <decision>  by <role>  (trace: <n> entries)
```

covering all four paths: accept, revise, hold, fallback. Report the exact output.

Report back: the files you created, the decision each fixture path produced and why, how
the escalation branch is bounded, and exactly what the fallback does when the LLM port
is offline.
