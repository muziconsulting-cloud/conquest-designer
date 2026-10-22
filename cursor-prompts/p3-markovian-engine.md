# P3 — our Markovian engine

Attach the mandated Meterless prompt file for this engine with `@prompts/03-markovian-bounded-long-runs.md`
and read it in full before you start. It defines the pattern; the task below says what to
build.

**Context, from files — do not ask for it to be pasted:**

- `vendor/meterless/markovian/AGENTS.md` — the engine contract. **This is the spec.
  Implement from it.** The conformance suite lives at `vendor/meterless/markovian/conformance/`.
- `src/engines/hmem/` and `src/engines/world-model/` — the two engines already built, so
  the third one looks and behaves like its siblings.
- `src/types.ts` — our shared contracts.
- `.cursor/rules/conquest.mdc` — the house rules.

**The API surface the conformance runner calls** (fixed — match it exactly, or the runner
exits `2` before a single check runs):

```ts
new Markovian({ chunkConfig: { chunkSize, carryoverTokens, overlapTokens? }, clock })
await m.run({ goal, generator, reflect? })
modelTotals   // module-level export
runEfficiency // module-level export (or an equivalent named export)
```

The module must export **`Markovian`** as a named class, plus `modelTotals` and
`runEfficiency` (or a clearly equivalent pair) as named exports.

**The overlap contract is three-way, and this is the part people get wrong:**

- a run configured with a **non-zero `overlapTokens`** that **implements the overlap**
  **passes**;
- a run configured with a **non-zero `overlapTokens`** that **rejects** the overlap
  **passes**;
- a run that **accepts and ignores** the overlap **FAILS**.

So the overlap must be genuinely applied to the chunk stream — the runner checks the
reassembly, not the intent.

**Objective.** Implement our own Markovian engine at `src/engines/markovian/`.

- **Bounded long runs.** A run is chunked; it must make progress across chunk boundaries
  and carry context forward without exploding. The carryover and overlap knobs are the
  engine's contract with the caller.
- A decomposition that mirrors the two sibling engines: a small `types.ts`, one module per
  concern (chunking, carryover/overlap, budgets/totals, the run loop), and a thin
  `index.ts` that exports the public surface. **No single giant file.**
- Deterministic. **No network calls and no LLM calls inside the engine** — the caller
  supplies the `generator` and the optional `reflect` function.
- Do **not** copy the reference implementation in `vendor/meterless/markovian/reference/`
  into our tree. Read it to understand the contract, then write our own. Apache 2.0
  attribution stays in `SPONSORS.md` either way.

**Do not**

- No dependencies. Bun + TypeScript only.
- **No test files.** The conformance runner *is* the test suite for this engine. Do not
  add `*.test.ts` and do not add a test framework.
- Do not change `src/types.ts`.
- Do not change the two sibling engines — if you think they need a change, say so in your
  report instead of editing them.

**Stop rule — the run is done when:**

```bash
MARKOVIAN_IMPL=/abs/path/to/src/engines/markovian/index.ts \
  bun vendor/meterless/markovian/conformance/runner.ts
```

prints **8/8 passed** and exits **0**. The runner exits `1` on a failed check and `2` if
the implementation cannot be loaded — if you get `2`, the export shape is wrong.

Then: `bunx tsc --noEmit` exits 0.

If a check fails, read the runner's output and fix the **engine**, never the runner and
never the spec. Do not weaken an assertion to make it pass.

Report back: the files you created, the public API you exported, the conformance output
verbatim, and anything in `AGENTS.md` you could not satisfy and why.
