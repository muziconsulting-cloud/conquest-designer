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
- `src/server.ts` — the HTTP surface. `Bun.serve`. It must expose **`POST /run`**:
  the programmatic entry point a judge can call without clicking anything.

**The entry point contract — implement this exactly, it is what a judge calls.**

Request (`POST /run`, `Content-Type: application/json`):

```json
{
  "request_id": "example-001",
  "user_query": "Which listings have a declared price the evidence does not support?",
  "context": { "track": "Solving Fragmented Intelligence" }
}
```

Response (`200 OK`):

```json
{
  "request_id": "example-001",
  "trace_id": "trace-20261024-001",
  "status": "success",
  "agents_used": ["volume-planner", "evidence-reconciler", "listing-closer", "conflict-critic", "telemetry-auditor"],
  "result": {
    "summary": "One listing is held: the declared price is not supported by the reconciled evidence.",
    "findings": [
      { "listing_id": "…", "decision": "held", "sources": ["erp_export", "ticket_system"], "confidence": 0.82 }
    ],
    "confidence": 0.82
  },
  "collaboration": {
    "feedback_loop_completed": true,
    "revision_count": 1,
    "evaluator_findings": ["The initial draft did not cite the source of each fact"]
  },
  "log_path": "logs/trace-20261024-001.jsonl"
}
```

- `agents_used` is the list of roles that actually ran, in order.
- `collaboration.feedback_loop_completed` is `true` only if a critique actually changed
  a decision. `revision_count` is how many times. `evaluator_findings` is the list of
  critiques raised — empty when there were none.
- `log_path` points at the JSONL trace the run just wrote. It must exist when the
  response is sent.

**The trace must be readable by a judge who has never seen this codebase.** The
`AuditRecord` shape is internal, so the tracer writes each line as the `AuditRecord`
fields **plus** these, at the top level of the same JSON object:

| Field | Meaning |
| --- | --- |
| `timestamp` | ISO 8601 — the same instant as the record's `at` |
| `trace_id` | the run id |
| `agent_name` | the role — same value as the record's `role` |
| `action` | what the agent did, in words: `plan_sources`, `query_source`, `reconcile`, `critique`, `revise`, `close_listing`, `audit_telemetry` |
| `input_summary` | one line: what this agent was given |
| `output_summary` | one line: what it produced |
| `target_agent` | the role it handed to, or `null` if it finished |
| `confidence` | a number in `[0,1]`, or `null` if the step had no score |
| `retry_count` | `0` unless the step was retried |
| `status` | `success` \| `error` \| `escalated` \| `fallback` — mapped from the record's `outcome` |

Keep the `AuditRecord` fields alongside them. **Do not change `src/types.ts`** — the
enrichment happens in the tracer, not in the contract.

**The folders a judge expects to find.** Create them now, with the right contents, so
the shape is fixed before the features land:

- `input_examples/` — **three** request files in the request contract above:
  `example_1.json`, `example_2.json`, `example_3.json`. They must be **different
  questions** that take **different paths** through the pipeline (one that publishes, one
  that is held, one that triggers the fallback). Two similar queries defeat the point.
- `output_examples/` — **three** response files, each **captured from a real run** of
  the matching input, saved to disk by the run itself. Never hand-written, never
  loaded by runtime code.
- `data/` — the sample source records the offline adapter reads.
- `scripts/` — the helper scripts (`conformance.ts`, `recon.ts`).
- `logs/` — already there; the traces land here.
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

`bun run swarm -- --input input_examples/example_1.json` must run **one** request
through the same pipeline and write the response to `output_examples/example_1.json`,
then exit 0. The input file is the request contract above.

**Do not**

- Do not add a dependency. No framework, no test runner, no npm package.
- Do not read `.env` values with anything other than `Bun.env` / `process.env`.
- Do not invent a second money path. There is no cash handling in this step.
- Do not rename anything in `src/types.ts`.
- Do not write a Dockerfile. There is no Docker on the build machine, so it cannot be
  built or tested here, and an untested Dockerfile is worse than none.
- Do not hand-write the contents of `output_examples/`. They are captured from runs.

**Stop rule — the run is done when all of these hold:**

```bash
bunx tsc --noEmit     # exit 0, no output
bun run swarm         # exit 0, prints 4 lines (one per fixture), writes logs/*.jsonl
bun run swarm -- --input input_examples/example_1.json   # exit 0, writes output_examples/example_1.json
bun run serve -- --port 3000 &                          # the HTTP surface
curl -s -X POST http://127.0.0.1:3000/run -H 'Content-Type: application/json' \
  -d @input_examples/example_1.json | head -40
```

The `curl` must return a response with `request_id`, `trace_id`, `status`, `agents_used`,
`result`, `collaboration` and `log_path`, and the `log_path` file must exist.

Then run `bun run swarm` twice and confirm the two traces are **decision-identical**: the
same fixtures produce the same decisions, the same findings, the same citations, the same
confidences and the same agent order. **Only `timestamp` and `trace_id` may differ** —
they are wall-clock facts. If anything else differs, fix the adapter or the tracer — do
not paper over it.

**Do not freeze a timestamp to make the file look identical.** A trace whose timestamps
never move is a hardcoded artefact, and the anti-hardcode audit in P11 will find it.

Report back: the files you created, the exact commands you ran, and their output.
