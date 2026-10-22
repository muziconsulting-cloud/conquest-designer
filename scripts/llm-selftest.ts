/**
 * The LLM selftest — one port, three adapters, the contract proved on the wire.
 *
 * It is not a unit test with mocks. It boots a server that speaks the Meterless
 * wire format (`src/llm/local-server.ts`) and points the **real** adapters at it,
 * so the contract is proved by what actually goes out on the wire:
 *
 *   1. the base URL is normalised to `<host>/v1` and never `/v1/v1`;
 *   2. `Authorization: Bearer <token>` is on every call;
 *   3. `meterless-app` is on every request and `meterless-scope: user` on chat —
 *      the server refuses a request that arrives without them, so a pass proves
 *      the headers were sent;
 *   4. a wrong token is **unauthorized**, not offline;
 *   5. the routing modes come from `GET /v1/models`, an unrecognised `meterless/*`
 *      id is kept, and a mode that is not on offer is replaced **and reported**;
 *   6. a plain text answer stays a plain string;
 *   7. the offline adapter answers with no key set and no network — proved by
 *      replacing `globalThis.fetch` with a function that throws for the duration
 *      of that check.
 *
 * Run: `bun run llm:selftest`
 */

import {
  MeterlessProviderAdapter,
  MeterlessRuntimeAdapter,
  OfflineAdapter,
  normaliseBaseUrl,
  resolveLlm,
} from '../src/llm/index.ts'
import type { LlmHealth, LlmResponse } from '../src/llm/port.ts'
import { startLocalMeterlessServer } from '../src/llm/local-server.ts'

const failures: string[] = []

const check = (ok: boolean, label: string, detail = ''): void => {
  if (ok) {
    console.log(`ok   ${label}`)
  } else {
    failures.push(label)
    console.log(`FAIL ${label}${detail === '' ? '' : ` — ${detail}`}`)
  }
}

const clip = (text: string): string => (text.length > 80 ? `${text.slice(0, 77)}...` : text)

const PROMPT = [
  { role: 'system' as const, content: 'Summarise the listing decision in one sentence.' },
  { role: 'user' as const, content: '{"kind":"audit-narrative","listingId":"L-001","decision":"accept"}' },
]

