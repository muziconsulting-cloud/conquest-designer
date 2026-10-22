# P7 — the AVC, issued on settlement

**Context, from files — do not ask for it to be pasted:**

- `src/types.ts` — `Avc`, `ListingRecord`, `ListingStatus`, `HoldingProof`, `EscrowState`.
- `src/agents/` and `src/orchestrator/` — where a listing becomes closable.
- `.cursor/rules/conquest.mdc` — the house rules.

**What an AVC is.** The **Agentic Valuation Certificate** is the product. It certifies
exactly three facts, and nothing else:

1. **who** — the agentic identity in the wallet that owns the listing (a public
   address, plus the agent id);
2. **what was paid** — the amount, the currency, and the payment reference;
3. **what it bought** — the listing or access term the payment purchased.

**The certificate is not a valuation.** The venue records a price someone declared; it
does not appraise the work, and it does not issue a token. If a field of the three does
not exist at settlement time, the certificate cannot be issued — the settlement does
not complete.

**Objective.** Implement `src/avc/`:

- `src/avc/certificate.ts` — build the certificate from a settled trade.
- `src/avc/sign.ts` — sign it.
- `src/avc/verify.ts` — verify it, independently of the issuer.
- `src/avc/store.ts` — persist issued certificates so they can be looked up by id.

**The rules**

- **Issue on settlement, not on listing.** The certificate exists only after the trade
  settles. A listing that is merely published, or held, has no certificate.
- **Escrow is the settlement rail, and it is implemented in this repository.** There is no
  pre-existing settlement API to call here — build the escrow as part of this feature
  (or on top of what a previous step left in `src/`). The trade settles through a
  two-of-two escrow: funds lock, the buyer claims, the seller is paid, and the
  certificate is issued at that point. A certificate that names a payment that has not
  settled is invalid.
- **Signed, verifiable, and reproducible.** Sign with a detached signature; verification
  takes the certificate and its signature and returns true/false **without** consulting
  the issuer. The signing key comes from the environment (`Bun.env`); **never commit a
  key, never log one, never inline a default private key in the source** — if the key
  is missing, fail loudly.
- **The certificate id is content-derived**, so the same settled trade always yields the
  same certificate id and a tampered certificate gets a different one.
- The three facts must be **exactly** the three facts. No extra claims, no "quality
  score", no valuation verdict.

**Do not**

- No dependencies. Bun + TypeScript only (Bun has WebCrypto — use it).
- No test files, no test framework.
- Do not change `src/types.ts`.
- Do not invent a token, a contract address, or a chain. This is a signed document, not
  a token issue.
- Never log or return the private key, and never write a key to disk.

**Stop rule — the run is done when:**

`bunx tsc --noEmit` exits 0, and `bun run avc:selftest` (create it in `package.json`)
settles one fixture trade end to end — escrow lock → claim → seller paid → certificate
issued — and then **verifies the certificate from the signed bytes alone**, printing:

```
certificate <id>
  who:        <address> (<agent id>)
  paid:       <amount> <currency> (ref <payment ref>)
  bought:     <listing id>
  signature:  <alg> <verified: true>
```

It must also print a **tampered** variant that fails verification. Exit 0.

Report back: the files you created, the certificate shape, the selftest output
verbatim, and how a verifier checks a certificate without trusting the issuer.
