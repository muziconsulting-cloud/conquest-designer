# 03 — Long tasks, flat context → the Volume Planner & Telemetry Auditor

> **Mandated prompt** — *Long tasks, flat context* (Meterless prompt library, **Implement**).
> Verbatim from `https://meterless.ai/engines.html`. Apache 2.0, `github.com/Meterless/Meterless`.

```text
Refactor the long-running agent loop in this codebase to use the Meterless Markovian engine. Read engines/markovian/AGENTS.md at https://github.com/Meterless/Meterless and follow it: break the work into bounded chunks with safe carryover, so context stays flat per step.

Measure before and after (see engines/markovian/reference/scripts/measured-run.ts). You're done when this passes:
MARKOVIAN_IMPL=/abs/path/to/your/index.ts bun vendor/meterless/<engine>/conformance/runner.ts
```

## Our binding

- **Role:** the **Volume Planner** (decomposes the listing volume into bounded work) and
  the **Telemetry Auditor** (audits the run's own traces and emits the scorecard).
- **Why Markovian:** bounded-context chunking with a **compressed state carried forward**, so
  **cost per step stays flat** across a long listing run, and **per-step records** give us
  replay and diffs for the audit trail.
- **Files:** `src/engines/markovian/`, `src/agents/volume-planner.ts`,
  `src/agents/telemetry-auditor.ts`.
- **Measurement is part of the deliverable, not a nicety:** the Auditor's scorecard must
  carry the projected-vs-actual context savings, and `telemetry.md` /
  `run-history.md` give the shape.

## Stop rule

1. `MARKOVIAN_IMPL=<abs path to our markovian impl> bun vendor/meterless/<engine>/conformance/runner.ts` exits `0`.
2. **Context stays flat per step** — measured before and after, with the numbers shown.
3. Every chunk writes a **per-step record** (tokens, latency, outcome) into the run history.
4. A second run of the same task needs **fewer chunks** than the first.
5. The Auditor renders a table of the last ten runs and suggests alert thresholds from the
   data (e.g. a chunk using twice the median tokens).
