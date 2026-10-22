# `docs/` — what is in this submission, and what is not

**Read this first if you are a judge.** It exists so there is no ambiguity about what is
ours, what is declared, and what is deliberately withheld.

| File | What it is | Public? |
|---|---|---|
| [`AVC-SPEC.md`](./AVC-SPEC.md) | The product specification: what the certificate is, the three facts, the escrow settlement, the self-listing protocol. | **Yes** — written for the judges. |
| [`BUILD-LEDGER.md`](./BUILD-LEDGER.md) | The honest build and scoring ledger: what was done when, what was corrected, what the self-assessment is and why. Kept in the open on purpose. | **Yes** — the corrections are the point. |
| `../PRE-EXISTING.md` | The rule 4.2 / 5.4 declaration: every pre-existing component, in full, with the `pre-window-scaffold` tag. | **Yes** |
| `../SUBMISSION.md` | The HackOS form text, paste-ready. | **Yes** |
| `../evidence/` | The organiser's build check transcript, the reference conformance output, the rehearsal usage records, and the honest note on Cursor capacity. | **Yes** |

## What is deliberately **not** here

The pre-existing platform that this submission is declared against is a separate
production deployment. Its source is **not** copied into this repository, and two
categories of its material are **not** published at all:

1. **Its private derivation** — the working that produces the platform's own internal
   unit from physical quantities. That is the platform's moat, it is not part of this
   submission, and nothing in this repository reproduces it.
2. **Its production internals** — the money engine's pools, payrolls and rails. They
   are described only at the level the declaration needs: that the escrow and
   settlement semantics are pre-existing and reached over an API.

The retired **R10,000 bond / worker-agent** story is also not here. It was the platform's
previous shape; the exchange replaced it, and shipping both would confuse the judges
about what was built.

## The line this submission draws

**Pre-existing = the platform, declared. In-window = everything in `src/`.**

The `pre-window-scaffold` tag marks the exact boundary. `git diff
pre-window-scaffold..HEAD` is the build.
