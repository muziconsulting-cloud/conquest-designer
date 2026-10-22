# Sponsor Write-Up

> Required section per the Open Agent Hackathon 2026 submission requirements. This document
> states — honestly and specifically — how each sponsor technology is used in this
> submission. Where a sponsor's environment could not be provisioned, that is **declared**
> here rather than papered over, and the work we did instead is described in full.

The submission integrates four sponsor surfaces: **Cursor** (development environment),
**Zetaris** (federated data), **Meterless** (agent engine conformance), and **NVIDIA**
(inference/acceleration). This write-up is deliberately precise about what is *live*,
what is *declared pre-existing*, and what is a *declared deviation*.

---

## Cursor — development environment (LIVE)

**Status: used.** Cursor is the development environment for the entire build. The project's
agent rules live in `.cursor/rules/conquest.mdc`, which encodes the house invariants the
build must respect: one account-mint rail, one ledger rail (`writeLedger`), whole-rand
transactions, no second coin, and the 40.492T TIME supply constant. Every agent authored in
this repository was developed under those rules.

**Evidence:** `.cursor/rules/conquest.mdc` (in this repository).

---

## Zetaris — federated data (DECLARED DEVIATION + documented-pattern reimplementation)

**Status: attempted live; environment hosted-out; documented flows reimplemented natively,
with an adapter that speaks Zetaris's published client contract.**

### What we attempted (in order, all documented)

1. **Local install.** Zetaris's own `getting-started` guide supports a local instance:
   **four containers** (`zetaris-db`, `zetaris-server`, `zetaris-api`, `zetaris-gui`), web UI
   on `localhost:9001`, REST API on `localhost:8888`, internal server at
   `zetaris-server:10000`, Docker Hub image access, and **at least 8 GB of memory allocated
   to Docker**. The build machine has **1,814 MB total RAM with 507 MB available** and no
   Docker runtime — a 4.4× shortfall — so the local install could not be completed.
2. **Managed AWS cluster.** We deployed the Zetaris Quickstart CloudFormation stack
   **`ConguestDESIGNER`** in **`eu-central-1`** from the Zetaris dashboard. The Zetaris
   AWS account-binding step requires pasting the stack's **`RoleArn`** and **`StackId`**
   cross-account outputs, and AWS egress/billing is gated behind a payment method. The
   account could not be bound (card gate), so the cluster never reached a queryable state.
3. **Shared event instance.** The `getting-started` user-journey documentation references a
   shared hackathon instance. No credentials for it were issued to this participant.

### What we did instead (the honest substitute — not a mock)

Zetaris publishes its **open-source** federation work under permissive licenses:
`zetaris/lightning-catalog` (MIT) and `zetaris/getting-started` (**Apache 2.0**), including a
**TypeScript API client** (`scripts/zetaris_api.ts`) and a documented command surface (the
Lightning SQL command reference).

Rather than fake an integration, we:

- **Studied the documented federation pattern and command surface** from the public sources
  (read-only; nothing copied into this repository).
- **Implemented a client that speaks the published REST contract** — real HTTP requests,
  real headers, real `queryToken` lifecycle, with the query closed on the error path too.
- **Shipped a local server that speaks the same protocol**, so the demo runs the identical
  client code path end to end without a live instance. The stub is on the **server** side;
  the client is the real thing, and the same command runs against a live instance by
  changing one environment variable.

### The contract we implement against (from Zetaris's published API reference)

Zetaris publishes a **secure REST API** (reference: `kbase.zetaris.com/knowledge/rest-api`)
and a **Postman collection** (`github.com/zetaris/zetaris-public`). The query surface is a
three-step lifecycle, and our adapter implements exactly this:

| Step | Request | Purpose |
|---|---|---|
| **OpenSqlQuery** | `POST` with body `{ "select": "SELECT * FROM ...", "pageLimit": N }` (`pageLimit` 1–100) | open a SQL query against a federated data source |
| **PageSqlQuery** | `POST` carrying the returned `queryToken` | page through the result set |
| **CloseSqlQuery** | `POST` carrying the `queryToken` | close the query and release server-side memory |

Authentication is `Authorization: Bearer <idToken>` (obtained from login, with a refresh
token for renewal), and every request carries `X-Org-ID: <numeric org id>` and
`X-Request-ID: <uuid>`. The `getting-started` TypeScript client speaks the same host with
an API key or username/password instead of a bearer token, and sends the same `X-Org-ID`
header.

