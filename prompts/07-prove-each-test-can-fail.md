# 07 — Prove each test can fail → the acceptance gates are real

> **Mandated prompt** — *Prove each test can fail* (Meterless prompt library, **Harden**).
> Verbatim from `https://meterless.ai/engines.html`. Apache 2.0, `github.com/Meterless/Meterless`.

```text
For each Meterless engine this codebase implements (see engines/ in https://github.com/Meterless/Meterless), prove its tests can fail.

Make one small deliberate break per engine: skip a memory write, drop a chunk carryover, reorder an event, weaken an injection rule. Run that engine's conformance suite (or npm run evals for Scout Intent) and confirm it fails. Then revert. Report any break the tests missed, and add a test that catches it.
```

## Our binding

- **Role:** **our own acceptance gates.** This is the prompt that makes the rubric's
  "no fakery" line provable rather than claimed. A green suite that cannot go red is a
  decoration; judges ask.
- **Files:** `src/engines/*/`, `src/acceptance/`, `logs/`.

## Stop rule

1. **One deliberate break per engine** — skip a memory write, drop a chunk carryover,
   reorder an event, weaken an injection rule — and the corresponding suite **fails**.
2. **Revert** each break and the suite is green again.
3. **Report any break the tests missed**, and add a test that catches it.
4. The same discipline applied to our own gates: the escalation fixture must fire on a
   bad-evidence listing and must **not** fire on a good-evidence one.
5. The results (fail output, revert, green output) are kept in `logs/` as evidence.
