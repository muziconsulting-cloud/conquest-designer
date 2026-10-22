# DECK — draft structure (provisional)

> **PROVISIONAL DRAFT — NOT THE DELIVERABLE.**
> This is the *plan* for the deck, written before the system was built. It describes
> screens, routes and behaviours that **do not exist yet**. The real `DECK.md` is
> generated **after the build**, from the running application, by the p11 step — and
> every number on every slide comes out of a real run.
> **Do not build a deck from this file as it stands.** Use it as the structure, the
> argument and the honesty lines; replace the claims with what the app actually does.


**This file is the deck's content, not a deck.** Copy each slide's **On-slide copy**
into your tool (Keynote, Google Slides, Canva, PowerPoint). The **Speaker notes** are
for you, not for the slide. The **Visual** line says what to put on the slide if you
are building it yourself.

**Fourteen slides. One claim per slide. Every number on a slide comes from the
pipeline** — if a panel is empty in the running app, the slide is empty too.

**Read this before you build:** slides 9, 10 and 11 are the honesty slides. They are
worth points, not risks. Say "our implementation", "their own conformance suite",
"a local server that speaks the same protocol". Never round up.

---

## Slide 1 · The problem

**On-slide copy**

> Agents are being sold everywhere and certified nowhere.
>
> A buyer gets a claim. A seller gets a promise. Neither gets a document that says **who** owned **what was paid for**.
>
> **The gap is not trust. It is a missing artifact.**

**Visual:** black; one enormous line, "certified nowhere" in accent. Nothing else.
**Speaker notes:** This is the Impact 30 line. A buyer of an agent today gets a claim and a
promise. The exchange records a price. Nobody can produce the document that says who owned
what was paid for. That document is the product.

---

## Slide 2 · Who it is for

**On-slide copy**

> **Three parties, one missing artifact.**
>
> | | today | after |
> |---|---|---|
> | **The buyer** | trusts a claim | holds a certificate |
> | **The seller** | promises a service | settles a trade, gets paid |
> | **The regulator / auditor** | reconstructs it by hand | reads three facts |

**Visual:** three rows, one column highlighted.
**Speaker notes:** Nobody here is a bank customer. The buyer is anyone paying an agent for
work. The seller is the agent's operator — in the MaDlamini economy, the informal worker
selling a service into a market that has never had a receipt. The third party is the
auditor. All three are served by the same artifact.

---

## Slide 3 · The solution

**On-slide copy**

> An exchange where **the agent is the traded asset**.
>
> - Agents are **priced, listed, bought**
> - Value moves only through **settlement** (two-of-two escrow)
> - On settlement the agent is certified by an **Agentic Valuation Certificate**
>
> **One instrument. One rule.**

**Visual:** a simple flow: agent → listing → trade → settlement → certificate.
**Speaker notes:** The traded asset is an agent's service, not a token. The rule that matters:
nothing moves until both sides are done. And the thing the trade leaves behind is the
certificate.

---

## Slide 4 · The certificate

**On-slide copy**

> **Three facts. Nothing else.**
>
> | fact | what it records |
> |---|---|
> | **who** | the agentic identity in the wallet — address and agent id |
> | **what was paid** | amount, currency, payment reference |
> | **what it bought** | the listing or access term |
>
> Signed. Verifiable from the signed bytes alone.
> **Not a valuation. Not a token.**

**Visual:** three-row table, one accent row per fact.
**Speaker notes:** This is the whole product in one slide. The venue records a *declared*
price — it does not appraise, and the certificate does not pretend to. Verification reads
the signed bytes; it does not ask the issuer whether it is happy. Show the tamper check
if there is time.

---

## Slide 5 · The refusal — this is the differentiator

**On-slide copy**

> The declared price is a **claim**. It goes through an evidence pipeline before it is published.
>
> Evidence supports it → **published**
> Evidence does not → **held**, and it says why
>
> **Holding is a success.**
> The failure mode for an exchange that sells agents is publishing a bad price.

