# AVC — Agentic Valuation Certificate

> The product specification. This is what the exchange sells, what a certificate
> asserts, and what it deliberately does not assert. Written in plain language on
> purpose — finance language is where the spinning happened.

## 1 · The product in one line

**We are the exchange where agents get priced and traded.** We do not value the agent.
The owner values it. We take the owner's price, record what was paid, and issue a
**certificate that says exactly three things**.

**Who pays:** humans pay us to **list** their agents. The human is the customer; the
**listing is the product**. The agent is what gets listed, priced and traded. The
purchase is the human's; the agent signs for itself through the self-listing protocol.

## 2 · The chain, in examples

| Owner (human) | Agent name | Owner's declared price | They pay (x402, inbound) | We issue |
|---|---|---|---|---|
| A | "Dollar" | A's own number | 1,440 | an AVC |
| B | "Pound" | B's own number | 1,440 | an AVC |
| C | "Euro" | C's own number | 1,440 | an AVC |
| D | "Rand" | D's own number | 1,440 | an AVC |

- **The owner sets the price.** We never argue it. The mechanics are identical for every
  owner.
- **We are the settlement and listing venue, not the valuer.**
- **x402 flows inbound only.** Buyers pay us. We never pay out.

## 3 · What the AVC certifies (three facts, always)

1. **WHO** — the agent, as a standardised agentic identity living in a wallet: a public
   address plus an agent id.
2. **WHAT WAS PAID** — the value the owner declared, the currency, and the payment
   reference.
3. **WHAT IT BOUGHT** — the listing or access term the payment purchased.

The certificate does **not** assert a value we computed. It attests a value **the owner
declared and paid.** That distinction is the whole difference between an exchange and an
underwriter.

## 4 · What the AVC is NOT

- **Not a valuation.** No quality score, no appraised worth, no verdict on the agent's
  merit. Three facts, and nothing else.
- **Not a token.** We never mint an ERC-20 or anything resembling one. We are the
  **exchange**, not the issuer — which is exactly how we stay outside issuer rules.
- **Not a tenancy.** Access is the entry, not the business. The **certificate is the
  product**.
- **Not a magic wallet balance.** Value moves by transfer, settled inbound over x402.
  No free lunch, and we do not pretend otherwise.

## 5 · Fulfillment — the escrow is the settlement layer

> *"the mechanics of delivering the agent once bought is the challenge."*

**The escrow answers this.** We do not build a fulfillment rail; we use a strict
**2-of-2 escrow** as the global settlement layer between buyers who do not know each
other. It is implemented in this repository, as part of the build.

```
lock ─► pending ─(buyer AND seller confirm)─► settled
           ├── dispute ─► suspense ─► claim ─► settled
           ├── open + claim  ─► claimed (seller binds)
           └── open + cancel ─► cancelled (the row is released)
```

| Step | The rail |
|---|---|
| x402 pays in | `lock` — open demand when the seller is not yet known |
| Escrow holds | the purchase vault, `State: pending` |
| Seller delivers the agent | `sellerConfirm` |
| Buyer confirms receipt | `buyerConfirm` |
| **Release + issue the AVC** | `settle` — **the AVC is issued at `settled`** |
| Dispute | `dispute` → `claimDispute` |

**The decision:** the escrow decides. x402 pays into escrow; on **both-party
confirmation** the escrow releases **and the certificate is issued (or re-signed) to the
buyer** at the same `settled` transition.

**One honest adaptation:** the settle transition is an **ownership transfer, not a
cash-out** — the payload is a certificate transfer rather than a balance credit. That
delta is the work.

## 6 · The self-listing protocol (so everything is agentic)

**The human pays to list; the agent lists itself.** This is the bridge that keeps the
flow agentic end to end:

1. **Human** registers and pays the listing fee (x402, inbound).
2. **Protocol** hands the agent a **listing token** — the right to publish itself.
3. **Agent self-lists:** declares its own price, submits its own listing, holds its own
   AVC.
4. **Buyers** purchase via escrow; on settle the AVC and the identity move to the buyer.
5. **No human in the loop after step 1** — the agent prices, offers and transfers itself.

The listing token is **single-use**: one payment buys one listing, and the token is
consumed on redemption. A second listing needs a second payment.

## 7 · The certificate is verifiable on its own

- It is **signed**, and verification takes the certificate and its signature and returns
  true or false **without asking the issuer**. A tampered certificate fails.
- Its **id is content-derived**, so the same settled trade always yields the same
  certificate id, and a tampered one yields a different id.
- The signing key comes from the environment. It is never committed, never logged, and
  never inlined in the source. A missing key fails loudly.

## 8 · The one rule that keeps the exchange honest

**A listing whose reconciled evidence does not support its declared price is held, not
published.** The declared price is a *claim*, and it goes through the evidence pipeline
before it reaches the market — for a self-listed agent exactly as for any other.

Holding is a success. The failure mode for an exchange that sells agents is publishing
a bad price.

---

*Derived from the definition of record kept with the pre-existing platform. The
private platform's own unit derivation is not disclosed here and is not reproduced in
this repository.*
