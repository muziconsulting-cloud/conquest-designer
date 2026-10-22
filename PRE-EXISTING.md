# Pre-existing components — the declaration

**Rule 4.2 (Build window):** *"Work committed before the window opens is not eligible,
except for clearly declared pre-existing components."*
**Rule 5.4:** *"Pre-existing product code must be declared in the submission form."*

This file is that declaration, in full. Everything below was committed **before
2026-10-22T00:00Z** and is tagged **`pre-window-scaffold`**. Everything committed
*after* that tag is the build — authored inside the window, by Cursor.

Verify it yourself:

```bash
git diff --stat pre-window-scaffold..HEAD     # everything the build window produced
git show pre-window-scaffold --stat           # exactly what was pre-existing
```

---

## 1 · Pre-existing, declared — and what it is

| Path | What it is | Why it is pre-existing |
|---|---|---|
| `.cursor/rules/conquest.mdc` | The project rules Cursor loads on every run. | Written before the window. |
| `prompts/` | The **mandated Meterless prompt library** (9 files) — the patterns each agent and engine is bound to. | Supplied by the sponsor, copied in before the window. |
| `cursor-prompts/` | The scoped Cursor prompts (P0–P10) + `RUNBOOK.md` — the build instructions. | Written before the window; the build *executes* them. |
| `src/types.ts` | The **shared contracts** — types only, no behaviour. | Written before the window. |
| `src/llm/port.ts` | The **interface** of the one LLM port, plus the provider contract as comments. | Written before the window. |
| `src/zetaris/adapter.ts` | The **interface** of the Zetaris adapter, plus the published REST contract as comments. | Written before the window. |
| `src/README.md` | The folder map and the invariants. | Written before the window. |
| `fixtures/listing-set.json` | The four fixture paths (accept / revise / hold / fallback). | Written before the window. |
| `README.md`, `SPONSORS.md`, `DECK.md`, `DEMO.md`, `metadata.json`, `BUILD-PROMPTS.md`, `FIRST-PRINCIPLES.md`, `PLAN.md` | The documentation, the deck outline, the demo script, the submission metadata. | Written before the window. |
| `package.json`, `bun.lock`, `tsconfig.json`, `.gitignore`, `.env.example` | Toolchain. | Written before the window. |
| `tools/hackathon-compliance/` | The organiser's compliance checker, vendored for self-verification. | Pre-existing tool. |

### The line we drew, on purpose

**Pre-window = contracts, interfaces, prompts, docs, fixtures, toolchain.**
**In-window = every implementation.**

Nothing in the pre-window set *does* anything. `src/types.ts` declares shapes;
`src/llm/port.ts` and `src/zetaris/adapter.ts` declare contracts that the in-window code
fills in. There is no engine, no agent, no orchestrator, no settlement path, no adapter
implementation and no surface in the pre-window set. The engines, the five agents, the
orchestration, the Zetaris adapter, the AVC issuance path, the self-listing protocol,
the HTML surface and the three LLM adapters are **all** written inside the window.

## 2 · Pre-existing, declared — and deliberately **not** in this repository

| Component | Where it lives | How it is reached |
|---|---|---|
| The **WardByWard / Conquest platform** — Bun + TypeScript, server-rendered, SurrealDB, running in production. Its money engine (`writeLedger` transfer rail, the 40.492T TIME supply invariant, the 1,440/day allocation payroll), its escrow state machine, its settlement/certificate rail, its account-mint rail. | A separate, private production deployment. | Over its HTTP API, if configured. **No source is copied here.** |
| The private architecture document and the AVC definition of record. | Private. | Not published, not shown to judges. |

**What the pre-existing platform contributes, precisely:** the settlement semantics — a
strict two-of-two escrow whose `settled` transition is the point at which value moves
and the certificate is issued. The **concepts** (escrow, settlement, a certificate of
record) are pre-existing; the **implementation in this repository** is new work.

The private moat — the derivation that produces the platform's own unit from sun,
area and time — is **not** disclosed here, and nothing in this repository reproduces it.

## 3 · Third-party, pre-existing, and simply used

| Item | Licence | How it is used |
|---|---|---|
| **Meterless H-MEM / World Model / Markovian** engine specs | Apache 2.0 | Read from their `AGENTS.md` contracts. **Not vendored** — fetched at build time into gitignored `vendor/`. Their reference implementations were read, never copied; our implementations are our own. Attribution in `SPONSORS.md`. |
| **Zetaris** published REST contract + `getting-started` / `lightning-catalog` | Apache 2.0 / MIT | Read to implement the client. No Zetaris source vendored. |
| **Bun**, **TypeScript** | MIT / Apache 2.0 | The runtime and the language. |

## 4 · What we are *not* claiming

- We do not claim the Meterless **provider** (the hosted model surface). The engine
  gate is met by our own implementations passing their published conformance suites.
- We do not claim a live Zetaris instance. No instance was reachable; the client speaks
  the published contract and the demo runs it against a local server speaking the same
  protocol. The identical command runs against a live instance by changing one
  environment variable.
- We do not claim a NVIDIA account, key or billing. Nemotron is reached through the
  Meterless fleet, the way a Cursor user reaches Grok through Cursor.
- We do not claim the pre-existing platform as our work, and we do not claim the
  in-window build as pre-existing. The tag draws that line.
