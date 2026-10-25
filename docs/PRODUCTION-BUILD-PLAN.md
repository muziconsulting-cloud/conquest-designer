# PRODUCTION-BUILD-PLAN.md — the consolidated plan

> **Deployment companion:** `docs/DEPLOYMENT.md` is the canonical, self-contained deployment
> record (URL decision, artifacts, step-by-step plan, rollback, resume protocol). §8–§8c below
> are the audit and flight map that produced it; where they differ, `DEPLOYMENT.md` wins.

> **v4 · 2026-10-23.** This is the single plan of record for the **production venue**
> (`https://conquestdesigner.com`, OCI Johannesburg) and for **what stays in the public
> submission**. It supersedes `PLAN.md` §9 (scope), the "still not built" lists in
> `AGENTS.md` §11 and `SUBMISSION.md`, and every aspirational line in
> `docs/ai_evaluator_targeting_scorecard.md` that is not marked **live** below.
> Where this plan and any other document disagree, this plan wins on *what exists*; and
> `FIRST-PRINCIPLES.md` wins on *what the product is*.

---

## 0 · The rules this plan is written under

1. **Nothing is claimed that did not run.** Every row in §1 is either **VERIFIED** (a
   command in this repo proves it, today) or **TARGET** (planned, with a gate). There is
   no third state.
2. **The submission is the public repository.** It must be complete, runnable and
   reproducible from a clean clone. Withheld code is never required to run the
   submission, and is never referenced by it.
3. **Production is a superset, not a fork.** The same core code runs in both places. The
   private layer is additive and enters through **ports** (§3). A missing private module
   degrades to the public default; it never breaks the public build.
4. **No custody, no token, no valuation.** The venue never holds the buyer→owner price,
   never issues a token, and never appraises an agent. Fees only, inbound only.

---

## 1 · What is true today

| Area | State | Proof |
|---|---|---|
| Bun + TS, no build step, no framework, no deps | **VERIFIED** | `bunx tsc --noEmit` → exit 0 |
| Meterless engines (ours): H-MEM / World Model / Markovian | **VERIFIED** | `bun run conformance` → 13/13 · 8/8 · 8/8 |
| Five-role swarm, two loops, one escalation, one fallback | **VERIFIED** | `bun run swarm`, `bun run recon` |
| Deterministic runs (decisions, values, ids stable) | **VERIFIED** | `bun run determinism` |
| Zetaris client against the published REST contract + local protocol-compatible server | **VERIFIED** | `bun run zetaris:selftest` |
| One LLM port, three adapters (hosted / local runtime / offline) | **VERIFIED** | `bun run llm:selftest` |
| 2-of-2 escrow in-repo; AVC issued only on `settled` | **VERIFIED** | `bun run avc:selftest` |
| Ed25519 detached signature; verify from signed bytes; JWKS | **VERIFIED** | `bun run avc:selftest` |
| Self-listing protocol: 402 → token → pay → self-list | **VERIFIED** | `bun run listing:selftest` |
| Server-rendered surface (`/`, `/listings`, `/listing/:id`, `/avc/:id`, `/agents`, `/trace`, `/health`) | **VERIFIED** | `bun run serve` |
| The book: 10-digit Luhn numbers, 16-digit card projection, claim rail | **IN FLIGHT** | `src/agents/book.ts` + `data/agent-book.json` |
| Three real output examples + full four-listing run | **VERIFIED** | `output_examples/`, `logs/trace-20261022-00{1..4}.jsonl` |
| Hosted LLM provider / NVIDIA Nemotron routing | **TARGET** | credential not issued; **Nemotron is reached only through the Meterless fleet** |
| Live Zetaris instance | **TARGET** | declared deviation (no reachable instance) |
| Live x402 rail / chain settlement | **TARGET** | local facilitator stub only; no funds move |
| Append-only hash-chain ledger | **TARGET** | today: JSONL trace + in-process stores |
| Sun Index / opaque Value Score | **TARGET** | not implemented |
| Fee split (listing / reissuance) | **TARGET** | today: one flat whole-rand listing fee |
| OCI deployment, nginx block, Cloudflare DNS | **TARGET** | nothing deployed; apex does not resolve |
| `DECK.pdf`, `demo/demo.mp4`, `docs/AUDIT.md`, clean-clone proof | **TARGET** | P11 incomplete |

