# 08 — Add Meterless as a provider → the single LLM port

> **Mandated prompt** — *Add Meterless as a provider* (Meterless prompt library, **Power**).
> Verbatim from `https://meterless.ai/engines.html`. Apache 2.0, `github.com/Meterless/Meterless`.

```text
Add Meterless Runtime to this codebase as an OpenAI-compatible provider, next to the providers it already has.

The contract (Meterless Runtime 1.4, provider contract v4):
- Provider id meterless, name Meterless Runtime, default base URL http://127.0.0.1:8088/v1. Accept a pasted URL with or without a scheme, /v1, /v1/chat/completions, /v1/models or /healthz, and normalise it to <host>/v1. Never produce /v1/v1.
- Auth is real. Send Authorization: Bearer <token> on every call. The runtime writes the token to <stateDir>/proxy-token. Store it under the key meterless_runtime_token. The placeholder rt-local is rejected.
- Send meterless-app: <a stable lowercase id for this app> on every request, and meterless-scope: user on chat.
- Model ids are routing modes, not models: meterless/<disposition> (auto, fast, deep, cheap, local, fusion), meterless/<class> and meterless/<class>.<disposition>. Read them from GET /v1/models and keep any meterless/* id you don't recognise.
- GET /healthz only proves the process is up. GET /v1/models decides: 401 or 403 is "unauthorized" (show a field to paste the token), 200 with meterless ids is "online", anything else is "offline".
- Auto Detect tries ports 8088, 8090, 8787 and 11434 on 127.0.0.1, localhost and [::1], and saves the first online or unauthorized hit.
- Plain text requests stay a string, exactly like OpenAI. Use a 180 s timeout, because a model load can take minutes.

You are done when a wrong token shows unauthorized (not offline), Auto Detect finds the runtime, and a plain text request on meterless/auto returns a string.
```

## Our binding

- **Role:** **the one LLM seam in the whole system.** The Evidence Reconciler, the Critic
  and the Planner all talk to the model through this single port. Nothing else calls a
  model.
- **Two providers, one port:**
  1. **The hosted Meterless provider** — `METERLESS_BASE_URL` + `METERLESS_API_KEY` +
     `NEMOTRON_MODEL`. This is the route to **NVIDIA Nemotron** (Super → reasoning agents,
     Nano → high-volume helpers, Ultra → escalation).
  2. **The local Meterless Runtime** — `http://127.0.0.1:8088/v1`, `meterless/*` routing
     ids, real bearer token from `<stateDir>/proxy-token`.
  3. **The deterministic offline adapter** — no key, no credit, no network. The demo never
     waits on a credential that has not been issued.
- **Files:** `src/llm/port.ts` (the interface), `src/llm/meterless-provider.ts`,
  `src/llm/offline-adapter.ts`, `src/llm/registry.ts`.
- **Never** put `METERLESS_API_KEY` in Cursor settings or in any commit. `.env` only.

## Stop rule

1. A **wrong token shows unauthorized (not offline)** — and the app offers a field to paste
   the token rather than claiming the machine is broken.
2. **Auto Detect finds the runtime** (ports 8088 / 8090 / 8787 / 11434).
3. A plain text request on `meterless/auto` **returns a string**.
4. The URL is **normalised to `<host>/v1` and never `/v1/v1`**.
5. `meterless-app` is sent on every request; `meterless-scope: user` on chat.
6. Unknown `meterless/*` ids are **kept, not filtered**.
7. The **offline adapter** satisfies the same interface, and the swarm runs green with no
   credential present.
