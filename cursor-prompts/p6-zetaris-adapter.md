# P6 — the Zetaris adapter (real protocol, honest mode)

**Context, from files — do not ask for it to be pasted:**

- `src/zetaris/adapter.ts` — the interface you are implementing. **Keep its shape**; you
  are filling it in, not redesigning it.
- `.env.example` — the Zetaris variables already declared.
- `src/types.ts` — our shared contracts.
- `.cursor/rules/conquest.mdc` — the house rules.

**The published contract you are implementing** (Zetaris REST API, `OpenSqlQuery` →
`PageSqlQuery` → `CloseSqlQuery`):

1. **Open** the query: body `{"select": "SELECT * FROM ...", "pageLimit": N}` where
   `pageLimit` is 1–100. The response is a `PageSqlQuery` carrying the **returned
   `queryToken`**.
2. **Page** through the result using that `queryToken`.
3. **Close** the query with the same token to release the server-side memory. **Always
   close**, including on the error path.

Headers and auth:

- `Authorization: Bearer <idToken>` (a `refreshToken` may be used to obtain a new
  `idToken`).
- `X-Org-ID: <numeric organisation id>` — the org id is a **number**, not a name.
- `X-Request-ID: <uuid v4>` — **generate a fresh UUID per request.**

**Objective.** Implement `src/zetaris/adapter.ts` for real:

- Every request goes out over HTTP with the headers and auth above, and the
  `queryToken` lifecycle is respected end to end.
- **Two modes, one code path.**
  - `live` — talks to a real Zetaris instance at `ZETARIS_API_URL` using the env
    credentials.
  - `local` — talks to a **protocol-compatible server we also write**
    (`src/zetaris/local-server.ts`) that implements the same Open → Page → Close
    contract over the same tables. The local server is a **test double for the
    *server*, not for the client**: the adapter code is identical in both modes, and
    the same request/response shapes cross the wire.
- **No mocks inside the adapter.** The adapter must not branch on "is this a test" and
  return canned data. It must build a real request and parse a real response.
- A `health()` that reports whether the configured instance answers, and what mode it is
  in.

**Why `local` exists, in your own head:** the graders may not have a shared instance,
and we do not have one today. The honest claim is *"our client implements the published
Zetaris REST contract; the demo runs against a local server that speaks the same
protocol; here is the exact command to point it at a real instance."* A fabricated
client that skips the protocol would be a lie, and it would fail the integration check.
Do not fabricate.

**Do not**

- No dependencies. Bun + TypeScript only (`fetch` is built in).
- No test files, no test framework.
- Do not change `src/types.ts`.
- Never log the bearer token, the id token, or the refresh token.
- Do not hard-code a URL, an org id, or a token in the source.

**Stop rule — the run is done when:**

1. `bunx tsc --noEmit` exits 0.
2. `bun run zetaris:selftest` (create it in `package.json` as a script that boots the
   local server on an ephemeral port, runs the adapter against it, and prints the
   Open/Page/Close exchange) prints the three-step exchange and exits 0.
3. `bun run zetaris:selftest -- --url http://<host>:<port> --org <numeric-id> --token
   <bearer>` is the **exact same command** pointed at a real instance. Put that command
   in `README.md` and in `SPONSORS.md`.

Report back: the files you created, the request/response shape of each of the three
steps, the selftest output verbatim, and the exact command to run against a live
instance.
