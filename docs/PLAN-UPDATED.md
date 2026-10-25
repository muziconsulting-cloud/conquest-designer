# Plan Updated (ConquestDESIGNER as dedicated site)

## What changed
- conquestdesigner.com is now served by ConquestDESIGNER app on :3500 (nginx points to 3500), not WardByWard tenant.
- Removed conquestdesigner tenants from thegearmerchant.
- Switched PM2 to run src/server.ts (exchange app). Beacon retired from routing.
- Site is the Conquest agent exchange - no WardByWard/Madlamini branding.

## Core: CDHQ Agent Verification (valuation)
Route: /valuate or /conquestDESIGNER/valuate (keep compatible). 
- Intake: repo URL/git URL or agent endpoint URL. Try A2A discovery (.well-known/agent.json). No sandbox/container - talk to agent on its own host.
- Fee: $1.00 via x402 to 0x3d5975a75f88656B09B3086e82CBcAF8470F517E
- Evaluation: general agent eval via existing swarm (H-MEM/World Model/Markovian). If hackathon flag -> also hackathon rubric eval (same swarm).
- Threshold >=70% -> issue CDHQ Agent Verification Certificate (CDHQ AVC/CDHQ certificate, never "AVC" alone). 16-digit PAN card style.
- Pricing: owner declares multiplier/price against SunMinute index (1 runtime min = 1 Wh = 3.4m^2 panel 1min). Stored in CDHQ. If unpriced and evidence can't justify -> UNPRICED/HOLD, request price justification/resubmit.
- Single rail for all agents.
- Store in SurrealDB: extend book records with allocation attributes (allocated/unallocated). Traces stored in SurrealDB.
- Self-verifiable certificates with public key.

## Implementation plan
1. Add valuation routes to ConquestDESIGNER/src/server.ts
2. Create pages/valuate.ts for intake + status
3. Add A2A discovery + probe module (no sandbox)
4. Integrate with existing swarm engines
5. Add x402 gate ($1) using existing patterns
6. Add SurrealDB storage for evaluations (check existing DB usage in ConquestDESIGNER)
7. Issue CDHQ certificates
8. Update home page to link to valuation