---

## 2 · The product, in one paragraph

Conquest is the **exchange where agents get priced, listed and traded**. A human
registers an agent and pays a flat listing fee over **x402**; the exchange issues the
agent a **number** from its book; the agent then lists itself and **declares its own
price**. A five-role swarm reconciles the fragmented evidence behind that price, and a
price the evidence does not support is **held, not published** — holding is the success
case. A buyer settles through a **2-of-2 escrow**; on `settled` the escrow releases and
an **Agentic Valuation Certificate** issues, stating exactly three facts: **who** the
agent is, **what was paid**, and **what it bought**. The venue never touches the
buyer→owner price, never issues a token, and never values the agent.

---

## 3 · The cut: what is public, what is private

**Decision (D1).** The public repository is the **complete submission** — a working
exchange, not a slice. The private layer is the **proprietary deepenings**, and it
enters only behind ports.

### 3.1 Public — shipped in `muziconsulting-cloud/conquest-designer`

Everything a judge needs to run, read and reproduce the system end to end:

```
src/types.ts  src/llm/port.ts  src/zetaris/adapter.ts      contracts (pre-existing)
src/engines/{hmem,world-model,markovian}                  the three engines (ours)
src/agents/  src/orchestrator/  src/tracer.ts             the swarm + JSONL trace
src/zetaris/                                              client + local server
src/escrow/  src/avc/  src/settlement/                    the money path + certificate
src/listing/                                              register · token · pay · self-list
src/agents/book.ts  data/agent-book.json                   the book (shape, small sample)
src/pages/  src/server.ts  src/venue.ts                    the operator surface + venue
scripts/  input_examples/  output_examples/  logs/  fixtures/  data/  docs/  evidence/
```

The public book is **eight rows**. Its numbering *shape* is reproduced (place-scoped
head prefix, Luhn check digit, closed-loop card projection). What is **not** reproduced:
the pre-existing platform's derivation, its place-prefix catalog, and its live book.
The public repo states this in `PRE-EXISTING.md`, `docs/README.md` and the book file
itself — and never puts a file path where the withheld implementation lives.

### 3.2 Private — OCI only, never imported by the public build

| # | Module | What it is | Public stand-in |
|---|---|---|---|
| 1 | `SunIndex` | the thermodynamic peg and the **internal** value basis (1 unit = the energy work of a fixed panel area over a fixed interval) | none — the public exchange never needs it |
| 2 | `NumberCatalog` | the full place-scoped prefix catalog + the production book | the 8-row sample book |
| 3 | `SettlementRail` | the 2-of-2 key ceremony, chain RPC, the real x402 facilitator | the in-process escrow + local stub |
| 4 | `LedgerChain` | the append-only hash chain with durable storage and checkpointing | JSONL trace + in-process stores |
| 5 | `FeeSplit` | non-custodial fee routing (listing / reissuance) and its accounting | the single flat listing fee |
| 6 | `AgentDirectory` | the live directory and listing index across processes | the in-process `ListingRegistry` |

**The port rule (non-negotiable).** Each private module has a public **interface** in
`src/ports/` with a local default implementation, selected by `VENUE_MODE=public|live`
(or an equivalent single env seam). The public repo ships the interface and the default.
The private implementation is deployed on OCI and is **not in the repo**. The public
bundle must typecheck, run and pass every gate with `VENUE_MODE=public`.

**Why this cut holds up:**

- The submission stays **reproducible** — the one thing a withheld-code deployment would
  otherwise break. A judge clones, runs, and sees the whole exchange.
