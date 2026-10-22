# DEMO — draft structure (provisional)

> **PROVISIONAL DRAFT — NOT THE DELIVERABLE.**
> This is the *plan* for the video, written before the system was built. Every route,
> command and behaviour in it **does not exist yet**. The real `DEMO.md` is generated
> **after the build**, from the running application — a shot that the app cannot show is
> **cut from the script**, not faked.
> **Do not record this as it stands.** Use it for the structure, the timecodes and the
> honesty lines; replace the shots with what the app actually does.


**The claim the video has to earn:** an agent can be priced, listed, bought and
certified — and the certificate says only three things, all of them true.

**Target length: 3:00.** The organiser allows 1–4 minutes. **Record it on day 5, not
on deadline day** — a video recorded at 23:40 is a video that misses the deadline.

**The deliverable description requires four things in the video.** They are marked
`[workflow]` `[challenge]` `[features]` `[sponsors]` against the shots that carry them.
The compliance checker's `demo_video` gate looks for a real video file
(`*.mp4 / *.mov / *.webm / *.mkv`) in the repository — so **put the exported file in the
repo** as `demo/demo.mp4`, and also upload it (unlisted YouTube or Drive) because the
submission form wants a URL.

---

## Pre-flight — before you press record

Do these once, then record with a clean desktop:

```bash
bun install
npx degit meterless/meterless/engines/hmem        vendor/meterless/hmem
npx degit meterless/meterless/engines/world-model vendor/meterless/world-model
npx degit meterless/meterless/engines/markovian   vendor/meterless/markovian
bun run conformance        # 13/13, 8/8, 8/8 — the numbers you quote must be THESE
bun run swarm -- --input input_examples/example_1.json
bun run serve -- --port 3001
curl -s -X POST http://127.0.0.1:3001/run -H 'Content-Type: application/json' \
  -d @input_examples/example_1.json | head -40
```

- [ ] Terminal font **large** (18–20pt). The trace lines are the point — do not let them shrink.
- [ ] Browser zoom **110%**, browser window full-width, **notifications and tabs cleared**
      (a judge can read a tab title, and your tab bar is not part of the product).
- [ ] `SAMPLE_MODE=true` in `.env` — the demo must not wait on a credential.
- [ ] No `.env`, no key, no personal account visible in any window.
- [ ] The `curl` above works. **If the programmatic call does not work, the video is not ready.**
- [ ] Your screen is not mirrored to a meeting app. No cursor wandering.

---

## The shot list

Ten shots. **Narration is written to be read as-is** — do not improvise, the timing is
budgeted. A shot that fails is re-shot; it is never left broken.

### Shot 1 · Title card — 0:00 → 0:12

**SCREEN:** black card, one line, then the pipeline diagram fading in behind it.
**ON-SLIDE TEXT:** `Conquest` / *the exchange that certifies what you paid for*
**NARRATION:**
> "This is Conquest. It is an exchange where the agent is the traded asset — priced,
> listed, bought, and certified when the trade settles."

---

### Shot 2 · The challenge — 0:12 → 0:32  `[challenge]`

**SCREEN:** the exchange home page `/`, the "held" listing visible in the list.
**NARRATION:**
> "The problem is not that agents are being sold. It is that they are being sold with
> nothing behind the price. A buyer gets a claim, a seller gets a promise, and neither
> gets a document that says who owned what was paid for. So the first thing this
> exchange does is refuse to publish a price the evidence does not support. That held
> listing you can see there — that is the design working, not the design failing."

**IF IT FAILS:** use a still of the home page and keep the narration — but this shot must
show a real held listing, so fix the fixture instead of cutting the shot.

---

### Shot 3 · The workflow, end to end — 0:32 → 1:06  `[workflow]`

**SCREEN:** `/listings` → click one listing → `/listing/:id`.
**ACTION:** scroll the evidence, the critique, the escalation.
**NARRATION:**
> "Here is one listing in full. The agent declared its own price. The pipeline pulled the
> evidence, reconciled what disagreed, and cited the memory ids it used — you can see
> those citations on the page. The conflict critic then tried to break the listing.
> Here is what it objected to, and here is what the closer did about it. Every step of
> that is in a JSONL trace, one line per step, with the agent that took the next step
> named on it. A step with no trace line is a failed step."

**IF IT FAILS:** show the trace file directly in the terminal (`cat logs/<runId>.jsonl`)
and narrate over it — the trace is the stronger shot anyway.

---

### Shot 4 · The certificate — 1:06 → 1:38  `[features]`

**SCREEN:** `/avc/:id` — the certificate, then the verify action.
**ACTION:** verify it. Then show a tampered copy failing verification.
**NARRATION:**
> "A trade settled, and only then was a certificate issued. It says three things. Who —
> the agentic identity in the wallet. What was paid — amount, currency, payment
> reference. And what it bought — the listing or the access term. Three facts. It is not
> a valuation, the venue records a declared price and does not appraise, and it is not a
> token. Verification reads the signed bytes alone — it does not ask the issuer whether
> it is happy. Watch: one character changed, and it fails."

**IF IT FAILS:** show only the valid certificate and the verify output. Do not narrate the
tamper test if you cannot show it.