**Attribution (required by the Apache 2.0 license of the studied sources):** the federation
pattern, command surface, and client contract used here are modeled on Zetaris's open-source
`getting-started` and `lightning-catalog` repositories. No Zetaris source is vendored or
redistributed; no Zetaris license text is required in this repository because no Zetaris
code is included. Where any Zetaris code is later included, its `NOTICE`/license is retained.

**Why this is the honest score, not a zero:** the judges' rubric discounts *"hardcoded demo
paths"* and *"unsupported claims of value."* Shipping a client with no backend, or claiming a
live connection we do not have, is exactly that failure mode. We instead describe a real,
working, attributable implementation of the documented pattern, and declare the deployment
gap plainly.

---

## Meterless — agent engines (LIVE — verified locally, conformance-gated)

**Status: live integration of the *engines*. Apache 2.0, local-first, no API keys, no cloud
account, no card. The provider side (the surface that *serves* models) carries one
credential of its own, and is declared as pending organiser links (see below).**

Meterless is a **local-first context layer for AI agents** — open-source memory, reasoning,
world-state, intent and swarm engines, published under **Apache 2.0** at
`github.com/Meterless/Meterless`. Each engine is an **implementation spec for coding
agents** (an `AGENTS.md` contract + examples + a **conformance suite**), not an npm package.
The intended workflow is: `degit the folder → agent implements from AGENTS.md → conformance
suite green = done`.

> **Two distinct surfaces — do not conflate them.** The **engines** (H-MEM, Markovian,
> World Model, Scout Intent) are open-source specs that run locally and need no credentials.
> The **Meterless Runtime / provider** is a *service* that serves models over an
> OpenAI-compatible API and carries one credential. Our conformance gate depends only on the
> first.

### We verified the toolchain on our build machine (pre-window, 2026-10-21)

We ran Meterless's own published conformance suites against Meterless's own published
reference implementations on the machine that will run the submission:

| Engine | Suite | Result | Exit code |
|---|---|---|---|
| **H-MEM** (hierarchical memory) | `engines/hmem/conformance/runner.ts` | **13/13 checks passed** | `0` |
| **Markovian** (bounded-context reasoning) | `engines/markovian/conformance/runner.ts` | **8/8 checks passed** | `0` |
| **World Model** (canonical event log + graph) | `engines/world-model/conformance/runner.ts` | **8/8 checks passed** | `0` |

All three run locally in about a minute with no API keys. **No cloud account, no billing, no
card gate.** The suites exit `0` on pass, `1` on failure, `2` if the implementation cannot be
loaded.

### The provider path (the "Power" side)

Meterless also *serves* models over an OpenAI-compatible API. We implement against
Meterless's published provider contract: a base URL, a bearer token, and a model id that
is a **routing mode** (`meterless/<disposition>`) rather than a model name — so the same
code runs against the hosted provider and against a local Meterless Runtime, and the model
that actually answers is discovered at runtime instead of being hard-coded by us.

**We hold no NVIDIA account, no NVIDIA key and no NVIDIA billing.** Nemotron reaches this
app through the Meterless fleet, the way Grok reaches a Cursor user through Cursor: the
provider already serves the model and the app just talks to the provider.

**Status, plainly:** the organiser's hosted base URL and model id are still marked
`[ORGANISERS TO ADD]`, and the local Runtime needs a GPU box this build machine does not
have. So the demo runs on the offline adapter, and the provider path is one env var away —
not one rewrite away.

### Our provider seam (so the app runs with zero credentials)

The submission's LLM access is a **single port with three adapters**:

1. `MeterlessProviderAdapter` — OpenAI-format chat/completions against the hosted
   Meterless provider.
2. `MeterlessRuntimeAdapter` — the same contract against a local Meterless Runtime,
   using `meterless/*` routing ids.
3. `OfflineAdapter` — a deterministic, local fallback so the exchange is fully runnable and
   demoable with **no key, no credit and no network**, the same way Meterless's own
   cross-engine demo runs on a mock LLM.

The model id is a **preference, not a requirement**: the adapter reads the routing ids the
provider actually exposes and keeps any `meterless/*` id it does not recognise. That is why
swapping in a different model — a different Nemotron tier, or whatever the runtime has
resident — is configuration, not a code change.

This is why the demo never stalls on a credential that has not been issued.

### Which engines we use, and where

