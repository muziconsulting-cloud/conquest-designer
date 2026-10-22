# P8 — the self-listing protocol

**Context, from files — do not ask for it to be pasted:**

- `src/types.ts` — `Listing`, `ListingRecord`, `ListingStatus`, `Avc`, `AgentIdentity`.
- `src/agents/`, `src/orchestrator/`, `src/avc/` — the pipeline an agent runs through.
- `src/llm/port.ts` — the one LLM port.
- `.cursor/rules/conquest.mdc` — the house rules.

**The idea.** A human registers once and pays once. That payment buys a **listing
token** for one agent. The agent then **lists itself**: it declares its own price, goes
through the evidence pipeline, and holds the AVC for what it sold. No human negotiates on
the agent's behalf, and no human sets the price for it.

**Objective.** Implement `src/listing/`:

- `src/listing/register.ts` — the human registration + payment step.
- `src/listing/token.ts` — issue and redeem the listing token.
- `src/listing/self-list.ts` — the agent's own listing path.
- `src/listing/payment.ts` — the x402-shaped payment request/verify pair.

**The rules**

- **Pay once, list once.** The payment receipt buys exactly one listing token; a token
  is single-use and is consumed on redemption. A second listing needs a second payment.
- **The payment rail is x402-shaped.** An HTTP `402` with the payment challenge in the
  headers, a client that pays, and a verification step. The **facilitator is stubbed
  locally** for the demo, and the README must say so in plain words — a stubbed
  facilitator with a real x402 request shape is honest; a fake "payment succeeded"
  boolean with no request shape is not.
- **The agent declares its own price.** The human's payment buys the *opportunity* to
  list, not the listing's price. The price is the agent's, and the evidence pipeline
  decides whether that price stands.
- **The declared price is a claim, not a fact.** It goes through the same evidence and
  conflict pipeline as any other listing. An agent cannot skip the critic by listing
  itself.
- **The listing token never grants value.** It grants the right to list, once.

**Do not**

- No dependencies. Bun + TypeScript only.
- No test files, no test framework.
- Do not change `src/types.ts`.
- No real money moves. No wallet keys, no chain calls, no payment provider credentials.
- Never log a payment token or a receipt secret.

**Stop rule — the run is done when:**

`bunx tsc --noEmit` exits 0, and `bun run listing:selftest` (create it in
`package.json`) prints the whole path:

```
register   -> payment requested (402, challenge issued)
pay        -> receipt verified against the facilitator
redeem     -> listing token <id> issued
self-list  -> listing <id> declared at <price>, evidence pipeline ran, decision: <accept|hold>
```

and then attempts a **second** listing with the same token and shows it being
**refused**. Exit 0.

Report back: the files you created, the payment request/response shapes, the selftest
output verbatim, and what stops an agent from reusing a token.
