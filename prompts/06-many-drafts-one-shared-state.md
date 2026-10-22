# 06 — Many drafts, one shared state → the five agents in parallel on one state

> **Mandated prompt** — *Many drafts, one shared state* (Meterless prompt library, **Combine**).
> Verbatim from `https://meterless.ai/engines.html`. Apache 2.0, `github.com/Meterless/Meterless`.

```text
Run parallel drafting agents on shared state. Read engines/world-model/examples/swarm-planning-with-world-context, engines/markovian/examples/markovian-inside-swarm and engines/markovian/docs/compose-with-swarm.md at https://github.com/Meterless/Meterless.

Each draft runs its own Markovian loop but reads and writes the same World Model, so no two drafts plan against stale facts. Show three drafts that saw one another's changes, then run both conformance suites.
```

## Our binding

- **Role:** the **parallel half of our swarm** — the Critic and the Closer run as two
  concurrent agents against the same listing state, and the Planner re-plans against what
  they actually wrote. This is where "fragmented intelligence" becomes real rather than
  rhetorical: five agents, one shared state, no stale facts.
- **Files:** `src/orchestrator/`, `src/engines/world-model/`, `src/engines/markovian/`.
- **Why it matters for the score:** a swarm that only *looks* parallel is a diagram. A
  swarm where one agent's write changes another's read, and we can **show it**, is an
  architecture.

## Stop rule

1. **Three drafts that saw one another's changes** are shown, with the causal read/write
   visible in the trace.
2. **No two agents plan against stale facts** — proven by the trace, not asserted.
3. Both (all) conformance suites green for our implementations.
4. A **concurrent-writers** test passes: ten writers on the same entities, no lost update,
   final state matches a serial run.
5. The JSONL trace shows the loop, the replan and the escalation **with real ordering**.
