# 02 — Keep parallel agents in sync → the canonical listing & trade event log

> **Mandated prompt** — *Keep parallel agents in sync* (Meterless prompt library, **Implement**).
> Verbatim from `https://meterless.ai/engines.html`. Apache 2.0, `github.com/Meterless/Meterless`.

```text
My agents run in parallel and drift out of sync. Implement the Meterless World Model in this codebase: read engines/world-model/AGENTS.md at https://github.com/Meterless/Meterless and follow it to add an event-sourced shared state that every agent reads and writes.

You're done when this passes:
WORLD_MODEL_IMPL=/abs/path/to/your/index.ts npx tsx conformance/runner.ts
```

## Our binding

- **Role:** the **canonical listing & trade event log** — the single source of truth every
  agent reads from and writes to, and the same trail the **AVC issuance** hangs off.
- **Why World Model:** append-only event log as source of truth, **idempotent ingest**,
  **stable content-addressable ids**, bitemporal edges, and an **ordered audit entry per
  mutation**. Those are the guarantees an issuance trail needs; a mutable row does not
  provide them.
- **Files:** `src/engines/world-model/`, `src/agents/listing-closer.ts`,
  `src/agents/telemetry-auditor.ts`.
- **The fragmenting-input case:** the five listing sources are ingested as **separate
  observations** with per-field provenance — not merged into one pre-cleaned row.

## Stop rule

1. `WORLD_MODEL_IMPL=<abs path to our world model impl> npx tsx conformance/runner.ts` exits `0`.
2. **Re-ingesting the same data produces an empty diff.**
3. The five disagreeing sources land as distinct observations; a canonical record is
   emitted with **per-field provenance**.
4. Every mutation writes an **ordered audit entry**.
5. Also read `engines/world-model/docs/concurrency-and-queues.md` and write the
   concurrent-writers test: ten agents updating the same entities at once, **no update
   lost**, and the final state matches a serial run.