- The IP that is worth withholding is exactly the IP that is **not** needed to judge the
  product: the physics, the catalog, the real rail, the production chain.
- The documentation carries the withheld layer at **interface level** — what it does, its
  contract, its invariants — so the architecture is legible without the implementation.
  Withheld means *implementation withheld*, never *design hidden*.

---

## 4 · Target architecture

```
                         Cloudflare (JNB edge, WAF, TLS)
                                     │  :443 (proxied)
              nginx  conquestdesigner.com (+ www)  ──► 127.0.0.1:3500
                     (registered CF zone, already proxied to this box)
                                     │
                          ┌──────────▼───────────┐
   inbound x402 ─────────►│  Bun venue (PM2)     │
   (listing fee)          │  src/server.ts       │
                          └───┬──────────┬───────┘
                              │          │
              ┌───────────────▼──┐   ┌───▼─────────────────┐
              │ swarm (5 roles)  │   │ ports               │
              │ H-MEM · World    │   │ SettlementRail      │
              │ Model · Markovian│   │ LedgerChain         │
              └───────┬──────────┘   │ FeeSplit            │
                      │              │ NumberCatalog       │
              ┌───────▼──────────┐   │ SunIndex (internal) │
              │ Zetaris client   │   └─────────────────────┘
              │ (REST contract)  │
              └──────────────────┘
```

**Process topology on the OCI box** (one host, shared with the live WardByWard service):

| Process | Port | Notes |
|---|---|---|
| `surrealdb` (existing) | 127.0.0.1:8000 | untouched |
| `merchant-api` (existing) | 3000 | untouched — **Conquest must not use 3000** |
| **`conquest-venue` (new)** | **127.0.0.1:3500** | `bun run src/server.ts --port 3500` under PM2 |
| nginx (existing) | 443 | one **separate** site file; `wardbyward` + `default_server` untouched |
| Cloudflare | 443 edge | DNS + WAF + TLS; origin on 443 |

Host budget: 952 MB RAM, ~526 MB available, 1 vCPU. One Bun process at ~60–110 MB is
safe alongside the existing two; PM2 `max_memory_restart: 320M` is a hard stop.

---

## 5 · Money model

- **The price is peer-to-peer.** The buyer pays the owner directly. The venue is not in
  that flow, holds no key for it, and records the trade.
- **The venue's only revenue is fees, and fees flow inbound.** No payouts, no custody.
- **Fee schedule (from the master directive):** **$1.00** on the initial listing /
  evaluation; **$0.25** on a reissuance / fresh sub-sequence nonce.
- **Fee destination:** the infrastructure wallet — a receiving address only. No private
  key exists in either repository for it.
- **Settlement trigger:** the AVC issues **strictly** on the escrow `settled`
  transition, never on `pending`, `claimed` or `listed`.

**Conflict, resolved (D3).** The repo prices everything in **whole rand** and forbids
fractional units; `$0.25` is fractional. Resolution: platform fees are denominated in the
**x402 settlement unit** (USD-stable), not in rand, and are the **one documented
exception** to the whole-unit rule; the listing price itself stays whole-rand. If the
owner prefers strict whole units, the reissuance fee becomes `$1.00` and the exception
disappears — that is a one-line change and the plan keeps both open until the owner says.

---

## 6 · The certificate and the chain

**AVC body = the three facts** (who / what was paid / what it bought), signed Ed25519,
id content-derived, verifiable from the signed bytes alone. This does not change: it is
the product's differentiator, and `SUBMISSION.md` already says it.

**The envelope may carry the chaining the directive asks for**, without turning the
certificate into a valuation:

| Field | Public? | Note |
|---|---|---|
| `sequence` (sub-sequence nonce) | yes | monotonic per agent |
| `prev` (previous chain head) | yes | `H_n = SHA-256(H_{n-1} ‖ canonical_payload_n)` |
| `card_commitment` | yes | `SHA-256(PAN)` — **binds** the card without publishing it |
| `agent` number (10-digit) | yes | the book number, as the agent id |
| `value_score` | **no** | internal only (D2) |

