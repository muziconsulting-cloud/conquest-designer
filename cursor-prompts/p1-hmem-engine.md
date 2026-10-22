# P1 — our H-MEM engine

Attach the mandated Meterless prompt file for this engine with `@prompts/01-hmem-memory-evidence-reconciler.md`
and read it in full before you start. It defines the pattern; the task below says what to
build.

**Context, from files — do not ask for it to be pasted:**

- `vendor/meterless/hmem/AGENTS.md` — the engine contract. **This is the spec. Implement
  from it.** The conformance suite lives at `vendor/meterless/hmem/conformance/`.
- `src/types.ts` — our shared contracts.
- `src/llm/port.ts` — the one LLM port.
- `.cursor/rules/conquest.mdc` — the house rules.

**The API surface the conformance runner calls** (it is fixed — match it exactly, or
the runner exits `2` before a single check runs):

```ts
new HMEM({ clock: () => number })
hmem.add({ content, source, confidence?, layer?, derivedFrom? })  // -> record with .id
hmem.feedback(id, kind)
hmem.store.get(id)          // record | undefined
hmem.store.all()            // every record
hmem.query(query, { threshold, topN })
hmem.sleep.preview()        // -> plan, must not mutate the store
hmem.sleep.execute(preview) // -> report
hmem.conflicts.scan()       // -> conflicts
hmem.conflicts.autoResolve(conflict)
```

The module must export **`HMEM`** as a named class. Records carry `supersededBy` when
they lose a conflict, and **conflict resolution must never delete a record** — the
runner asserts both.

**Objective.** Implement our own H-MEM engine at `src/engines/hmem/`.

- The **surface stays thin over the memory spine** — the engine owns memory; the rest of
  the app never reaches past it. Export a small, typed API; do not leak the internal
  structure.
- **Every recall must cite memory ids.** A recall that cannot name the memories it came
  from is not a recall — return an error instead of guessing.
- Provenance on every record. Every stored observation keeps the source it came from.
- Follow `vendor/meterless/hmem/AGENTS.md` for the lifecycle (capture, enrich, retrieve,
  and the sleep/dream behaviour if the contract defines one) and for the contradiction
  handling: **conflicts are scored, not last-write-wins.**
- Do **not** copy the reference implementation in `vendor/meterless/hmem/reference/` into
  our tree. Read it to understand the contract, then write our own. Apache 2.0
  attribution stays in `SPONSORS.md` either way.

**Do not**

- No dependencies. Bun + TypeScript only.
- No network calls, no LLM calls inside the engine. Memory operations are deterministic.
- Do not change `src/types.ts`.

**Stop rule — the run is done when:**

```bash
HMEM_IMPL=/abs/path/to/src/engines/hmem/index.ts \
  npx tsx vendor/meterless/hmem/conformance/runner.ts
```

prints **13/13 passed** and exits **0**. The runner exits `1` on a failed check and `2`
if the implementation cannot be loaded — if you get `2`, the export shape is wrong.

Then: `bunx tsc --noEmit` exits 0.

If a check fails, read the runner's output and fix the **engine**, never the runner and
never the spec. Do not weaken an assertion to make it pass.

Report back: the files you created, the public API you exported, the conformance output
verbatim, and anything in `AGENTS.md` you could not satisfy and why.
