# `src/` — folder shape

The declared pre-existing set (rule 4.2) is **contracts and interfaces only** — see
`BUILD-PROMPTS.md` §3: docs, scaffolds, connector interfaces, sample data and prompts.
No agents, no orchestrator, no engines, no qualifying logic. The implementation is
what the build adds on top of this.

```
src/
  types.ts            shared contracts — types only, no logic
  llm/                the ONE model seam: one port, three adapters   [build window]
    port.ts           the port — the interface every agent talks to
    health.ts         the Meterless wire: <host>/v1, bearer auth, routing ids
    provider-adapter.ts   the hosted Meterless provider
    local-adapter.ts      the local Meterless Runtime (found, not assumed)
    offline-adapter.ts    the deterministic renderer (no key, no network)
    index.ts          which adapter speaks for this run
    local-server.ts   a server that speaks the wire format (the selftest's other end)
  zetaris/
    adapter.ts        the Zetaris REST-contract adapter (interface only)
    local-server.ts   a protocol-compatible server (the selftest's other end)
  engines/            our Meterless engine implementations   [build window]
    hmem/
    world-model/
    markovian/
  agents/             the five swarm roles                    [build window]
    volume-planner.ts
    evidence-reconciler.ts
    listing-closer.ts
    conflict-critic.ts
    telemetry-auditor.ts
  orchestrator/       the loops, the escalation, the fallback [build window]
  listing/            the self-listing protocol: 402, token, self-declared price
  escrow/             the 2-of-2 settlement
  settlement/         the settled transition that issues the certificate
  avc/                the certificate: three facts, an Ed25519 signature
  pages/              the operator surface — server-rendered HTML, no framework
  venue.ts            the one receiving address every rand lands at
  loading.ts          the fixture loader and the source registry
  tracer.ts           the JSONL trace sink
  index.ts            `bun run swarm` entry point             [build window]
  server.ts           `bun run serve` — server-generated HTML  [build window]
scripts/
  conformance.ts      runs the three Meterless suites against OUR impls [window]
  recon.ts            the money invariant check                [window]
  determinism.ts      two runs, compared entry by entry        [window]
  llm-selftest.ts     the one port, three adapters, the contract on the wire
  zetaris-selftest.ts the published REST contract, end to end
  avc-selftest.ts     escrow -> settlement -> certificate, verified
  listing-selftest.ts register -> 402 -> pay -> redeem -> self-list
  verify-paths.ts     the four fixture paths, as described      [window]
```

## The rules the code must keep

- **One LLM port.** No agent calls a model directly.
- **No exception may abort a run.** Every sponsor call degrades gracefully;
  `SAMPLE_MODE` is the deterministic offline path, not a lesser mode.
- **Whole rand only.** No cent denominations anywhere a user or funding touches.
- **Listings only.** The swarm recruits listings; it does not sell.
- **The certificate is the product.** We never issue a token.
- **One JSONL trace entry per agent step**, so every decision is reproducible.