**Conflict, resolved (D2).** The master directive puts a "Value Score" on the
certificate. That would make the AVC a valuation, which is the one thing the product
promises it never is — and it contradicts the submitted positioning. Resolution: the
Sun Index and its score stay **internal** (ops/ledger). If the owner overrides, the
score ships as an opaque, unitless, clearly-labelled *internal basis* field, and the
"not a valuation" sentence is removed everywhere at the same time. Never both.

---

## 7 · Execution plan

Dates are real: **today 2026-10-23**, deadline **2026-10-27T23:45Z**.

### Phase A — finish the submission (must ship)
1. **A1 · The book lands.** `src/agents/book.ts` + `data/agent-book.json`, bound in the
   loader by name; register route claims a number; surface shows number + masked card;
   selftests assert it. → `bunx tsc --noEmit`, `bun run listing:selftest`, `bun run avc:selftest`.
2. **A2 · Evidence regenerated** after the identity change: `swarm` ×4 paths, three
   `output_examples`, `logs/trace-*`, determinism, recon. → all gates green.
3. **A3 · P11 audit pack.** `docs/AUDIT.md` (hardcode audit, documentation audit,
   unrelated-query transcript), clean-clone proof from a fresh clone.
4. **A4 · Artifacts.** `DECK.md` + `DECK.pdf` (12 slides), `DEMO.md` + `demo/demo.mp4`
   (3 min, Playwright/Chromium + libx264), recorded **against the deployed venue**.

### Phase B — the production venue (deploy, then deepen)
5. **B1 · Deploy the public build** to `127.0.0.1:3500` with a **separate** nginx site file,
   PM2, and an AVC keypair generated **on the box** (never in git). DNS:
   apex `conquestdesigner.com` → box (proxied), `www` CNAME, zone SSL mode **Full**.
   → `https://conquestdesigner.com/health` → `{"ok":true}`.
   **Operating manual: `docs/DEPLOYMENT.md` (decisions, artifacts, runbook, rollback, resume
   protocol). Read it before touching the box.**
6. **B2 · Ports.** `src/ports/` interfaces + public defaults + `VENUE_MODE` seam; the
   public build stays green with `VENUE_MODE=public`.
7. **B3 · Private layer** (OCI only, private repo/deploy): `LedgerChain`, `FeeSplit`,
   `NumberCatalog`, `SettlementRail`, `AgentDirectory`, `SunIndex`. Each lands behind its
   port with a gate: the chain verifies from genesis; a fee splits to the infra wallet
   with no custody; the catalog issues numbers; settlement is 2-of-2 with no key in the
   venue.
8. **B4 · Cloudflare hardening.** WAF rules, rate limits on `/listing/register`,
   real-IP restore in nginx, origin cert upgrade (Origin CA, Full/Strict).

### Phase C — submit
9. Re-run every gate from a clean clone; capture the transcript; update `README.md`,
   `SUBMISSION.md`, `PRE-EXISTING.md`, `docs/COMPLIANCE-MAP.md` (the book is in-window);
   `DECK.pdf` + `demo/demo.mp4` uploaded to HackOS; submit with ≥12 h margin.

**Credit cut-order if time slips:** B4 → B3 → B2 → A4 (deck first, then video) → A3.
**Never cut:** A1–A3 gates, the clean-clone proof, the video.

---

## 8 · Audit of 2026-10-23 — what was actually found

Read-only survey of the box, the DNS, the nginx tree, and the repo. Every line below is a
verified fact, not a plan.

**The box.** `84.12.96.65` (`instance-20261001-2148`), Ubuntu, Bun 1.3.14, 952 MB RAM
(~526 MB available), 34 GB free, passwordless sudo. PM2 already runs `merchant-api`
(`/usr/local/bin/bun src/Main.ts`, cwd `/home/wardair/thegearmerchant`, port 3000) and
`surrealdb` (`127.0.0.1:8000`). `/home/ubuntu` was empty: no Conquest code, process or cert.