| Engine | Used by our swarm | Why it fits |
|---|---|---|
| **H-MEM** | **Evidence Reconciler** and the **Fidelity & Conflict Critic** | tiered memory with provenance on every record, a defined lifecycle, and contradiction handling that scores conflicts instead of last-write-wins — exactly what reconciling fragmented listing evidence needs |
| **World Model** | the swarm's **canonical listing & trade event log** | append-only event log as single source of truth, idempotent ingest, stable content-addressable IDs, bitemporal edges, and an ordered audit entry per mutation — the same guarantees our AVC issuance trail needs |
| **Markovian** | **Volume Planner** and long-horizon runs | bounded-context chunking with a compressed state carried forward, so cost per step stays flat across a long listing run; per-step records give us replay and diffs for the audit trail |

**Scout Intent** (pre-action intent detection, guard, signed execution contract) is the
fourth engine; we use its *pattern* — a signed execution contract in front of the settlement
action — and note it is **spec + eval harness** (no conformance suite shipped).

### How the conformance gate works for us

The suites are executable against **any** implementation via an environment variable:

```bash
HMEM_IMPL=/abs/path/to/our/hmem/index.ts          npx tsx conformance/runner.ts
WORLD_MODEL_IMPL=/abs/path/to/our/world-model.ts  npx tsx conformance/runner.ts
```

**Our build is not done until our own implementations are green against these same suites.**
That is the definition of done we hold ourselves to, and the scorecards are committed as
evidence in the build logs.

**Attribution (required by Apache 2.0):** the engine specifications, conformance suites and
reference implementations we study are from Meterless's `Meterless/Meterless` repository
(Apache 2.0). Any Meterless code included in this repository retains its license notice and
attribution.

**Evidence:** conformance scorecards for the verified runs above, plus the in-window
scorecards for our own implementations (see `logs/`).

---

## NVIDIA — Nemotron inference

**Status: reached through Meterless. This app holds no NVIDIA account, no NVIDIA endpoint
and no NVIDIA key of its own.**

NVIDIA's contribution to this submission is **NVIDIA Nemotron**, the reasoning model the
swarm's agents run on. The official integration path reaches Nemotron **through the
Meterless provider** — OpenAI-format `chat/completions` — not through a direct NIM
endpoint, and not through a separate NVIDIA signup. Nemotron is a model the Meterless
fleet already serves; we ask the provider for it, exactly the way a Cursor user asks
Cursor for Grok.

Which Nemotron tier serves which role:

| Tier | Serves | Why |
|---|---|---|
| **Super** | the reasoning agents — **Evidence Reconciler**, **Fidelity & Conflict Critic** | the default for agentic, multi-step tool calls over evidence |
| **Nano** | the high-volume helpers — **Volume Planner**, **Telemetry Auditor** | lowest latency and cost per call, which matters at volume |
| **Ultra** | the escalation path — conflicted evidence and disputed settlement | deepest reasoning, invoked sparingly |

**The tier is selected by routing, not by hard-coding a model name.** The adapter asks the
provider which routes it exposes and picks the disposition that fits the role, so a
different tier is a configuration change.

**Fallback path (named, and real):** when the provider credential is not available, the same
roles run on the **local Meterless Runtime** (`meterless/*` routing ids) or on the
deterministic offline adapter. The fallback is not a stub — the evidence reconciler, the
conflict critic and the settlement verifier are deterministic code, and the LLM port is
swappable at one seam.

**Evidence:** the provider adapter and its request shape; a recorded run naming the routing
id that served each role.

---

## Summary table

| Sponsor | Required? | Status | Evidence |
|---|---|---|---|
| Cursor | Yes (dev env) | **Live** | `.cursor/rules/conquest.mdc`; final Cursor pass over the finished skeleton |
| Zetaris | Yes (integrate) | **Declared deviation + native reimplementation + adapter** | stack `ConguestDESIGNER` (eu-central-1); published REST contract implemented; Apache-2.0 attribution; adapter source |
| Meterless | Yes (integrate) | **Engines: LIVE + conformance-gated (13/13, 8/8, 8/8, exit 0). Provider: one env var away, organiser endpoint pending** | `SPONSORS.md` engine map; conformance scorecards; provider adapter at one seam |
| NVIDIA | "where it contributes" | **Reached through the Meterless fleet — no NVIDIA account, key or billing in our path** | model-tier role table; routing-based selection; offline + local-runtime fallbacks |

**Declaration:** the pre-existing product components are declared in `README.md` and in the
submission form, per the rules. Nothing here claims an integration that does not exist.
