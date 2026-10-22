/**
 * The listing selftest — one human, one payment, one listing, and the refusals.
 *
 * The path the P8 prompt specifies:
 *
 *   register   -> payment requested (402, challenge issued)
 *   pay        -> receipt verified against the facilitator
 *   redeem     -> listing token <id> issued
 *   self-list  -> listing <id> declared at <price>, evidence pipeline ran, decision: <accept|hold>
 *
 * then a **second** listing with the same token is attempted and refused, and a
 * second payment buys a second token, which the agent spends on a price the evidence
 * does not support — and the pipeline holds that listing.
 *
 * **The facilitator is a local stub.** It verifies the x402 request shape and the
 * Ed25519 signature in process. No chain, no provider, no key of ours, no money moved.
 * The payer's keypair is generated in memory for this run and never written down.
 *
 * Run: `bun run listing:selftest`
 */

import { readFileSync } from 'node:fs'
import { createTraceSink } from '../src/orchestrator/trace.ts'
import { ListingRegistry, registerAgent, LISTING_FEE_ZAR } from '../src/listing/register.ts'
import { ListingTokenBook } from '../src/listing/token.ts'
import { LocalFacilitator, createPayer, payChallenge } from '../src/listing/payment.ts'
import { selfList } from '../src/listing/self-list.ts'
import type { AgentIdentity } from '../src/types.ts'

const failures: string[] = []
const checks: Array<{ ok: boolean; label: string; detail: string }> = []

const check = (ok: boolean, label: string, detail = ''): void => {
  checks.push({ ok, label, detail })
  if (!ok) failures.push(label)
}

const agent: AgentIdentity = {
  agentId: 'AGT-SOLARISER',
  agentKeyHash: 'sha256:2f9c1b0e5a7d',
  walletAddress: '0x3d5975a75f88656B09B3086e82CBcAF8470F517E',
  displayName: 'Solariser',
}

const AT = '2026-10-22T06:00:00.000Z'
const RESOURCE = 'http://127.0.0.1:3000/listing/register'

/** The whole human side of the protocol, once: register, pay, redeem. */
async function buyTheRightToList(input: {
  registry: ListingRegistry
  tokens: ListingTokenBook
  facilitator: LocalFacilitator
  agent: AgentIdentity
  at: string
}): Promise<{ registrationId: string; secret: string; tokenId: string } | null> {
  const { registry, tokens, facilitator, agent, at } = input

  const { registration, payment } = registerAgent({
    registry,
    agent,
    owner: 'human:collector-01',
    resource: RESOURCE,
    at,
  })

  console.log('register   -> payment requested (402, challenge issued)')
  check(payment.status === 402, 'the registration answers with a real 402')
  check(
    payment.headers['X-Payment-Required'] !== undefined &&
      payment.headers['WWW-Authenticate']?.startsWith('X402') === true,
    'the challenge travels in the 402 headers',
  )
  check(
    payment.body.accepts[0]?.extra.decimals === 0 &&
      payment.body.accepts[0]?.maxAmountRequired === String(LISTING_FEE_ZAR),
    `the challenge asks for the whole-rand listing fee (R${LISTING_FEE_ZAR})`,
  )

  const payer = await createPayer('human:collector-01')
  const paid = await payChallenge({ challenge: payment.body, payer, at })
  const verified = await facilitator.verify({
    challenge: payment.body,
    response: paid.response,
    at,
  })

  if (!verified.valid || !verified.receipt) {
    check(false, 'the payment verifies against the facilitator', verified.reason)
    return null
  }
  check(true, 'the payment verifies against the facilitator')
  console.log('pay        -> receipt verified against the facilitator')

  registry.markPaid(registration.registrationId, verified.receipt)

  // The receipt is redeemed for the right to list, once.
  const token = tokens.issue({
    agent,
    registrationId: registration.registrationId,
    receipt: verified.receipt,
    at,
  })
  console.log(`redeem     -> listing token ${token.tokenId} issued`)

  return { registrationId: registration.registrationId, secret: token.secret, tokenId: token.tokenId }
}