async function main(): Promise<number> {
  console.log('llm selftest — one port, three adapters')
  console.log('')

  // ---- 1. The URL is normalised, never /v1/v1 -------------------------------
  console.log('url normalisation')
  check(normaliseBaseUrl('http://127.0.0.1:8088') === 'http://127.0.0.1:8088/v1', 'a bare host becomes <host>/v1')
  check(normaliseBaseUrl('http://127.0.0.1:8088/v1') === 'http://127.0.0.1:8088/v1', 'a pasted /v1 stays <host>/v1')
  check(
    normaliseBaseUrl('http://127.0.0.1:8088/v1/chat/completions') === 'http://127.0.0.1:8088/v1',
    'a pasted /v1/chat/completions becomes <host>/v1',
  )
  check(normaliseBaseUrl('http://127.0.0.1:8088/v1/models') === 'http://127.0.0.1:8088/v1', 'a pasted /v1/models becomes <host>/v1')
  check(normaliseBaseUrl('http://127.0.0.1:8088/healthz') === 'http://127.0.0.1:8088/v1', 'a pasted /healthz becomes <host>/v1')
  check(normaliseBaseUrl('127.0.0.1:8088') === 'http://127.0.0.1:8088/v1', 'a host without a scheme gets one')
  check(!normaliseBaseUrl('http://127.0.0.1:8088/v1').includes('/v1/v1'), 'the URL is never /v1/v1')
  console.log('')

  const server = startLocalMeterlessServer({ token: 'test-token-for-the-selftest', port: 0 })

  try {
    // ---- 2. The hosted provider adapter ------------------------------------
    console.log('adapter 1 — the hosted Meterless provider')
    const provider = new MeterlessProviderAdapter({
      baseUrl: server.url,
      apiKey: 'test-token-for-the-selftest',
      appId: 'conquest-exchange',
    })

    const providerHealth = await provider.health()
    const providerModels = await provider.models()
    const providerResponse = await provider.complete({ messages: PROMPT, model: 'meterless/auto' })

    console.log(`  name            ${provider.name}`)
    console.log(`  base url        ${provider.baseUrl}`)
    console.log(`  routing mode    ${providerResponse.model}`)
    console.log(`  health          ${providerHealth.state}`)
    console.log(`  response        ${clip(providerResponse.text)}`)

    check(providerHealth.state === 'online', 'the provider reports online', providerHealth.state)
    check(
      provider.baseUrl === `${server.root}/v1`,
      'the base URL is normalised to <host>/v1',
      provider.baseUrl ?? 'none',
    )
    check(
      providerModels.includes('meterless/experimental-v2'),
      'an unrecognised meterless/* id is kept, not filtered',
      providerModels.join(', '),
    )
    check(typeof providerResponse.text === 'string' && providerResponse.text.length > 0, 'a plain text answer stays a string')
    check(providerResponse.model === 'meterless/auto', 'the requested routing mode served the call', providerResponse.model)

    // The headers really went out — the server refuses requests without them.
    const chatCall = server.log.find((entry) => entry.path === '/v1/chat/completions')
    check(!!chatCall, 'the chat call reached the provider')
    check(chatCall?.authorization === 'Bearer test-token-for-the-selftest', 'the bearer token was on the wire')
    check(chatCall?.app === 'conquest-exchange', 'meterless-app was on the wire')
    check(chatCall?.scope === 'user', 'meterless-scope: user was on the chat call')
    check(
      server.log.filter((entry) => entry.path === '/v1/models').every((entry) => !!entry.app),
      'meterless-app was on the models call too',
    )

    // ---- 3. A routing mode that is not on offer is replaced, and reported ----
    const swapped = await provider.complete({ messages: PROMPT, model: 'meterless/nemotron-super' })
    check(swapped.model !== 'meterless/nemotron-super', 'a mode that is not on offer is not sent', swapped.model)
    check(
      !!swapped.routing && swapped.routing.requested === 'meterless/nemotron-super',
      'the swap is reported in the result, not silent',
      JSON.stringify(swapped.routing ?? null),
    )

    // ---- 4. A wrong token is unauthorized, not offline ------------------------
    const wrong = new MeterlessProviderAdapter({
      baseUrl: server.url,
      apiKey: 'rt-local',
      appId: 'conquest-exchange',
    })
    const wrongHealth = await wrong.health()
    check(wrongHealth.state === 'unauthorized', 'a wrong token reports unauthorized, not offline', wrongHealth.state)

    let wrongState = ''
    try {
      await wrong.complete({ messages: PROMPT })
    } catch (error) {
      wrongState = (error as { state?: string }).state ?? ''
    }
    check(wrongState === 'unauthorized', 'a wrong token on a chat call is unauthorized too', wrongState)

    // ---- 5. Liveness is not health -------------------------------------------
    const liveness = await provider.liveness()
    check(liveness.up, 'GET /healthz proves the process is up')
    console.log('')

    // ---- 6. The local runtime adapter, found by discovery --------------------
    console.log('adapter 2 — the local Meterless Runtime')
    const runtime = new MeterlessRuntimeAdapter({
      runtimeToken: 'test-token-for-the-selftest',
      appId: 'conquest-exchange',
      autoDetectPorts: [server.port],
    })

    const runtimeHealth = await runtime.health()
    const runtimeResponse = await runtime.complete({ messages: PROMPT, model: 'meterless/auto' })

    console.log(`  name            ${runtime.name}`)
    console.log(`  base url        ${runtime.baseUrl ?? 'not found'}`)
    console.log(`  routing mode    ${runtimeResponse.model}`)
    console.log(`  health          ${runtimeHealth.state}`)
    console.log(`  response        ${clip(runtimeResponse.text)}`)

    check(runtimeHealth.state === 'online', 'the runtime reports online', runtimeHealth.state)
    check(
      runtime.baseUrl === `${server.root}/v1`,
      'the runtime is found on the known local ports and normalised',
      runtime.baseUrl ?? 'not found',
    )
    check(runtimeResponse.text.length > 0, 'the runtime answers')

    // A runtime that answers but refuses the token is unauthorized, not offline.
    const wrongRuntime = new MeterlessRuntimeAdapter({
      runtimeToken: 'not-the-token',
      appId: 'conquest-exchange',
      autoDetectPorts: [server.port],
    })
    const wrongRuntimeHealth = await wrongRuntime.health()
    check(
      wrongRuntimeHealth.state === 'unauthorized',
      'a runtime that refuses the token is unauthorized, not offline',
      wrongRuntimeHealth.state,
    )

    // No runtime at all: offline, and the reason names the ports it tried.
    const noRuntime = new MeterlessRuntimeAdapter({
      runtimeToken: 'not-the-token',
      appId: 'conquest-exchange',
      autoDetectPorts: [1],
    })
    const noRuntimeHealth = await noRuntime.health()
    check(noRuntimeHealth.state === 'offline', 'no runtime on the port is offline', noRuntimeHealth.state)
    check(
      (noRuntimeHealth.reason ?? '').includes('candidate'),
      'the offline reason names what it tried',
      noRuntimeHealth.reason ?? '',
    )
    console.log('')

    // ---- 7. The offline adapter: no key, no network --------------------------
    console.log('adapter 3 — the deterministic offline renderer')
    const savedEnv = {
      base: process.env['METERLESS_BASE_URL'],
      key: process.env['METERLESS_API_KEY'],
      token: process.env['METERLESS_RUNTIME_TOKEN'],
      runtime: process.env['METERLESS_RUNTIME_BASE_URL'],
      sample: process.env['SAMPLE_MODE'],
    }
    delete process.env['METERLESS_BASE_URL']
    delete process.env['METERLESS_API_KEY']
    delete process.env['METERLESS_RUNTIME_TOKEN']
    delete process.env['METERLESS_RUNTIME_BASE_URL']
    delete process.env['SAMPLE_MODE']

    // With `fetch` booby-trapped, the offline path cannot reach the network even
    // by accident — and the proof is that it still answers.
    const realFetch = globalThis.fetch
    let networkAttempts = 0
    globalThis.fetch = (() => {
      networkAttempts += 1
      throw new Error('the offline adapter tried to use the network')
    }) as unknown as typeof fetch

    let offlineResponse: LlmResponse = { text: '', model: '' }
    let offlineHealth: LlmHealth = { state: 'offline' }
    let resolvedSource = ''
    try {
      const offline = new OfflineAdapter()
      offlineResponse = await offline.complete({ messages: PROMPT, model: 'meterless/auto' })
      offlineHealth = await offline.health()
      resolvedSource = resolveLlm().source
    } finally {
      globalThis.fetch = realFetch
      if (savedEnv.base !== undefined) process.env['METERLESS_BASE_URL'] = savedEnv.base
      if (savedEnv.key !== undefined) process.env['METERLESS_API_KEY'] = savedEnv.key
      if (savedEnv.token !== undefined) process.env['METERLESS_RUNTIME_TOKEN'] = savedEnv.token
      if (savedEnv.runtime !== undefined) process.env['METERLESS_RUNTIME_BASE_URL'] = savedEnv.runtime
      if (savedEnv.sample !== undefined) process.env['SAMPLE_MODE'] = savedEnv.sample
    }

    console.log(`  name            offline-deterministic`)
    console.log(`  base url        none (no network, no key)`)
    console.log(`  routing mode    ${offlineResponse.model}`)
    console.log(`  health          ${offlineHealth.state}`)
    console.log(`  response        ${clip(offlineResponse.text)}`)

    check(networkAttempts === 0, 'the offline adapter made no network call', `${networkAttempts} attempt(s)`)
    check(offlineResponse.text.length > 0, 'the offline adapter answers')
    check(offlineResponse.model === 'deterministic-renderer', 'the offline adapter names its mode', offlineResponse.model)
    check(
      offlineResponse.routing?.requested === 'meterless/auto',
      'the offline adapter reports that it served no routing mode',
      JSON.stringify(offlineResponse.routing ?? null),
    )
    check(resolvedSource === 'offline', 'with no credentials the picker chooses the offline adapter', resolvedSource)

    // The same facts, the same words — twice.
    const twice = await new OfflineAdapter().complete({ messages: PROMPT, model: 'meterless/auto' })
    check(twice.text === offlineResponse.text, 'the offline adapter is deterministic')
    console.log('')
  } finally {
    server.stop()
  }

  console.log('')
  if (failures.length === 0) {
    console.log('PASS one port, three adapters, the contract proved on the wire')
    return 0
  }
  for (const failure of failures) console.log(`FAIL ${failure}`)
  return 1
}

process.exitCode = await main()
