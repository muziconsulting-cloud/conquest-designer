---
name: hackathon-compliance
description: Use ONLY for the Open Agent Hackathon 2026 (hackathon.genai.works / GenAI.Works, submitted via HackOS) to check submission compliance and self-score against the judging rubric. Trigger on "hackathon compliance", "are we compliant", "check the rules", "rubric self-score", "will this score", "what's missing for submission", "hard gates", "mandatory sponsor integration", "declared pre-existing", "deliverables check", or when preparing/auditing the conquest-tinkerer submission repo. Do NOT use for general code review.
license: MIT
metadata:
  event: Open Agent Hackathon 2026
  hub: HackOS
  official_page: https://hackathon.genai.works/event/open-agent-hackathon-2026
---

# Hackathon Compliance Monitor

Keeps an Open Agent Hackathon 2026 submission **compliant and maximally scored**. The
single source of truth is `requirements.json` in this skill folder; the checker is
`scripts/compliance_check.py`. The script is local-only and informational (exits 0 unless
`--strict`); the agent does the one thing the script cannot: **re-verify the live rules and
diff them against `requirements.json`.**

## Golden rules

- **Facts, not memory.** Never assert a rule from memory. Each fact in `requirements.json`
  carries `source`, `fetched` and `confidence`. If you cannot cite a source, mark it
  `confidence: "low"` and say so.
- **Verify, then record.** When the live page/Discord/HackOS disagrees with
  `requirements.json`, update the JSON (bump the `fetched` date, add a `verified_facts`
  entry) *and* report the drift to the user. The checker is only as good as the JSON.
- **No false comfort.** A green run means "no local gaps found", not "we will win". The
  rubric self-score is the honest part; keep it brutally honest.
- **Don't pre-build for points.** Work created before the window only counts if declared
  pre-existing. Dev tooling (this skill) is fine; product features are not.
- **Official rubric beats sponsor prose.** `requirements.json.rubric` mirrors the official
  §7.1 weights (Impact 30, Technical 20, Innovation 15, Demo 15, Product & UX 10, Sponsor
  10). If a sponsor document shows different weights, official rules win.

## Workflow

1. **Re-verify the live rules (you, not the script).**
   - `webfetch` the official page above; extract dates, prizes, mandatory gates, deliverables.
   - If HackOS is available (signed in), also check the submission form's required fields and
     any updated schedule/Discord notes.
   - Diff against `requirements.json.verified_facts`. On drift: edit the JSON (source +
     `fetched` = today), and tell the user exactly what changed.

2. **Run the checker.**
   ```bash
   python3 ~/.config/opencode/skills/hackathon-compliance/scripts/compliance_check.py --repo /home/wardair/conquest-tinkerer
   ```
   Flags: `--json` (machine-readable), `--strict` (exit 1 on a failed hard gate),
   `--now ISO8601` (simulate a clock, e.g. to confirm in-window behaviour).

3. **Triage the output, highest leverage first.**
   - Any `FAIL` on a **hard gate** (Zetaris, Meterless, Cursor, declared pre-existing,
     secrets, window) is a **disqualifier-class** problem — fix before anything else.
   - Missing deliverables (video, deck, README sections, sponsor write-up) are points.
   - Sponsor integration where `must_be_real: true` still `FAIL` is both a gate *and* the
     full 10 Sponsor points.
   - Map every remaining gap to rubric points; sort by *points recovered per effort*.

4. **Produce the self-score.** Fill the rubric table with honest numbers and a one-line
   reason per criterion. State the single highest-leverage next action.

## Interpreting statuses

| Status | Meaning |
| ------ | ------- |
| `PASS` | Evidence found locally. |
| `FAIL` | Required evidence missing. `hard=true` means disqualifier-class. |
| `WARN` | Manual attestation, or a soft risk (e.g. leaked-looking string). |
| `INFO` | Context (pre-window, repo note, encrypted/opaque check). |

## Submission checklist (from requirements.json)

- **Hard gates:** registered · Zetaris integrated (real) · Meterless engine implemented
  (green conformance) · Cursor used · pre-existing declared · built in-window · no secrets.
- **Deliverables:** demo video 1–4 min · slide deck · public GitHub repo + README
  (setup/usage/dependencies) · sponsor-integration write-up.
- **Rubric:** 100 pts across Impact 30 / Technical 20 / Innovation 15 / Demo 15 / Product &
  UX 10 / Sponsor 10. Ties → Impact, then submission timestamp.

## Files

- `requirements.json` — the source of truth (verified facts, gates, deliverables, rubric).
- `scripts/compliance_check.py` — local checker (stdlib only, no network).