async function main(): Promise<number> {
  console.log('listing selftest — register → 402 → pay → redeem → the agent lists itself')
  console.log('')

  const registry = new ListingRegistry()
  const tokens = new ListingTokenBook()
  const facilitator = new LocalFacilitator()

  // ---- the whole path -------------------------------------------------------
  const bought = await buyTheRightToList({ registry, tokens, facilitator, agent, at: AT })
  if (!bought) {
    console.log('FAIL the human side of the protocol did not complete')
    return 1
  }

  const listed = await selfList({
    registry,
    tokens,
    registrationId: bought.registrationId,
    secret: bought.secret,
    declaredPriceZar: 1440,
    termMonths: 12,
    now: () => AT,
    // A fixed trace id, so the P8 evidence is one file per path and never multiplies.
    trace: createTraceSink('trace-20261022-listing-accept'),
  })

  console.log(
    `self-list  -> listing ${listed.listingId} declared at R${listed.declaredPriceZar}, ` +
      `evidence pipeline ran, decision: ${listed.decision}`,
  )

  check(listed.ok, 'the agent lists itself with the token it was handed')
  check(listed.decision === 'accept', 'the declared price the evidence supports is accepted', listed.reason)
  check(listed.status === 'published', 'the listing is published')
  check(
    (listed.sources ?? []).length > 0,
    'the independent sources that answered are named',
    (listed.sources ?? []).join(', '),
  )
  check(
    listed.pull !== null && listed.pull.requests > 0,
    'the evidence was pulled over the Zetaris protocol',
    listed.pull === null ? 'no pull' : `${listed.pull.mode}, ${listed.pull.requests} request(s)`,
  )
  check(listed.contentId !== null && listed.contentId !== '', 'the listing has a canonical record id')
  console.log(`           ${listed.listingCopy}`)

  // ---- the same token, a second time ----------------------------------------
  const reused = await selfList({
    registry,
    tokens,
    registrationId: bought.registrationId,
    secret: bought.secret,
    declaredPriceZar: 1440,
    termMonths: 12,
    now: () => AT,
    // A fixed trace id, so the P8 evidence is one file per path and never multiplies.
    trace: createTraceSink('trace-20261022-listing-accept'),
  })

  console.log(`self-list  -> refused: ${reused.reason}`)
  check(!reused.ok, 'the same token cannot list a second time')
  check(reused.listingId === null, 'no second listing was created')

  // ---- a second payment, a second token, a price the evidence refuses -------
  const second = await buyTheRightToList({
    registry,
    tokens,
    facilitator,
    agent,
    at: '2026-10-22T06:05:00.000Z',
  })
  if (!second) {
    console.log('FAIL the second payment did not complete')
    return 1
  }

  const overdeclared = await selfList({
    registry,
    tokens,
    registrationId: second.registrationId,
    secret: second.secret,
    declaredPriceZar: 9999,
    termMonths: 12,
    now: () => '2026-10-22T06:05:00.000Z',
    trace: createTraceSink('trace-20261022-listing-hold'),
  })

  console.log(
    `self-list  -> listing ${overdeclared.listingId} declared at R${overdeclared.declaredPriceZar}, ` +
      `evidence pipeline ran, decision: ${overdeclared.decision}`,
  )
  check(overdeclared.decision === 'hold', 'a price the evidence does not support is held', overdeclared.reason)
  check(overdeclared.status === 'held', 'the held listing is not published')
  console.log(`           ${overdeclared.listingCopy}`)

  // ---- the secrets never reach the trace -----------------------------------
  const traces = [listed.tracePath, overdeclared.tracePath].filter(
    (path): path is string => typeof path === 'string',
  )
  const traceText = traces.map((path) => readFileSync(path, 'utf8')).join('\n')
  check(
    !traceText.includes(bought.secret) && !traceText.includes(second.secret),
    'the listing token secrets never reach the trace',
  )
  check(
    !/nonce/i.test(traceText),
    'the payment nonce never reaches the trace',
  )
  check(
    traceText.includes('conflict-critic'),
    'the trace shows the critic that judged the agent’s own price',
  )
  console.log('')
  for (const entry of checks) {
    if (entry.ok) console.log(`ok   ${entry.label}`)
    else console.log(`FAIL ${entry.label}${entry.detail === '' ? '' : ` — ${entry.detail}`}`)
  }
  for (const path of traces) {
    const lines = readFileSync(path, 'utf8').trim().split('\n').filter(Boolean)
    console.log(`trace: ${path} (${lines.length} entries)`)
  }

  console.log('')
  if (failures.length === 0) {
    console.log('PASS one payment buys one listing, the token cannot be reused, and the agent’s own price can be held')
    return 0
  }
  for (const failure of failures) console.log(`FAIL ${failure}`)
  return 1
}

process.exitCode = await main()
