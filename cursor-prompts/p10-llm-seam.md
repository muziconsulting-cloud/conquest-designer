# P10 — the one LLM port and its three adapters

Attach the mandated Meterless prompt file for this engine with `@prompts/08-provider-llm-seam.md`
and read it in full before you start. It defines the pattern; the task below says what to
build.

**Context, from files — do not ask for it to be pasted:**

- `src/llm/port.ts` — **the port you are implementing.** Keep its shape; fill it in.
- `.env.example` — the Meterless variables already declared.
- `.cursor/rules/conquest.mdc` — the house rules.

**Objective.** Implement `src/llm/`:

- `src/llm/provider-adapter.ts` — the **hosted** Meterless provider (an OpenAI-format
  `POST <host>/v1/chat/completions`).
- `src/llm/local-adapter.ts` — the **local** Meterless Runtime (a local process serving
  the same wire format).
- `src/llm/offline-adapter.ts` — the **deterministic** adapter used by `SAMPLE_MODE`,
  which needs no key, no network, and no credit.
- `src/llm/health.ts` — health and model discovery.
- `src/llm/index.ts` — picks the adapter from config.

**The rules that matter**

- **One port, three adapters.** Everything above this line calls `LlmPort`. No module
  anywhere else in the app may make a model call, and no model provider SDK may appear
  in the codebase.
- **The base URL is normalised to `<host>/v1`.** A pasted URL that already ends in `/v1`
  must not become `/v1/v1`.
- **Auth is a real header:** `Authorization: Bearer <token>`. The token comes from the
  environment. **Never log it, never echo it, never put it in a URL.**
- **Every request carries `meterless-app: <stable lowercase app id>`**, and chat requests
  carry `meterless-scope: user`.
- **Model ids are routing modes, not model names.** Discover what is actually available
  with `GET <host>/v1/models` and prefer the routing mode the caller asks for. If the
  requested mode is not offered, fall back to a mode that is — and **say so in the
  result**, never silently swap.
- **Health is two different things.** `GET <host>/healthz` only proves the process is
  up. `GET <host>/v1/models` decides whether we are `online`, `offline`, or
  `unauthorized` (401/403 ⇒ `unauthorized`).
- **The local adapter discovers its port** on the known local ports rather than
  assuming one.
- **A plain-text response stays a plain string.** Do not force JSON where the provider
  returned prose.
- **Timeout: 180 seconds**, and a timeout is an `offline` result, not a thrown error
  that kills a run.
- **The offline adapter is not a lesser mode.** It is the deterministic path the demo
  runs on, and it must return the same result shape as the hosted adapter.

**Do not**

- No dependencies. Bun + TypeScript only (`fetch` is built in).
- No test files, no test framework.
- Do not change `src/types.ts`.
- **No provider key in the repository, in a Cursor rule, in a prompt file, or in a
  commit.** Keys come from `Bun.env` only.
- Do not hard-code a base URL, a token, or a model id.

**Stop rule — the run is done when:**

`bunx tsc --noEmit` exits 0, and `bun run llm:selftest` (create it in `package.json`)
prints, for each of the three adapters, the adapter name, the resolved base URL, the
routing mode actually used, the health state, and the first 80 characters of the
response. The **offline** adapter must run with no network and no key set — prove it by
unsetting the env vars in that run. Exit 0.

Report back: the files you created, the resolved base URL for each adapter, the routing
mode each used, the selftest output verbatim, and the exact env vars a user must set to
point the hosted adapter at a real provider endpoint.
