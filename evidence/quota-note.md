# Cursor capacity — the honest note

**Recorded:** 2026-10-21T21:35Z · **Status at the time of writing: BLOCKED**

## What happened

The Cursor CLI is installed, authenticated and working. The organiser's build check
(**check 2** — Cursor creates and runs a file, no API key) **passed** — the transcript is
in [`check-2-cursor.txt`](./check-2-cursor.txt).

Two engine prompts were then rehearsed on throwaway copies to prove the scoped-prompt
pattern before the window opened. Both went green first try:

- H-MEM → conformance **13/13**, `tsc --noEmit` exit 0, 3m53s
- World Model → conformance **8/8**, `tsc --noEmit` exit 0, 5m29s

The third rehearsal was refused:

```
ActionRequiredError: You've hit your usage limit
Get Cursor Pro for more Agent usage, unlimited Tab, and more.
```

## Why

The account is on Cursor's **Free** tier. Two consequences, both confirmed against the
CLI and Cursor's own documentation:

1. **Named models are refused.** `--model composer-2.5` and `--model cursor-grok-4.5-high`
   both return:
   `Named models unavailable — Free plans can only use Auto.`
   Only `--model auto` runs. Cursor's pricing page lists Free as *"Agent and Chat with
   limited usage"*, while every **paid** plan carries a pool of Cursor models
   (Grok 4.7/4.6/4.5 and Composer 2.5) that refreshes weekly.
2. **The free allowance is token-based and small.** Cursor does not publish the number,
   and the CLI error does not surface the next reset date. It is exhausted.

## How it was resolved

**The Cursor sponsor credit, claimed through the hackathon task board** — the
organiser's own route. The sponsor overview states that team access is provided for the
hackathon and that the access instructions are published on the sponsor folder before
the build window opens.

Every paid plan on Cursor carries a pool of the exact models the organiser's check 2
names — **Composer 2.5 and Grok 4.5** — so the build runs on named Cursor models, which
is also the strongest possible evidence for the "how Cursor was used" question.

**If the sponsor credit is not reachable, the fallback is a paid Cursor plan**, which
costs a few dollars a month and removes the "Free plans can only use Auto" weakness
from the build evidence entirely. The build does not depend on which route is used —
it depends on Cursor being able to run, and it is designed to be run in scoped,
reviewable, cheap-on-credit steps.