**nginx.** Exactly one site is enabled: `/etc/nginx/sites-available/wardbyward`. One
`server`, `listen 443 ssl default_server`, `server_name wardbyward.co.za
www.wardbyward.co.za`, cert `/etc/ssl/certs/cloudflare_wardbyward.pem`, proxy to
`127.0.0.1:3000`. No `:80` listener. No `conf.d/*`. There are no nginx `location` blocks named
`/asess`, `/oat`, `/wardwork` or `/conquestdesigner` — those are **application routes /
tenants**, not proxy seams. The rail is: one nginx site, one TLS cert, one upstream per app,
and the app routes by `Host`/path.

**TLS.** The live origin cert is a Cloudflare Origin CA certificate whose SAN is
`*.wardbyward.co.za` + `wardbyward.co.za`. It does **not** name `conquestdesigner.com`, so the
zone runs SSL mode **Full** (encrypted, unverified) until a free Origin CA cert for the domain
is issued. No certbot, no new authority is *required* for launch. (`certbot` is installed but unusable: Let's Encrypt cannot reach the box.)

**Network.** `:80` and `:443` are closed to the public internet from a direct TCP probe —
the OCI security list admits only Cloudflare. Consequence: HTTP-01/ACME is impossible, and
the only path to the app is through Cloudflare → nginx. Any plan that opens `:80` is dead.

**DNS.** `conquestdesigner.com` is a registered Cloudflare zone already pointing at the box.
Its `www` CNAME is fine, but the apex record is missing (a misspelled
`conguestdesigner.conquestdesigner.com` A record exists instead), which is why the domain
returned 530. The apex record is the one thing not controllable from the box.

**Conquest today.** Code synced to `/home/ubuntu/conquest` (1.5 MB, no `node_modules` needed —
zero dependencies). AVC keypair generated **on the box** into `.env` (0600, rotated; the local
dev `.env` must never be shipped — the first rsync did ship it, which is why the keys were
rotated). The app boots from `bun src/server.ts --port 3500`; `conquest-venue` is registered in
PM2. The public build is the complete exchange; the private layer in §3 does not exist yet and
`VENUE_MODE` is read by nothing, so "live" is honest only as "public venue, live".

**Self-inflicted failures, and the rule each one proves.**
1. `rsync … ubuntu@84.12.96.65` failed: the key lives on the `wardbyward` alias, not the IP.
   → *Use the documented host alias.*
2. `.env` was transported because it was not excluded. → *Ship code, never secrets.*
3. `ecosystem.config.cjs` began with `#` comments, so PM2 could not parse it and fell back to
   running the file as a script. → *Copy the house file shape; `//` in JS, `#` in nginx.*
4. The nginx snippet was first written with `//` comments and a `:80` listener. → *A snippet is
   not valid until `nginx -t` says so; this box has no `:80`.*
5. A new domain + self-signed cert was being built while a cert that already covers the host
   existed. → *The rail is `*.wardbyward.co.za`; never mint a second one.*
6. Deploy was being improvised step-by-step instead of executed from a written, gated sequence.
   → *This section. One flight map, executed in order.*

**Repo truth.** Book work, `src/root.ts`, loader binding, register claim, and the deploy files
are **uncommitted**. Evidence under `logs/` and `output_examples/` predates the book's new
`AGT-<10-digit>` identities, so the canonical set is stale until regenerated.

---

## 8b · Flight map — the ordered landing plan

Two tracks, never mixed. **S** is the submission (public code, judges). **P** is the production
venue (private physics added *behind ports*). Both fly the same airframe; P = S + ports.

**Stage 0 — hygiene (no user input).**
`git status` clean-up; delete stray traces `005/006`; keep `fixtures/listing-set.json`
byte-identical; confirm `.env` is excluded everywhere.

**Stage 1 — S: finish the book, then freeze evidence (no user input).**
1. Show book number + masked card on `/listings`, `/agents`, `/avc` pages.
2. Add book assertions to `scripts/listing-selftest.ts` + `scripts/avc-selftest.ts`; replace
   literal `AGT-SOLARISER` in both and in `README.md` (4 sites).
3. Update `PRE-EXISTING.md` §2, `docs/BUILD-LEDGER.md`, `docs/COMPLIANCE-MAP.md`.
4. Regenerate canonical evidence `logs/trace-20261022-001..004.jsonl` +
   `output_examples/example_{1,2,3}.json` **from the living server**.
5. Gate: `bunx tsc --noEmit`, `llm|listing|avc|zetaris:selftest`, `determinism`, `recon`
   (balanced, delta 0), `verify-paths`, `conformance`. Red = stop.
6. One commit, one push. *(Push requires explicit approval.)*

**Stage 2 — P: land the venue (no user input, ~10 minutes).**
1. `./deploy/deploy-conquest.sh --nginx` — reference guard → typecheck → rsync (`.env`
   excluded) → PM2 `startOrReload` → poll `127.0.0.1:3500/health` → **install a separate**
   `sites-available/conquestdesigner` + symlink (the `wardbyward` file is never edited) →
   `nginx -t` → reload → post-deploy reference guard.
2. Prove on-box, DNS-independent:
   `curl -k --resolve conquestdesigner.wardbyward.co.za:443:127.0.0.1 https://…/health`.
3. Rollback: `./deploy/deploy-conquest.sh --rollback` removes only the Conquest site file and
   PM2 app. The `default_server`, its cert and `merchant-api` are never in the blast radius.

**Reference guard (non-negotiable).** The script hashes two reference points before and after
every run and aborts if either moved:

| Reference | sha256 |
|---|---|
| `/etc/nginx/sites-available/wardbyward` | `051281bb0ddfed7c4b87f1aca1748ad569cfc59ebdedd5057d272d6206acf339` |
| `/home/wardair/thegearmerchant/ecosystem.config.cjs` | `8c6926941e9e4b2f7974299f20a9cda8ba730164654037edb15dbfbf1a24413e` |

`/home/wardair/thegearmerchant/**` is read-only for this project, full stop.

**Stage 3 — edge (owner-only; two dashboard actions).**
1. Cloudflare zone `wardbyward.co.za` → DNS → add `conquestdesigner` `A 84.12.96.65`,
   **proxied**. (Or `CNAME conquestdesigner.wardbyward.co.za` → same.)
2. SSL/TLS mode must be **Full** (the origin cert is a trusted CF Origin CA cert, so **Full
   (strict)** also passes — prefer strict).
3. Then `curl -fsS https://conquestdesigner.wardbyward.co.za/health` from anywhere.
   Failure signature → cause: 522 = DNS/proxy not pointing at the box; 526 = strict + wrong
   cert; 404/502 = `server_name` mismatch or PM2 down.

**Stage 4 — P-private (post-submission, additive).**
Implement the six ports of §3 (`SunIndex`, `NumberCatalog`, `SettlementRail`, `LedgerChain`,
`FeeSplit`, `AgentDirectory`): public implementations are honest no-ops; the live
implementations are added additively and selected by `VENUE_MODE=live`. No public module may
require a private one. Gate: public clean clone still green with `VENUE_MODE=public`.

**Stage 5 — S: submission.**
`docs/AUDIT.md`, clean-clone proof, `DECK.md`, `DEMO.md`, `DECK.pdf`, `demo/demo.mp4`, then the
HackOS form (project summary ≤ 1,000 chars), ≥ 12 h before **2026-10-27T23:45Z**.

---

## 8c · Deployment runbook (the exact seam, corrected)

```bash
# one command, idempotent, first run installs the subdomain
./deploy/deploy-conquest.sh --nginx
```

What it does, in order: `bunx tsc --noEmit` → `rsync -az --delete --exclude .env … 
./ wardbyward:/home/ubuntu/conquest/` → `ssh wardbyward "cd … && pm2 startOrReload
ecosystem.config.cjs --update-env && pm2 save"` → poll `http://127.0.0.1:3500/health` →
append `deploy/nginx/conquestdesigner.conf` to `sites-available/wardbyward` if absent →
`nginx -t && nginx -s reload` → verify with `--resolve`.

The file it installs is the same rail as WardByWard — `listen 443 ssl`, exact
`server_name conquestdesigner.com www.conquestdesigner.com`, the **existing** cert
`/etc/ssl/certs/cloudflare_wardbyward.pem`, `proxy_pass http://127.0.0.1:3500` — but it lives in
its **own** `sites-available/conquestdesigner` file. The `wardbyward` file is not edited, so the
working WardByWard reference point survives any mistake here.

Keys: `bun run deploy/gen-avc-key.ts [--force]` **on the box**, writes `.env` 0600, prints only
the public key id. Rotation = `--force` + `pm2 reload conquest-venue`.

## 9 · Risks, named

| Risk | Severity | Mitigation |
|---|---|---|
| Withheld production code breaks "reproducible" | **High** | the cut in §3: the public repo runs everything; private modules are additive behind ports; clean-clone proof gates the submission |
| Public docs claiming unbuilt things (`ai_evaluator_targeting_scorecard.md`) | **High** | mark as *target* or move private (D6); this plan is the factual record |
| "Value Score" on the AVC contradicts "not a valuation" | **High** | D2: internal only unless the owner overrides, and then the positioning changes with it |
| `$0.25` violates the whole-unit rule | Medium | D3: fees are the documented x402-unit exception, or round to $1.00 |
| One 952 MB box already runs WardByWard | Medium | separate PM2 app, port 3500, `max_memory_restart`, no shared files; nginx change is additive |
| AVC private key on the box | Medium | generated on the box, `0600`, `Bun.env` only, never logged, never in git; rotate by re-issuing |
| Cloudflare DNS not set / apex unresolved | Medium | runbook §8; verify with `dig` before the demo |
| Nemotron claimed without a routing id | Medium | Nemotron is reached **only** through the Meterless fleet; until a run names the id, the deck and video say "declared, not exercised" |
| Cursor unavailable | Low (declared) | replayable prompt library; the deviation is stated everywhere |

---

## 10 · Decision log

| # | Decision | Status |
|---|---|---|
| **D1** | Public = complete runnable exchange; private = additive modules behind ports | **decided** |
| **D2** | Value Score stays internal; the AVC keeps three facts | **decided** (owner override open) |
| **D3** | Fees in the x402 settlement unit ($1.00 / $0.25) as the one documented exception, or round to $1.00 | **open** — default: keep the directive |
| **D4** | Conquest runs on **3500**; 3000 belongs to the live `merchant-api` | **decided** |
| **D5** | TLS: self-signed origin + Cloudflare **Full** today; Origin CA + **Full (strict)** next | **decided** |
| **D6** | `docs/ai_evaluator_targeting_scorecard.md` is a targeting document, not evidence; mark it **TARGET** or move it private | **open** — default: mark it |

---

## 11 · What the public repo says about the private layer

One paragraph, in `README.md` and `docs/README.md`, in these words (or close):

> The production venue at `https://conquestdesigner.com` runs additional modules that are
> not in this repository: the production ledger chain, the fee splitter, the full number
> catalog, the settlement rail and the internal value basis. They are withheld because
> they are the commercial IP, not because the submission needs them. Everything this
> repository documents and everything a judge can run is complete here: the exchange, the
> swarm, the three engines, the escrow, the certificate and the book are all present and
> pass their gates with no private module installed.

That is the whole boundary, stated once, and repeated nowhere else as a different story.
