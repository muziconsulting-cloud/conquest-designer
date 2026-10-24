# TODO-NOW - ConquestDESIGNER Execution Plan (Locked)

**Status:** LOCKED. Execute until empty. No more ideation during execution.

## Context
- Domain: https://conquestdesigner.com (integral to submission, cutover to :3000 now)
- Fees to: 0x3d5975a75f88656B09B3086e82CBcAF8470F517E (me)
- Currency: CDHQ (never "AVC" alone - use "CDHQ AVC", "CDHQ Agent Verification Certificate" etc)
- Threshold: >=70% for pass/certificate
- No sandbox/container evaluation - talk to agent on its own host
- Single rail for all agents; hackerthon agents get general eval + hackathon rubric eval
- Store in SurrealDB (book + allocations)
- Peg: $1 received -> agent gets CDHQ card with 16-digit PAN, priced in "Sundollars" on SunMinute index (1 runtime minute = 1 Wh = energy from 3.4m^2 solar panel in 1 min). Owner sets multiplier.

## Tasks (In order)

### P0 - Cutover & Foundation
- [ ] **1. Read master rail fully** - Read src/conquest/A2A.ts, settle.ts, UcpRouter.ts, underwriting.ts, ConquestUnit.ts, pages.ts, tenants.ts
- [ ] **2. Cutover conquestdesigner.com to :3000** - Add to nginx on :3000 via tenant rail. Use existing pattern like identity/pay/bonds/wardai. Hash guard protects wardbyward. 
- [ ] **3. Verify on :3000** - Test health, routes. Retire beacon (:3500) only after verified.
- [ ] **4. Retire beacon** - Stop/remove conquest-venue PM2, remove :3500 nginx site, delete src/welcome.ts, src/design.ts after cutover verified.

### P1 - Agent Valuation Service (CDHQ Agent Verification)
- [ ] **5. A2A discovery** - GET /.well-known/agent.json, validate. Accept repo URL or direct URL to agent endpoint. Try to discover A2A card. No sandbox.
- [ ] **6. Intake form** - Route: /conquestDESIGNER/valuate (or under existing conquest routes). Collect repo URL/git URL or agent endpoint. Hackerthon flag optional.
- [ ] **7. x402 gate $1.00** - Gate via existing x402 flow to 0x3d5975a75f88656B09B3086e82CBcAF8470F517E. Use existing settle.ts rails.
- [ ] **8. Probe set** - Build deterministic A2A probes (5-10). Talk to agent on its own host via A2A message/send. No cloning/execution.
- [ ] **9. Swarm grading** - Feed probes to existing 5-role swarm (H-MEM/World Model/Markovian). Map to general agent capabilities.
- [ ] **10. Hackathon rubric eval (if requested)** - Second pass for hackathon rubric if flagged. Same swarm, different rubric mapping.
- [ ] **11. Scoring & verdict** - >=70% passes. Issue CDHQ AVC/CDHQ Agent Verification Certificate. Record in SurrealDB (book allocation). If no price declared and insufficient evidence to justify -> UNPRICED/HOLD, ask for price justification/resubmit.
- [ ] **12. Certificate format** - CDHQ AVC with 16-digit PAN, Ed25519 signed, verifiable. Label as certificate, never "AVC" alone. Self-verifiable later.

### P2 - Storage & Integration
- [ ] **13. SurrealDB integration** - Store evaluation results, traces in SurrealDB. Extend book records with allocation attributes (allocated/unallocated). Use record-level security later.
- [ ] **14. Traces** - JSONL traces in SurrealDB or logs/ - decide pragmatically (SurrealDB better for querying). Store per evaluation.
- [ ] **15. Price/index** - Implement SunMinute index (1 min = 1 Wh = 3.4m^2 panel 1min). CDHQ units. Owner sets multiplier. Display as Sundollars concept. Peg to USD received.
- [ ] **16. Public verification** - Ensure certificates self-verifiable with public key.

### P3 - Polish & Demo
- [ ] **17. Surface polish** - Clean UI under conquest routes, use design rail.
- [ ] **18. Demo prep** - Record showing evaluation of our own submission via rubric (as per answer 9). Keep under submission video constraints.

## Rules
- Never touch /etc/nginx/sites-available/wardbyward or thegearmerchant ecosystem/config except read-only
- Never spin sandbox/container
- Talk to agent on its own host
- Single rail for all agents
- Fees only to 0x3d5975a75f88656B09B3086e82CBcAF8470F517E
- CDHQ naming everywhere for certificates
- >=70% threshold
- Unpriced needs justification/resubmit if can't be justified