**Visual:** two cards side by side, "published" green, "held" amber.
**Speaker notes:** This is the innovation line and the honesty line at once. Every
agent-marketplace pitch is "we list agents". Ours lists them *only when the evidence
supports the price*, and holding a listing is a designed outcome, not an error. If a judge
remembers one slide, it should be this one.

---

## Slide 6 · The workflow

**On-slide copy**

> `volume-planner → evidence-reconciler → listing-closer ⇄ conflict-critic → telemetry-auditor`
>
> **Two loops. One escalation. One fallback.**
>
> - The critic sends a listing back **at most once**
> - A run that cannot escalate takes one **bounded deterministic fallback**, marked in the trace
> - Every step writes **one JSONL trace line** — a step with no trace entry is a failed step
> - Every recall **cites its memory ids**

**Visual:** the flow as five boxes with the ⇄ drawn as a loop-back arrow.
**Speaker notes:** The feedback loop is critic → closer, and it is bounded: one escalation.
The fallback is deterministic and it is *marked* — the trace tells the truth about what
happened instead of the run dying or pretending. The trace is the audit trail; point at it.

---

## Slide 7 · The roster

**On-slide copy**

> | standard role | ours | responsibility |
> |---|---|---|
> | Source Mapper | `volume-planner` | which sources, in what order |
> | Reconciler | `evidence-reconciler` | reconcile what disagrees, cite what it used |
> | Conflict Critic | `conflict-critic` | challenge the proposed listing |
> | Reporter | `listing-closer` | publish — or hold |
> | Evaluator | `telemetry-auditor` | audit the run itself |
>
> Five roles. Five different jobs.

**Visual:** the table, monospace the role names.
**Speaker notes:** This maps directly onto the track's standard roles so a judge can place
us in one second. The critic is not a second pass over the same work — it is an adversarial
role that can send a listing back. The auditor audits the *run*, not the market.

---

## Slide 8 · Self-listing — the agent sets its own price

**On-slide copy**

> A human registers and pays **once** → a **listing token** (the right to list, once).
> The agent sets **its own price** and goes through the same evidence pipeline.
>
> **No human negotiates for the agent.**
> **Self-listing is not a way around the critic.** Token reuse is refused.

**Visual:** three-step flow, with two "refused" stamps.
**Speaker notes:** The human's entire role in the marketplace is pay once and step back.
That is what keeps the exchange from being a labour-brokerage layer over agents. The
reuse refusal is a real check, not a diagram — show it if the demo has the seconds.

---

## Slide 9 · The tech stack

**On-slide copy**

> | layer | what it is |
> |---|---|
> | **Runtime** | Bun + TypeScript. No build step, no bundler, no framework. |
> | **State** | The exchange's own state — in-process and on disk |
> | **Federation** | Zetaris — the published REST contract, `OpenSqlQuery → PageSqlQuery → CloseSqlQuery` |
> | **Engines** | Meterless **H-MEM** · **World Model** · **Markovian** (Apache 2.0) |
> | **Models** | One port, three adapters — hosted provider, local runtime, deterministic offline |
> | **Payment** | Inbound x402 receipts, on settlement |
> | **Identity** | The agentic identity in the wallet |

**Visual:** a stack diagram, seven rows, the federation and engine rows in accent.
**Speaker notes:** Two sponsor technologies are load-bearing, not bolted on: the World
Model is the canonical event log the auditor reads, and H-MEM is the memory the reconciler
and critic cite. The model seam is one interface with three adapters, so the demo never
waits on a credential that has not been issued.

---

## Slide 10 · Sponsor usage — the honest version

**On-slide copy**

> **Meterless — live.** H-MEM, World Model and Markovian, **our implementations**, gated by
> **their own conformance suites**: `{{HMEM}}` · `{{WORLD}}` · `{{MARKOV}}`.
> Written from the engine contracts; the reference implementations were read, not vendored.
>
> **Zetaris — declared deviation.** The client is the **published contract**, and the demo
> runs it against a **local server that speaks the same protocol** — no shared instance was
> granted. The stub is server-side; **the identical command runs against a live instance**.
>
> **Cursor — declared deviation.** Cursor's allowance was exhausted for the window and
> the sponsor credit was never provisioned, so the build layer was **opencode** — spec-first,
> against a scoped prompt library that makes every feature replayable in Cursor.
>
> **NVIDIA — reached through the Meterless fleet.** Nemotron is selected by routing id at
> runtime. We hold no NVIDIA account, key or billing.

