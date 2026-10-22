# RUNBOOK — the build window

**Window:** 2026-10-22T00:00Z → 2026-10-27T23:45Z.
**Builder:** Cursor (`cursor-agent`), driven from opencode. The opencode agent writes the
prompt, reviews the diff, runs the gates, and commits. It does not write product code.

**The one rule that decides whether this entry is honest:** every line of shipped
implementation is authored **inside** this window, in this repo. Anything rehearsed
beforehand was rehearsed in a throwaway copy outside the repo and was discarded, not
copied in.

**The build tool, stated honestly:** these prompts were written for Cursor, and Cursor
remains the target — but Cursor's allowance was exhausted for the whole window (account
monthly limit spent, API-key weekly limit reached inside the window, sponsor credit never
provisioned), so the implementation was written in **opencode** against these same
prompts. Each prompt carries its acceptance gate, so the build is replayable in Cursor
the moment credit exists. **If credit appears, replay every prompt in order** — that is
what closes the deviation.

---

## 0 · Where the build stands

- [x] `cursor-agent` installed and authenticated (`✓ Logged in as muziconsulting@gmail.com`).
- [x] Organiser **check 2** passed — Cursor created and ran a file with no API key.
- [x] Engine specs degit'd into `vendor/meterless/` (gitignored).
- [x] Reference conformance suites pass in-repo: H-MEM **13/13**, World Model **8/8**,
      Markovian **8/8**.
- [x] All eleven scoped prompts written (`p0`–`p10`).
- [x] `p1` and `p2` **rehearsed** on throwaway copies: Cursor's own implementation
      passed **13/13** and **8/8** first try, `tsc --noEmit` exit 0.
- [ ] Cursor **sponsor credit** claimed on the HackOS task board (account is on the Free
      tier — named models are blocked until the credit lands).
- [ ] Registration attested on HackOS.

## 1 · Start the build

```bash
export PATH="$HOME/.local/bin:$PATH"
cd /home/wardair/ConquestDESIGNER
npx degit meterless/meterless/engines/hmem vendor/meterless/hmem
npx degit meterless/meterless/engines/world-model vendor/meterless/world-model
npx degit meterless/meterless/engines/markovian vendor/meterless/markovian
git add -A && git commit -m "chore: fetch engine specs for the build window"
```

## 2 · The run loop, repeated for each of p0 → p10

```bash
cursor-agent -p "$(cat cursor-prompts/<file>.md)" --model auto --force --trust \
  --output-format json > logs/<step>.json 2> logs/<step>.err
```

Then **review, gate, commit** — in this order, every time:

```bash
git status --short && git diff --stat      # what did it touch?
bunx tsc --noEmit                            # typecheck gate
# + the step's own acceptance command from its prompt
git add -A && git commit -m "feat(<step>): <what the run built>"
```

A run that fails its gate is **rolled back** (`git reset --hard HEAD~1`), not debugged in
place. The prompt is then corrected and re-run. Never weaken an assertion to make a gate
pass.

**Evidence:** `logs/<step>.json` carries the usage record (model, tokens, duration) that
fills the README's build-evidence table. `logs/*.jsonl` is gitignored; the **summarised**
table is committed.

## 3 · Order and the gate each step buys

| # | Prompt | Acceptance gate | Rubric line |
|---|---|---|---|
| 1 | `p0-scaffold-wiring.md` | `bun run swarm` runs, `tsc` clean | Technical |
| 2 | `p1-hmem-engine.md` | H-MEM **13/13** | **Meterless** |
| 3 | `p2-world-model-engine.md` | World Model **8/8** | **Meterless** |
| 4 | `p3-markovian-engine.md` | Markovian **8/8** | **Meterless** |
| 5 | `p4-five-agents.md` | five agents, one trace line per step | Technical |
| 6 | `p5-orchestrator-escalation.md` | four fixture paths → accept/revise/hold/fallback | Innovation |
| 7 | `p6-zetaris-adapter.md` | Open→Page→Close exchange, same command for live | **Zetaris** |
| 8 | `p7-avc-on-settle.md` | certificate issues on settle, verifies, tampering fails | Innovation |
| 9 | `p8-self-listing.md` | register→pay→redeem→self-list; token reuse refused | Impact |
| 10 | `p9-html-surface.md` | every route 200, numbers come from the pipeline | Product & UX |
| 11 | `p10-llm-seam.md` | three adapters, one port, no key in the tree | Sponsor / in-kind |
| 12 | `p11-examples-and-audit.md` | 3 real outputs, hardcode audit clean, clean clone runs | **Submission integrity** |

**Where the build stands (2026-10-22, session 4): steps 1–9 are done and green**
(P0, P1–P3, P4/P5, P6, P7, P8). **P9 is next**, then P10, then P11 — which is never cut.

**P11 is not optional and it is not a polish step.** It produces the three real output
examples, the anti-hardcode audit, the documentation audit and the clean-clone proof.
A submission that claims a run it cannot reproduce is worth less than no submission.

**If the credit runs short**, cut in this order: HTML surface polish → the offline LLM
adapter → self-listing → (never) an engine, the AVC, or the Zetaris adapter. The three
engines and the AVC are the score. **Never cut P11** — it is the cheapest way to prove
the whole thing is real.

## 3a · The six-day plan, mapped to the steps

The organiser's build plan, mapped onto the steps above. **Run the steps in the
RUNBOOK order; this is the calendar it lands on.**

| Day | Date | Focus | Steps |
|---|---|---|---|
| 1 | 22 Oct | scaffold, wire the entry point, one real end-to-end run | P0, P6, P10 |
| 2 | 23 Oct | the agent loop, the feedback loop, the JSONL trace | P4, P5 |
| 3 | 24 Oct | the three engines green against their own suites | P1, P2, P3 |
| 4 | 25 Oct | the certificate, the self-listing, the surface | P7, P8, P9 |
| 5 | 26 Oct | real outputs, README, deck, **the demo video** | P11, docs |
| 6 | 27 Oct | final audit, secrets check, declare, **submit well before 23:45 UTC** | P11 gates |

**Two dates that are not negotiable:** the demo video must be **recorded and uploaded
by day 5** — a video recorded on the deadline day is a video that misses the deadline.
And the submission goes in **hours** before 23:45 UTC on the 27th, not minutes.

## 4 · Gates that must pass before submission

```bash
bunx tsc --noEmit                                  # exit 0
bun vendor/meterless/hmem/conformance/runner.ts         # 13/13   (Bun runs it; no tsx)
bun vendor/meterless/world-model/conformance/runner.ts #  8/8
bun vendor/meterless/markovian/conformance/runner.ts  #  8/8
bun run listing:selftest                           # the self-listing path, end to end
python3 tools/hackathon-compliance/scripts/compliance_check.py   # 0 FAIL
```

`demo_video` and `slide_deck` are the two deliverables still open — record the walkthrough
of the running surface and cut the deck from the README's build-evidence table.

**Also before submission** — the organiser's own final checklist, mapped line by line to
where each item is satisfied: [`docs/COMPLIANCE-MAP.md`](../docs/COMPLIANCE-MAP.md).

## 5 · The honesty rules for the write-up

- Say **"local protocol-compatible server"** for Zetaris, never "Zetaris integration"
  without that qualifier, until a real instance runs the same command.
- Say **"routing mode discovered at runtime"** for models, and name a model only if a
  recorded run actually used it.
- Say **"the facilitator is a local stub"** for the x402 payment path — the request shape
  is real, the rail is not. No chain, no provider, no money moved.
- The offline LLM adapter is the demo path and is labelled as such.
- Every number on a page comes from the pipeline. No invented statistics.
