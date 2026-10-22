# DEMO — the 3-minute walkthrough

**The claim this demo has to earn:** an agent can be priced, listed, bought and
certified — and the certificate says only three things, all of them true.

**Setup (before you record):**

```bash
bun install
npx degit meterless/meterless/engines/hmem vendor/meterless/hmem
npx degit meterless/meterless/engines/world-model vendor/meterless/world-model
npx degit meterless/meterless/engines/markovian vendor/meterless/markovian
bun run conformance        # 13/13, 8/8, 8/8
bun run swarm              # the pipeline over the fixtures
bun run serve -- --port 3001
```

Record at a terminal with the browser beside it. No slides during the demo.

---

### 1 · The exchange at a glance — `/`

> "This is the exchange. Agents are the things being traded. Here is what has been
> listed, what settled, and what is being held."

**Say while it is on screen:** every number on this page came out of the pipeline.
Nothing is hard-coded.

### 2 · A listing with its evidence — `/listings`

> "Each listing carries a declared price and the memory ids its evidence cites. The
> citation is the point — a claim that cannot name where it came from is refused, not
> shown."

**Say while it is on screen:** click one listing. Go to step 3.

### 3 · One listing in full — `/listing/:id`

> "Price, evidence, critique, escalation, trace. The conflict critic tried to break this
> listing. Here is what it found."

**Say while it is on screen:** the trace shows every step and which role took it.

### 4 · The held listing — `/listings` → the held one

> "This one is **held**. Its evidence does not support its declared price, so it was not
> published. Holding is a success, not an error — the failure mode for an exchange that
> sells agents is publishing a bad price."

### 5 · The certificate — `/avc/:id`

> "A trade settled, and only then was a certificate issued. It says three things: **who**
> owns the listing — an agentic identity in a wallet; **what was paid**; and **what it
> bought**. It is not a valuation, and it is not a token."

**Say while it is on screen:** show the verify result. Then show that a tampered
certificate fails verification. "Verification reads the signed bytes. It does not ask
the issuer whether it is happy."

### 6 · An agent listing itself — the self-listing path

```bash
bun run listing:selftest
```

> "A human registers and pays once. That buys a listing token — the right to list, once.
> The agent then sets its **own** price and goes through the same evidence pipeline. It
> cannot skip the critic by being self-listed. Watch what happens when the token is
> reused."

**Say while it is on screen:** the reuse is refused.

### 7 · The fallback — the run still finishes

```bash
METERLESS_PROVIDER_URL= SAMPLE_MODE=true bun run swarm
# then, with the provider pointed at a dead port:
METERLESS_PROVIDER_URL=http://127.0.0.1:9 bun run swarm
```

> "When a dependency is down, the orchestrator does not fall over and does not pretend.
> It degrades to a deterministic decision and marks it in the trace. The run finishes;
> the trace tells the truth about what happened."

### 8 · The engines — the technical proof

```bash
bun run conformance
```

> "These are our implementations of three Meterless engines, passing their own
> conformance suites: **13/13**, **8/8**, **8/8**. We wrote them from the engine
> contracts; we did not vendor the reference implementations."

### 9 · The Zetaris adapter

```bash
bun run zetaris:selftest
```

> "Our client speaks the published Zetaris REST contract — open, page, close, with the
> query token released. The demo runs it against a local server that speaks the same
> protocol, because no shared instance was granted. This is the exact same command
> pointed at a real instance."

### 10 · Close

> "The exchange has one rule: value only moves through settlement, and every settlement
> leaves a certificate that says three true things. That is the whole product."

---

## Recording notes

- **One take, no edits** unless something breaks.
- Terminal font large enough to read. The trace lines are the point — do not cut them.
- **Do not show a number the pipeline did not produce.** If a panel is empty, say it is
  empty.
- The **Zetaris** and **local-runtime** honesty lines above are spoken, not implied. The
  judges will check.
