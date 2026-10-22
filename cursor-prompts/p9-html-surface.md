# P9 — the operator surface (server-rendered HTML, no framework)

**Context, from files — do not ask for it to be pasted:**

- `src/types.ts` — the shared contracts.
- `src/agents/`, `src/orchestrator/`, `src/avc/` — what the surface displays.
- `fixtures/listing-set.json` — the fixture paths to display.
- `.cursor/rules/conquest.mdc` — the house rules.

**Objective.** Implement a **server-rendered HTML** surface under `src/pages/` plus a
small router in `src/server.ts` (Bun.serve). **No client framework, no bundler, no
build step, no npm dependency.** Plain HTML strings with inline `<script>` where a page
needs to be interactive. Bun runs the TypeScript directly.

> `src/server.ts` already exists — P0 created it with the **`POST /run`** programmatic
> entry point. **Keep `POST /run` working and unchanged.** You are adding the HTML
> routes to the same server, not replacing it. `POST /run` is what a judge calls
> without clicking anything; the HTML is what a judge reads. Both must work.

**The pages**

| Route | Shows |
| --- | --- |
| `/` | the exchange at a glance: how many listings, how many settled, how many held, the invariant that value only moves through settlement |
| `/listings` | every listing: agent, declared price, decision, status, and the memory ids its evidence cites |
| `/listing/:id` | one listing in full: the declared price, the evidence, the conflict critique, the escalation if any, the trace lines |
| `/avc/:id` | one certificate: the three facts, the signature, and a live **verify** result |
| `/agents` | the five agents, what each decided, and the trace |
| `/trace` | the JSONL trace, rendered |
| `/health` | `{"ok":true}` — so a judge can check the service is up |

**The judge's quick start belongs in the README.** A judge who has never seen this
codebase must be able to reach a working run in four commands, copy-pasteable, with
the expected output shown. Put this exact block in `README.md` (the run uses the
port the README says, and the command is the one the README documents):

```bash
bun install
bun run swarm -- --input input_examples/example_1.json
bun run serve -- --port 3000
curl -s -X POST http://127.0.0.1:3000/run -H 'Content-Type: application/json' \
  -d @input_examples/example_1.json
```

The `curl` must print the response contract from P0, and `README.md` must show that
response. **The README's commands are the judge's first impression of whether this
runs** — if a command in the README does not work, the whole submission reads as
unverified. Every command in the README must be one that was actually run.

**The rules**

- **Server-rendered, always.** No hydration, no SPA, no client-side data fetching for
  the first paint. A page must be readable from its HTML alone.
- **The surface never asserts what it cannot show.** If a listing is held, the page says
  held and shows the critique. If a certificate is not issued, there is no certificate
  page — the route returns a clear "not issued" state, not a fake one.
- **Numbers are the engine's numbers.** Do not restate or recompute balances, prices, or
  totals — read them from the pipeline's own output. If a number is not in the data, do
  not show it.
- One shared layout helper (`src/pages/layout.ts`) so the pages look like one product.
- Escape every value that reaches the page. No value is trusted.

**Do not**

- No dependencies. Bun + TypeScript only. No React, no Preact, no Tailwind, no CDN
  script tags.
- No build step, no bundler, no `tsc` emit.
- No test files, no test framework.
- Do not change `src/types.ts`.
- Do not invent statistics. Every number on a page must come from the pipeline.

**Stop rule — the run is done when:**

`bunx tsc --noEmit` exits 0, and `bun run serve` starts the server and every route
above returns HTTP 200 with a body that contains the fixture data (one listing, its
evidence, and its trace). `bun run serve -- --port 3001` must be the documented way to
start it, and `README.md` must carry that command.

Report back: the files you created, the route table, the HTML of one page verbatim (so
the structure can be reviewed without a browser), and how you proved a held listing is
shown as held.