**Visual:** four quadrants, each with a small status dot: Meterless green, Zetaris amber,
Cursor green, NVIDIA grey.

**Speaker notes:** Say the deviation out loud, early, and plainly. It is a documented
constraint, not a hidden one: no Docker on the build machine for a local install, and the
managed instance stalled at account-binding. A judge who hears it from us and then finds it
in the repo trusts everything else we said. **The Zetaris client is real** — open, page,
close, query token carried, released on the error path too.

---

## Slide 11 · How it was built

**On-slide copy**

> Every feature **specified first**, from a scoped prompt, against a rules file that
> governs every step.
>
> - The acceptance command travels with the prompt, and it is run before the commit
> - All **twelve** build prompts are in the repository
> - The rules file: Bun and TypeScript, no build step, bounded loops, no invented APIs,
>   no weakened assertions, secrets from the environment only
>
> **The build layer was opencode, not Cursor — Cursor's allowance was exhausted for the
> window, and the sponsor credit was never provisioned. We say so rather than imply a
> build tool we did not use.**

**Visual:** a single terminal screenshot of a prompt file, or a build-evidence table.
**Speaker notes:** This slide answers the rubric's build-tool line with evidence rather
than assertion: the prompts are in the repo, the acceptance output is committed, and any
feature can be re-run. **Say the deviation out loud** — Cursor's allowance was exhausted
for the window and the sponsor credit was never provisioned. A judge who hears it from
us and then finds it in the repo trusts everything else we said. Have the build-evidence
table open in a tab for questions.

---

## Slide 12 · What it refuses

**On-slide copy**

> It refuses **a price without evidence** — held, not published.
> It refuses **a certificate that says more than it knows** — three facts, verifiable from the bytes.
> It refuses **an invented number** — every figure on every panel came out of the pipeline.
> It refuses **a second coin, a second mint, a token** — there is one unit and one settlement rule.

**Visual:** four lines, each with a struck-through icon.
**Speaker notes:** The refusals are the product's character. Also the POPIA/shield point:
we collect as little as the function needs.

---

## Slide 13 · What is next

**On-slide copy**

> - **The federation goes live** — the Zetaris client is already the published contract; a shared
>   instance turns the deviation into a live integration with no code change
> - **A hosted model credential** — the third adapter is written and waiting; the demo has
>   been running offline on purpose
> - **More agents on the same rails** — the roster is a set of roles over one trace format,
>   not a hard-coded list
> - **The informal economy, at ward scale** — the same rails for the 4,488 wards

**Visual:** four items, ascending.
**Speaker notes:** Nothing here is a rewrite. The three adapters, the client and the trace
format are all in place; the next steps are switches, not redesigns. The ward-scale point
is the ambition: the same rails that let one agent list its own price in one ward.

---

## Slide 14 · The close

**On-slide copy**

> The exchange has one rule: **value only moves through settlement** — and every settlement
> leaves a certificate that says **three true things**.
>
> `bun install && bun run swarm -- --input input_examples/example_1.json && bun run serve`
>
> **github.com/muziconsulting-cloud/conquest-designer**

**Visual:** the rule, large. The commands small and monospace.
**Speaker notes:** Land on the rule. Then the repo URL, and stop talking.

---

## Build checklist for the deck

- [ ] Slide 9's `{{HMEM}}` / `{{WORLD}}` / `{{MARKOV}}` replaced with the **actual** conformance
      output from `bun run conformance`. If the suites have not been run, write
      **"gated by their own suites — `bun run conformance`"** instead of a number.
- [ ] Slide 10's status dots match reality on the day you export.
- [ ] No number on any slide that the running app did not produce.
- [ ] Export to PDF and check the PDF — a deck that renders wrong on another machine is a
      broken deliverable. Save the PDF next to this file as `DECK.pdf`.
- [ ] Speaker notes exported into the notes field, not read off the slide.
