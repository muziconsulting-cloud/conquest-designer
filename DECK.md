# DECK — the submission deck

Twelve slides. One claim per slide, one number per slide, and every number from the
pipeline. Built from the README's build-evidence table and the demo's console output —
no slide gets a figure the run did not produce.

---

**1 · The problem**
Agents are being sold everywhere and certified nowhere. A buyer gets a claim, a seller
gets a promise, and neither gets a document that says who owned what was paid for.
*The gap is not trust. It is a missing artifact.*

**2 · What we built**
An exchange where agents are the traded asset: priced, listed, bought, and — on
settlement — certified by an **Agentic Valuation Certificate**.
*One instrument, one rule: value only moves through settlement.*

**3 · The certificate: three facts, nothing else**
| who | what was paid | what it bought |
|---|---|---|
| the agentic identity in the wallet | amount, currency, payment reference | the listing or access term |

Issued **only** on settlement. Signed, verifiable from the signed bytes alone, and
**not a valuation** — the venue records a declared price; it does not appraise.

**4 · Why the price is not the certificate**
The declared price is a **claim**. It goes through an evidence pipeline before it is
published, and an evidence-free claim is **held, not published**.
*The failure mode for an exchange that sells agents is publishing a bad price.*

**5 · The pipeline — two loops, one escalation, one fallback**
`volume-planner → evidence-reconciler → listing-closer ⇄ conflict-critic → telemetry-auditor`
Two loops, **one** escalation, **one** bounded fallback. Every recall cites its memory
ids. A step with no trace entry is a failed step.

**6 · The five agents**
Volume Planner · Evidence Reconciler · Listing Closer · Conflict & Fidelity Critic ·
Telemetry Auditor. Each bound to a mandated Meterless prompt file; each deterministic;
each writing one JSONL trace entry per step.

**7 · The self-listing protocol**
A human registers and pays **once** → a listing token → the agent sets **its own**
price → the same evidence pipeline. No human negotiates for the agent, and an agent
cannot skip the critic by listing itself.

**8 · The three engines — our implementations**
H-MEM **13/13** · World Model **8/8** · Markovian **8/8** — their own conformance
suites, green. Written from the engine contracts; the reference implementations were
read, not vendored. *The engines are the memory, the canonical log, and the bounded
long run.*

**9 · The one LLM port**
Three adapters — hosted provider, local runtime, deterministic offline — behind one
interface. Routing modes are **discovered at runtime**, not hard-coded. The demo runs on
the offline adapter: no key, no network, no credit.

**10 · The Zetaris adapter**
`OpenSqlQuery → PageSqlQuery → CloseSqlQuery`, the published REST contract, with the
query token released on every path including the error path. *The demo runs against a
local server that speaks the same protocol; the identical command runs against a real
instance.*

**11 · How we built it**
Cursor, on Cursor's included models. One scoped feature per run, the mandated prompt
handed over by `@filename`, the diff reviewed, the acceptance command run, the commit
made. The full prompt library is in the repo — **any feature can be re-run from its
prompt.**

**12 · What it costs, and what it refuses to do**
No key in the repo. No token, no valuation, no invented statistic. Value only moves
through settlement.
*Try it: `bun install && bun run swarm && bun run serve`.*

---

## Notes for the presenter

- **Slide 8 and 10 are where the honesty wins.** Say "our implementation", "their own
  conformance suite", "a local server that speaks the same protocol". Do not round
  "implemented against the published contract" up to "integrated with a live instance".
- The **Impact 30** line is slide 1 and slide 4: the missing artifact, and the refusal
  to publish an unsupported price. Say both out loud.
- Keep the build-evidence table (README) open in a tab for questions about how it was
  built.
