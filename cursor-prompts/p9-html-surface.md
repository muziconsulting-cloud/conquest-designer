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

**The pages**

| Route | Shows |
| --- | --- |
| `/` | the exchange at a glance: how many listings, how many settled, how many held, the invariant that value only moves through settlement |
| `/listings` | every listing: agent, declared price, decision, status, and the memory ids its evidence cites |
| `/listing/:id` | one listing in full: the declared price, the evidence, the conflict critique, the escalation if any, the trace lines |
| `/avc/:id` | one certificate: the three facts, the signature, and a live **verify** result |
| `/agents` | the five agents, what each decided, and the trace |
| `/trace` | the JSONL trace, rendered |

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
