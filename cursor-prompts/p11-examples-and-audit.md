# P11 — the examples, the audit, and the clean-clone proof

**Context, from files — do not ask for them to be pasted:**

- `src/` — the built system.
- `input_examples/` — the three request files P0 created.
- `output_examples/` — where the real outputs go.
- `README.md` — the documentation.
- `docs/DECK-draft.md`, `docs/DEMO-draft.md` — **provisional drafts** written before
  the build. They are the structure for the deck and the video script, not the
  deliverables. Step 5 turns them into the real thing.
- `.cursor/rules/conquest.mdc` — the house rules.

**Objective.** Produce the artifacts a judge uses to decide the submission is real:
**three genuine outputs, a hardcode audit, and a clean-clone proof.** Nothing here is
cosmetic. A judge who cannot reproduce a run does not score the run.

## 1 · Three real outputs, captured from runs

```bash
bun run swarm -- --input input_examples/example_1.json   # → output_examples/example_1.json
bun run swarm -- --input input_examples/example_2.json   # → output_examples/example_2.json
bun run swarm -- --input input_examples/example_3.json   # → output_examples/example_3.json
```

**The three examples must take three different paths** through the pipeline — one that
publishes a listing, one that is **held** because the evidence does not support the
declared price, and one that takes the **fallback** because a source is unavailable. A
judge checks this by reading the three files: three different decisions, three
different `collaboration` blocks.

**The rules**

- The files are **written by the run**, never by hand. If a run cannot write them, the
  run is not finished.
- **No runtime code may read `output_examples/`.** Grep for it and there must be no hit
  outside the audit below. They are evidence, not fixtures.
- Each file is the **full response** from `POST /run`, pretty-printed, and nothing else.
- The `log_path` inside each response must point at a trace that exists in `logs/`.

## 2 · The hardcode audit — do not skip it

Run this and **read every hit**:

```bash
grep -R "output_examples" src/ | grep -v "audit"      # must be empty
grep -R -nE "return \{|return \[" src/agents/ src/orchestrator/   # read each one
grep -R -nE "if .*user_query|if .*request_id" src/     # branches matching known inputs
grep -R -n "SAMPLE_MODE" src/                          # every hit must be a real branch
```

Then ask Cursor to audit, and **act on the table**:

> Audit this codebase for hardcoded outputs or fake functionality. Look for: final
> answers stored in code; sample outputs returned at runtime; functions that pretend to
> call a model, Zetaris or Meterless; agents that ignore their input; if/else branches
> matching known test prompts; logs not tied to actual agent execution. Return a table
> with file, line, risk and fix.

**The test that matters:** run the app with **two unrelated queries** and confirm the
outputs are meaningfully different. If two different questions produce the same answer,
the app is hardcoded, and the fix is in the agents — not in the examples.

**`SAMPLE_MODE`** may load **sample input data**. It may not load a prewritten final
answer, may not fake agent interaction, and may not pretend a sponsor service was
called. Every `SAMPLE_MODE` hit must be one of those three things.

## 3 · The documentation audit — the docs may not claim what the code does not do

Ask Cursor:

> Compare `README.md`, `DECK.md` and `DEMO.md` against the actual codebase. Flag
> features claimed but not implemented, run commands that will fail, missing environment
> variables, inaccurate agent descriptions, and any sponsor integration that is
> described but not real. Return exact edits.

**`DEMO.md` is a recording script — every command in it is a shot.** A command that
fails there fails on camera, in front of a judge. Run **every** command in `DEMO.md`:
the self-listing test, the offline and dead-dependency runs, the conformance suite, the
Zetaris self-test, and every route the script points a camera at. Then run every command
in the README and in `DECK.md`'s closing line. Fix the script if it is wrong — a video
that says to run a command that does not exist is worse than no video.

**Every command in the README must be one that was actually run, in this repo, with
this code.** Run each one. If a command fails, either fix it or delete it — do not
leave it in the README hoping.

**The sponsor descriptions must be true today.** If Zetaris ran against a live
instance, say so and name it. If it ran against the local protocol-compatible server,
say that. If no NVIDIA routing id was ever named by a run, say "declared, not yet
exercised" — do not soften it into an implied claim. **A declared deviation costs a
few points. A caught false claim costs the entry.**

## 4 · The clean-clone proof

The judge clones the repo and runs it. Prove that works, in a copy outside this
directory so nothing local is hiding the failure:

```bash
rm -rf /tmp/opencode/clean-clone
git clone . /tmp/opencode/clean-clone
cd /tmp/opencode/clean-clone
bun install
bunx tsc --noEmit
bun run swarm -- --input input_examples/example_1.json
bun run serve -- --port 3001 &
curl -s -X POST http://127.0.0.1:3001/run -H 'Content-Type: application/json' \
  -d @input_examples/example_1.json
```

**Everything must work from the clone, with no local state.** If it does not, the fix
is in the repo, not in your machine. Two things commonly break this and both are
silent: a file that was never committed, and a path that reaches outside the repo.

**Do not copy anything into the clone to make it pass.** The clone is the test.

## 5 · Generate the real deck and the real video script

`docs/DECK-draft.md` and `docs/DEMO-draft.md` were written **before the system
existed**. They describe screens, routes and behaviours that were only planned. Now that
the system is built, **regenerate both from the running application**:

- `DECK.md` — the deck's content: on-slide copy, speaker notes, a visual direction per
  slide. **Every number on every slide must come from a run that you performed in this
  step** — the conformance scores, the counts, the listing totals. If the app cannot
  produce a figure, the slide does not carry one.
- `DEMO.md` — the recording script: shots, timecodes, and the exact narration. **Every
  shot must be a screen or a command that exists.** A draft shot the app cannot show is
  **cut**, not reworded into something vaguer.

**Both files are written from what the app does, not from what the draft hoped it
would do.** Where the draft and the app disagree, the app wins and the draft was wrong —
say so in your report.

**Keep the drafts.** They are the record of what was planned before the build, which is
the honest thing to leave in the repository.

**Stop rule — the run is done when all of these hold:**

- `output_examples/` holds three responses from three real runs, three different
  decisions, and no runtime code reads them.
- The hardcode audit returns **no high-risk findings** — and the two-unrelated-queries
  test produces meaningfully different outputs.
- The documentation audit returns no unimplemented claims and no failing commands.
- The clean clone runs end to end: install, typecheck, swarm, `POST /run`, and the
  response matches the contract.
- `DECK.md` and `DEMO.md` exist, and **every claim in them is something the build
  produced**. No slide number, no shot, and no command that was not run.
- `README.md` contains the judge's quick start, and **every command in it was run**.

Report back: the three example files, the audit tables (findings and fixes), the
clean-clone transcript, and anything you found that the README was claiming but the
code was not doing.
