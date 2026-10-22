# P2 — our World Model engine

Attach the mandated Meterless prompt file for this engine with `@prompts/02-world-model-canonical-listing-log.md`
and read it in full before you start. It defines the pattern; the task below says what to
build.

**Context, from files — do not ask for it to be pasted:**

- `vendor/meterless/world-model/AGENTS.md` — the engine contract. **This is the spec.
  Implement from it.** The conformance suite lives at `vendor/meterless/world-model/`.
- `src/types.ts` — our shared contracts.
- `.cursor/rules/conquest.mdc` — the house rules.

**The API surface the conformance runner calls** (fixed — match it exactly, or the runner
exits `2` before any check runs):

```ts
// module exports: WorldModel (class), entityIdFromName, normalizeName, decide
new WorldModel({ storage: "memory", namespace, clock? })
await world.ingest(observations)   // -> { changed: boolean, ... }
await world.upsertEntity({ type, name?, externalKey?, attrs?, source })  // source REQUIRED
await world.relate({ from, type, to, validFrom, source })
world.stateShapeCanonical()         // -> string; identical across an idempotent re-ingest
world.view("graph").neighborsOf(id, { via, at? })   // point-in-time query
world.audit()                       // -> entries with strictly increasing .seq
```

**Boundary rulings the runner asserts** (they are the point of the engine, not details):

- `entityIdFromName("person", "José García")` must equal `entityIdFromName("person", "jose garcia")`
  — same normalized name, same id — but `decide(0.85) === "auto-merge"`,
  `decide(0.84) === "review"`, `decide(0.82) === "review"`, `decide(0.81) === "new"`.
  Do not over-normalize: "Acme Corp" and "Acme Corporation" must stay distinct.
- A write with **no provenance is rejected** — throw.
- Re-ingesting the same batch reports `changed: false` and leaves the canonical state
  byte-identical. A genuinely edited observation reports `changed: true`.
- A superseding edge **closes** the old one; a point-in-time query at an earlier `at`
  still sees the earlier edge.
- Every mutation writes an audit entry, and `seq` is strictly increasing.

**Objective.** Implement our own World Model engine at `src/engines/world-model/`, then
wire it to our domain: the **listing and trade event log**.

- The **disagreeing sources become separate observations**, not one merged record. The
  fixtures in `fixtures/listing-set.json` deliberately disagree about price and term —
  that disagreement is the input, not an error to be smoothed away.
- Emit canonical `ListingRecord`s with **per-field provenance**: for each field, which
  source won it. `src/types.ts` already defines `ListingRecord.provenance`.
- Ingest is **idempotent and resumable** — a re-run must not duplicate, and a partial
  run must be able to continue.
- Do **not** copy the reference implementation in `vendor/meterless/world-model/reference/`
  into our tree. Read it to understand the contract, then write our own. Apache 2.0
  attribution stays in `SPONSORS.md` either way.

**Do not**

- No dependencies. Bun + TypeScript only.
- No network calls inside the engine.
- Do not change `src/types.ts`.

**Stop rule — the run is done when:**

```bash
WORLD_MODEL_IMPL=/abs/path/to/src/engines/world-model/index.ts \
  bun vendor/meterless/world-model/conformance/runner.ts
```

prints **8/8 passed** and exits **0**. Then `bunx tsc --noEmit` exits 0.

If a check fails, read the runner's output and fix the **engine**, never the runner and
never the spec. Do not weaken an assertion to make it pass.

Report back: the files you created, the public API, the conformance output verbatim, and
anything in `AGENTS.md` you could not satisfy and why.
