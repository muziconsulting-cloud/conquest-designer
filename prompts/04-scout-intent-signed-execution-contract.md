# 04 — Sign every tool call → the signed execution contract in front of settlement

> **Mandated prompt** — *Sign every tool call* (Meterless prompt library, **Implement**).
> Verbatim from `https://meterless.ai/engines.html`. Apache 2.0, `github.com/Meterless/Meterless`.

```text
Put Scout Intent execution contracts in front of every tool call in this codebase. Read engines/scout-intent/AGENTS.md and docs/execution-contract.md at https://github.com/Meterless/Meterless, and run examples/generate-execution-contract to see the shape.

Before a tool runs, Scout issues a contract naming the intent, the tool, the arguments and the risk level. A call without a valid contract is refused. Show me one accepted call and one refused call, then run npm run evals and show the report.
```

## Our binding

- **Role:** the **contract that must exist before money moves.** The settlement action —
  `settleTrade` on the escrow `settled` transition, the one that **transfers listing
  ownership and issues the AVC** — is the highest-risk tool call in the system. It gets an
  execution contract naming the intent, the tool, the arguments and the risk level.
- **Files:** `src/agents/signed-execution-contract.ts`, wired in front of the settle path.
- **Scout Intent is spec + eval harness** (no conformance suite ships) — so the bar here is
  the eval harness, not a suite. We use its *pattern*; we do not claim a conformance score
  we cannot earn.

## Stop rule

1. A tool call **without** a valid contract is **refused** — show the refusal.
2. A clean call is **accepted** — show the acceptance.
3. `npm run evals` in the Scout Intent engine runs and the **report is shown**.
4. A **tampered** contract (mutated arguments, or a replayed one) is rejected.
5. The settlement path cannot reach `settled` without a valid contract in front of it.
