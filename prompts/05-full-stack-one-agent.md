# 05 — The full stack in one agent → the whole swarm as one pipeline

> **Mandated prompt** — *The full stack in one agent* (Meterless prompt library, **Combine**).
> Verbatim from `https://meterless.ai/engines.html`. Apache 2.0, `github.com/Meterless/Meterless`.

```text
Build one small agent that uses all four engines. Read docs/architecture/stack-overview.md at https://github.com/Meterless/Meterless, then each engine's AGENTS.md, one at a time.

Scout Intent classifies and routes. The World Model holds shared state. Markovian runs long work in chunks. H-MEM remembers across sessions. Keep each engine behind its own interface. You are done when the three conformance suites and npm run evals all pass. Draw me the data flow in one diagram.
```

## Our binding

- **Role:** **the submission itself** — the five-agent exchange pipeline, which is the same
  shape this prompt describes.
- **Our mapping:**

  | Meterless | Ours |
  |---|---|
  | Scout Intent classifies and routes | the signed execution contract + the Critic's routing of a listing to *reconcile → close → hold* |
  | The World Model holds shared state | the canonical listing & trade event log |
  | Markovian runs long work in chunks | the Volume Planner's bounded listing cadence |
  | H-MEM remembers across sessions | evidence memory with provenance, carried across runs |

- **The thing this prompt is really about:** the swarm is not five chatbots — it is **one
  agent with four internal engines**. That is the "fragmented intelligence" thesis stated
  in the sponsor's own words.
- **Files:** `src/agents/`, `src/orchestrator/`, `src/engines/`.

## Stop rule

1. **Three conformance suites green for our implementations** + `npm run evals` green.
2. Each engine sits **behind its own interface** — no engine's internals leak into another.
3. **One data-flow diagram** is drawn and it matches the code.
4. The pipeline runs end to end: `bun run swarm` exits `0` and writes JSONL traces.
5. The **escalation branch demonstrably fires** on a fixture where the reconciled evidence
   does not support the declared price, and does **not** fire on a supported-price fixture.
