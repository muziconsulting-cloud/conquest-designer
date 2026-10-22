# 01 — Give my agent memory → the Evidence Reconciler & Conflict Critic

> **Mandated prompt** — *Give my agent memory* (Meterless prompt library, **Implement**).
> Verbatim from `https://meterless.ai/engines.html`. Apache 2.0, `github.com/Meterless/Meterless`.

```text
Add persistent memory to the agent in this codebase using the Meterless H-MEM spec. Read https://github.com/Meterless/Meterless/tree/main/engines/hmem, starting with its AGENTS.md, and follow it step by step. Use the runnable reference in engines/hmem/reference as your guide.

You are done when the conformance suite passes:
HMEM_IMPL=/abs/path/to/your/index.ts bun vendor/meterless/<engine>/conformance/runner.ts

Show me the passing output.
```

## Our binding

- **Role:** the **Evidence Reconciler** (reconciles a candidate listing against fragmented
  sources) and the **Fidelity & Conflict Critic** (adversarially checks the Closer).
- **Why H-MEM:** tiered memory with **provenance on every record** and contradiction
  handling that *scores* conflicts instead of last-write-wins. That is exactly the
  fragmented-listing problem: two sources disagree about a listing's price, and the
  decision must be explainable, not last-write.
- **Files:** `src/engines/hmem/` (our implementation), `src/agents/evidence-reconciler.ts`,
  `src/agents/conflict-critic.ts`.
- **Do not** vendor `engines/hmem/reference` into this repository. Implement from
  `AGENTS.md`; use the reference as the guide, not as the artifact.

## Stop rule

1. `HMEM_IMPL=<abs path to our hmem impl> bun vendor/meterless/<engine>/conformance/runner.ts` exits `0`.
2. Every recall **cites memory ids** — no unciteable recall.
3. A conflict between two disagreeing sources is **scored and recorded with a reason**, not
   silently resolved.
4. The passing output is pasted into the build log.
