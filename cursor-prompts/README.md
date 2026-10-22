# `cursor-prompts/` — the scoped build prompts

One file per feature. Each is a complete, self-contained prompt for **Cursor Agent**
(`cursor-agent -p "$(cat cursor-prompts/<file>.md)"`), scoped to exactly one feature so
the run is small, reviewable and cheap on Cursor credit.

**The loop each file implements** (the organiser's "Describe → Review → Steer"):

1. **Describe** — opencode hands Cursor this prompt.
2. **Review** — opencode reads the diff, runs the acceptance command, reads the file
   back with Cursor if it does not understand it.
3. **Steer** — opencode writes the next prompt (or a correction) and Cursor continues.
   Commit after every working step, so a bad generation is rolled back, not debugged.

**Context discipline** (this is what keeps the credit from running out):

- Context is loaded from **files**, not pasted: `@prompts/<mandated>.md` for the pattern,
  `src/types.ts` for the contracts, `.cursor/rules/conquest.mdc` for the house rules
  (Cursor loads that one automatically).
- **One feature per run.** Never "build the whole swarm".
- No prompt asks Cursor to explain the repository back to us.

**Order** (the critical path first — the two mandatory sponsor gates live here):

| File | Feature | Gate it satisfies |
|---|---|---|
| `p0-scaffold-wiring.md` | wire `bun run swarm` end to end against the typed contracts | Technical |
| `p1-hmem-engine.md` | our H-MEM implementation | **Meterless (mandatory)** |
| `p2-world-model-engine.md` | our World Model implementation | **Meterless (mandatory)** |
| `p3-markovian-engine.md` | our Markovian implementation | **Meterless (mandatory)** |
| `p4-five-agents.md` | the five agents | Technical |
| `p5-orchestrator-escalation.md` | the loops, the escalation branch, the fallback | Innovation |
| `p6-zetaris-adapter.md` | the Zetaris REST-contract adapter | **Zetaris (mandatory)** |
| `p7-avc-on-settle.md` | the AVC issued on escrow settlement | Innovation |
| `p8-self-listing.md` | the self-listing protocol | Impact |
| `p9-html-surface.md` | the server-rendered operator surface | Product & UX |
| `p10-llm-seam.md` | the one LLM port and its three adapters | Sponsor / in-kind |

The engine specs are **not** in this repo. They are fetched at build time:

```bash
npx degit meterless/meterless/engines/hmem vendor/meterless/hmem
npx degit meterless/meterless/engines/world-model vendor/meterless/world-model
npx degit meterless/meterless/engines/markovian vendor/meterless/markovian
```

`vendor/` is gitignored. We implement from each engine's `AGENTS.md` — we do **not**
vendor their reference implementation. Apache 2.0 attribution is in `SPONSORS.md`.

## The invocation

```bash
export PATH="$HOME/.local/bin:$PATH"
cursor-agent -p "$(cat cursor-prompts/<file>.md)" --model auto --force --trust
```

`--force` auto-approves the run; `--trust` marks the workspace as trusted; `--model auto`
uses the plan the account's tier allows. Add `--output-format json` to capture the
usage record for the build evidence table.

**Review after every run** — the loop is not optional:

```bash
git diff --stat && git status --short
bunx tsc --noEmit
```

Read the diff before you commit it. If the run produced something you do not understand,
read the file back with Cursor (`cursor-agent -p "explain <file>"`) rather than guessing.

## Dry run

Each prompt is rehearsable **before** the build window against a throwaway copy, so a
broken prompt is found on a rehearsal and not on the day:

```bash
tar --exclude=node_modules --exclude=.git -cf - . | (mkdir -p /tmp/rehearsal && cd /tmp/rehearsal && tar -xf -)
cd /tmp/rehearsal && cursor-agent -p "$(cat cursor-prompts/<file>.md)" --model auto --force --trust
```

A rehearsal produces implementation code **outside** this repo. It is a rehearsal, not
the build — the shipped code is authored inside the build window, here, in this repo.