---

### Shot 5 · The agent lists itself — 1:38 → 2:00  `[features]`

**SCREEN:** terminal.

```bash
bun run listing:selftest
```

**NARRATION:**
> "A human registers and pays once. That buys a listing token — the right to list, once.
> The agent then sets its own price and goes through the same evidence pipeline as anyone
> else. It cannot skip the critic by being self-listed. And the token is good for one
> listing: watch what happens when it is used twice."

**IF IT FAILS:** the reuse refusal is the shot. If the self-test does not exist, show the
`/listings` page and narrate the protocol — but the reuse refusal is worth the retake.

---

### Shot 6 · The fallback — 2:00 → 2:16

**SCREEN:** terminal, two runs.
**ACTION:**

```bash
SAMPLE_MODE=true bun run swarm                      # the normal path
METERLESS_BASE_URL=http://127.0.0.1:9 bun run swarm  # the dependency is dead
```

**NARRATION:**
> "Now the dependency is down. The run does not fall over and it does not pretend. It
> degrades to one bounded deterministic decision, marks it in the trace, and finishes.
> The trace tells the truth about what happened."

**IF IT FAILS:** keep the first command and narrate the fallback from the trace line
that says it. Do not fake a dead dependency.

---

### Shot 7 · The engines — 2:16 → 2:36  `[sponsors]`

**SCREEN:** terminal.

```bash
bun run conformance
```

**NARRATION:**
> "These are our implementations of three Meterless engines, passing Meterless's own
> conformance suites — thirteen out of thirteen for H-MEM, eight out of eight for the
> World Model, eight out of eight for Markovian. H-MEM is the memory the reconciler and
> the critic cite. The World Model is the canonical event log the auditor reads. We
> wrote them from the engine contracts. We did not vendor the reference
> implementations."

**IF IT FAILS:** **do not quote a number you cannot show.** Say the suites are the gate and
show the command; fix it and re-shoot. A wrong number here is the one thing a judge will
check.

---

### Shot 8 · The federation — 2:36 → 2:52  `[sponsors]`

**SCREEN:** terminal.

```bash
bun run zetaris:selftest
```

**NARRATION:**
> "The federation layer is Zetaris. Our client speaks the published REST contract — open
> the query, page it with the query token, close it, on every path including the error
> path. The demo runs it against a local server that speaks the same protocol, because
> no shared instance was granted to us. That is a documented deviation, not a hidden one.
> The stub is server-side, the client is real, and the identical command runs against a
> live instance."

**IF IT FAILS:** keep the narration honest — say the contract, show the code path, and
name the deviation. Do not imply a live instance you did not reach.

---

### Shot 9 · The close — 2:52 → 3:00

**SCREEN:** the certificate page, or the exchange home page.
**NARRATION:**
> "One rule: value only moves through settlement, and every settlement leaves a
> certificate that says three true things. The exchange is on GitHub, and the build is
> reproducible from the prompts in the repository."

**ON-SLIDE TEXT (end card):** the repo URL.

---

## The video, as a submission

**Title:** `Conquest — the exchange that certifies what you paid for`

**Description:**

> Conquest is an exchange where the agent is the traded asset: priced, listed, bought, and
> certified on settlement by an Agentic Valuation Certificate that records exactly three
> things — who, what was paid, and what it bought. It is not a valuation and not a token.
>
> The interesting part is what it refuses. A declared price goes through an evidence
> pipeline — a volume planner, an evidence reconciler, a listing closer and an adversarial
> conflict critic, over three Meterless engines (H-MEM, World Model, Markovian), each
> gated by Meterless's own conformance suite. When the evidence does not support the
> price, the listing is held rather than published. Holding is a feature.
>
> Five agents, two loops, one bounded escalation, one JSONL trace line per step.
> Built spec-first, one scoped prompt per feature, each with its acceptance gate; every
> prompt is in the repository, so any feature can be re-run from it.
>
> Zetaris: our client speaks the published REST contract (OpenSqlQuery → PageSqlQuery →
> CloseSqlQuery, query token released on every path). No shared instance was granted, so
> the demo runs the identical command against a local server that speaks the same
> protocol — a documented deviation.
>
> Repository: github.com/muziconsulting-cloud/conquest-designer

**Upload:** unlisted YouTube (or Drive). Then **put the file in the repository** as
`demo/demo.mp4` — the organiser's own compliance monitor looks for a real video file in
the repo, and a form URL alone will not satisfy it.

**Export:** H.264 MP4, 1080p, 30fps. Check the file plays before you upload it.

---

## Recording rules

- **One take, but a retake is free.** A shot that breaks is re-shot — the fallback lines
  above are there so a broken shot never ends up in the file.
- **Never show a number the pipeline did not produce.** If a panel is empty, say it is empty.
- **The Zetaris and model-provider lines are spoken, not implied.** The judges will check.
- **No slides during the demo.** The video is the product. The deck is a separate deliverable.
- **Do not show the terminal scrolling faster than it can be read.** Cut to the output, let
  it sit for a beat, then talk.
- **Under 4 minutes is a rule, not a target.** 3:00 with room to breathe is safer.
