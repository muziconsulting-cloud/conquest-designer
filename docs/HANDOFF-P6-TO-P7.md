# Handoff: P6 → P7/P8

**Date:** 2026-10-22T07:00:00Z  
**Repo:** /home/wardair/ConquestDESIGNER  
**Branch:** master  
**Commit:** 40302fb (pushed to origin/master)  
**Previous:** 537615e

## Gates (all passing)
- [x] `bunx tsc --noEmit`
- [x] `bun run scripts/zetaris-selftest.ts` (PASS)
- [x] `bun run swarm` — all four paths: accept / hold / revise / fallback
- [x] `bun run scripts/verify-paths.ts` (PASS)
- [x] `bun run scripts/determinism.ts` (PASS — identical traces/responses/ids)
- [x] `bun run scripts/recon.ts` (PASS)
- [x] `bun run scripts/conformance.ts` (H-MEM 13/13, World Model 8/8, Markovian 8/8)

## What landed in P6
**Zetaris protocol adapter + federated pull:**
- `src/zetaris/adapter.ts` — real client for published REST contract (`OpenSqlQuery` → `PageSqlQuery` → `CloseSqlQuery`), Basic login/refresh, bearer + `X-Org-ID` + fresh UUID `X-Request-ID` per request, `pageLimit` 1..100, `query()` closes in `finally`. `health()` uses `SELECT 1`.
- `src/zetaris/local-server.ts` — protocol-compatible server for local testing (no Docker/instance needed). Validates headers, enforces bounds, serves bounded SQL over tables.
- `src/zetaris/tables.ts` — projects fixtures into SQL tables with correct ordinals.
- `src/zetaris/reader.ts` — pulls over adapter, maps to `Listing` via `toEvidence()` (preserves observation ids/content ids).
- `src/zetaris/pull.ts` — `pullCandidates()`: tries live if `ZETARIS_BASE_URL` set, else local server, else degrades to file loader. Returns mode/requests/reason/baseUrl.
- `src/orchestrator/index.ts` — pulls candidates first; traces pull as `volume-planner` `query_source` with mode/requests/protocol; pull failure marks run degraded but doesn't abort.
- `scripts/zetaris-selftest.ts` — drives full contract end-to-end, verifies headers on wire, close on error path, bounds, and identity parity with file loader.
- `package.json` — added `zetaris:selftest`.

**Traces/examples regenerated:** `logs/trace-20261022-001..004.jsonl` and `output_examples/example_{1,2,3}.json` reflect the real pull (trace now starts with Zetaris pull line). Swarm still takes all four fixture paths identically.

## Next: P7/P8 (x402 + escrow + AVC on settle)
Start with the prompts in order:
1. `cursor-prompts/p7-x402-escrow.md` — inbound x402 payment, escrow hold, settlement mechanics
2. `cursor-prompts/p8-avc-on-settle.md` — issue AVC only on `settled`, certificate facts (identity, amount paid, term), signed/verifiable

**Key rails (do not violate):**
- **No changes to `src/types.ts`** unless the prompt explicitly requires and gates pass.
- **Engines never decide** — they store/retrieve/cite/record/learn only.
- **Close/settlement must close/release resources in `finally`** (same pattern as `ZetarisClient.query()`).
- **Whole-rand amounts only** (no cents in transactions).
- **Inbound x402 only** — never issue a token.
- **No exception may abort a run** — failures become trace entries, run continues.
- **Bound loops, one escalation max, one deterministic fallback.**
- **AVC only on `settled`**; facts limited to identity, declared amount paid, acquired listing/access term; never valuation/token.
- **Determinism preserved** — decisions/ids stable; only timestamps/run-id move.

**Gotchas to watch:**
- World Model `eventIds` capture in `listing-closer` takes tail slice; `telemetry-auditor` also captures events — don't duplicate logic carelessly.
- Critic revise/send-back: trace must show `target_agent` on handoffs and revise step answers critique.
- Money invariant (`40.492T`) not in scope yet — `scripts/recon.ts` explicitly says so. Don't redesign vault topology.
- `ZETARIS_REQUEST_ID` removed (must be fresh UUID per request per contract).
- Pull can be in `local` mode during build (no live instance) — that's fine, must be traced.

## Quick start for fresh session
```bash
cd /home/wardair/ConquestDESIGNER
bun install
bunx tsc --noEmit
bun run zetaris:selftest
bun run swarm
bun run scripts/determinism.ts
```
Read `AGENTS.md`, `README.md`, `docs/BUILD-LEDGER.md`, `docs/COMPLIANCE-MAP.md` first. Then follow `cursor-prompts/p7-x402-escrow.md`.
