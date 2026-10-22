# RUNBOOK — the build window

**Window:** 2026-10-22T00:00Z → 2026-10-27T23:45Z.
**Builder:** Cursor (`cursor-agent`), driven from opencode. The opencode agent writes the
prompt, reviews the diff, runs the gates, and commits. It does not write product code.

**The one rule that decides whether this entry is honest:** every line of shipped
implementation is authored **inside** this window, in this repo, by Cursor. Anything
rehearsed beforehand was rehearsed in a throwaway copy outside the repo and is discarded,
not copied in.

---

## 0 · Before the clock starts (pre-window, legal)

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

## 1 · Clock start

```bash
export PATH="$HOME/.local/bin:$PATH"
cd /home/wardair/conquest-tinkerer
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

**If the credit runs short**, cut in this order: HTML surface polish → the offline LLM
adapter → self-listing → (never) an engine, the AVC, or the Zetaris adapter. The three
engines and the AVC are the score.

## 4 · Gates that must pass before submission

```bash
bunx tsc --noEmit                                  # exit 0
npx tsx vendor/meterless/hmem/conformance/runner.ts        # 13/13
npx tsx vendor/meterless/world-model/conformance/runner.ts  # 8/8
npx tsx vendor/meterless/markovian/conformance/runner.ts   # 8/8
python3 tools/hackathon-compliance/scripts/compliance_check.py   # 0 FAIL
```

`demo_video` and `slide_deck` are the two deliverables still open — record the walkthrough
of the running surface and cut the deck from the README's build-evidence table.

## 5 · The honesty rules for the write-up

- Say **"local protocol-compatible server"** for Zetaris, never "Zetaris integration"
  without that qualifier, until a real instance runs the same command.
- Say **"routing mode discovered at runtime"** for models, and name a model only if a
  recorded run actually used it.
- The offline LLM adapter is the demo path and is labelled as such.
- Every number on a page comes from the pipeline. No invented statistics.
