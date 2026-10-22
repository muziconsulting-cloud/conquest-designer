# `src/` — folder shape

Scaffold only. The implementation is **build-window work** (see `BUILD-PROMPTS.md`
§3 — pre-window prep is docs, scaffolds, connector interfaces, sample data and
prompts; no agents, no orchestrator, no engines, no qualifying logic).

```
src/
  types.ts            shared contracts — types only, no logic
  llm/
    port.ts           the single LLM port (interface only)
  zetaris/
    adapter.ts        the Zetaris REST-contract adapter (interface only)
  engines/            our Meterless engine implementations   [build window]
    hmem/
    world-model/
    markovian/
  agents/             the five swarm roles                    [build window]
    volume-planner.ts
    evidence-reconciler.ts
    listing-closer.ts
    conflict-critic.ts
    telemetry-auditor.ts
  orchestrator/       the loops, the escalation, the fallback [build window]
  index.ts            `bun run swarm` entry point             [build window]
  server.ts           `bun run serve` — server-generated HTML  [build window]
scripts/
  conformance.ts      runs the three Meterless suites against OUR impls [window]
  recon.ts            the money invariant check                [window]
```

## The rules the code must keep

- **One LLM port.** No agent calls a model directly.
- **No exception may abort a run.** Every sponsor call degrades gracefully;
  `SAMPLE_MODE` is the deterministic offline path, not a lesser mode.
- **Whole rand only.** No cent denominations anywhere a user or funding touches.
- **Listings only.** The swarm recruits listings; it does not sell.
- **The certificate is the product.** We never issue a token.
- **One JSONL trace entry per agent step**, so every decision is reproducible.
