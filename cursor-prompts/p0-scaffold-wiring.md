# P0 — wire the scaffold end to end

You are working in a Bun + TypeScript project (no build step, no bundler, no client
framework). Read these files first — do not ask for them to be pasted:

- `src/types.ts` — the shared contracts (Listing, Evidence, Conflict, Critique,
  ListingRecord, AuditRecord, Avc, EscrowState). **These types are the contract. Do not
  change their names or shapes.**
- `src/README.md` — the folder shape and the rules the code must keep.
- `src/llm/port.ts` — the one LLM port (interface only).
- `src/zetaris/adapter.ts` — the Zetaris adapter (interface only).
- `package.json` — the scripts: `swarm`, `serve`, `conformance`, `recon`, `typecheck`.
- `.cursor/rules/conquest.mdc` — the house rules (already loaded for you).

**Objective.** Make `bun run swarm` run end to end and exit 0, producing:

- `src/index.ts` — the entry point.
- `src/tracer.ts` — a JSONL tracer. One line per agent step, appended to
  `logs/<runId>.jsonl`. Each line is an `AuditRecord` from `src/types.ts`.
- `src/engine/registry.ts` — resolves the LLM adapter for the run: the Meterless
  provider if `METERLESS_BASE_URL` and `METERLESS_API_KEY` are set, else the local
  Meterless Runtime if `METERLESS_RUNTIME_TOKEN` is set, else the **offline
  deterministic adapter**. `SAMPLE_MODE=true` forces the offline adapter. The offline
  adapter must be deterministic — the same input gives the same output every run.
- `src/agents/` — five stub agents, one per `AgentRole` in `src/types.ts`:
  `volume-planner`, `evidence-reconciler`, `listing-closer`, `conflict-critic`,
  `telemetry-auditor`. Each writes exactly one `AuditRecord` line per run for now.
  No agent logic yet — they are wired, not implemented.

**The run.** `bun run swarm` reads `fixtures/listing-set.json`, runs the five agents over
the four fixtures in order, writes the JSONL trace, and prints a one-line summary per
listing. It must not throw on any fixture.

**Do not**

- Do not add a dependency. No framework, no test runner, no npm package.
- Do not read `.env` values with anything other than `Bun.env` / `process.env`.
- Do not invent a second money path. There is no cash handling in this step.
- Do not rename anything in `src/types.ts`.

**Stop rule — the run is done when all of these hold:**

```bash
bunx tsc --noEmit     # exit 0, no output
bun run swarm         # exit 0, prints 4 lines (one per fixture), writes logs/*.jsonl
```

Then run `bun run swarm` twice and confirm the JSONL trace is byte-identical between
runs (determinism). If it is not, fix the adapter or the tracer — do not paper over it.

Report back: the files you created, the exact commands you ran, and their output.
