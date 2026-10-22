/**
 * The AVC selftest — one fixture trade, settled end to end.
 *
 *   escrow lock -> claim -> seller paid -> certificate issued
 *
 * then the certificate is **verified from its own signed bytes**, with no help from
 * the issuer, and a tampered copy is verified and refused.
 *
 * The output is the format the P7 prompt specifies:
 *
 *   certificate <id>
 *     who:        <address> (<agent id>)
 *     paid:       <amount> <currency> (ref <payment ref>)
 *     bought:     <listing id>
 *     signature:  <alg> <verified: true>
 *
 * Run: `bun run avc:selftest`
 *
 * **The key.** The signing key comes from the environment. If `AVC_PRIVATE_KEY` is
 * not set, this script generates a **throwaway keypair in memory** for the run and
 * says so, loudly. It is never written to disk, never committed, and the library
 * itself has no default key — `signAvc` fails loudly when the environment is empty.
 */

import { Escrow } from '../src/escrow/index.ts'
import { issueForSettledTrade } from '../src/avc/certificate.ts'
import { verifyCertificate } from '../src/avc/verify.ts'
import { CertificateStore } from '../src/avc/store.ts'
import { jwksDocument, readEnv } from '../src/avc/sign.ts'
import { deriveCertificateId } from '../src/avc/canonical.ts'
import { bodyFromPayload } from '../src/avc/certificate.ts'
import type { AgentIdentity } from '../src/types.ts'

const failures: string[] = []

const check = (ok: boolean, label: string, detail = ''): void => {
  if (ok) console.log(`ok   ${label}`)
  else {
    failures.push(label)
    console.log(`FAIL ${label}${detail === '' ? '' : ` — ${detail}`}`)
  }
}

const toBase64Url = (bytes: Uint8Array): string =>
  Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

/** A throwaway keypair for the run, when the environment does not carry one. */
async function ensureKey(): Promise<{ ephemeral: boolean }> {
  const existing = readEnv('AVC_PRIVATE_KEY')
  if (existing && readEnv('AVC_PUBLIC_KEY')) return { ephemeral: false }

  const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ])) as unknown as CryptoKeyPair
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  const publicBytes = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
  const publicRaw = new Uint8Array(new ArrayBuffer(publicBytes.byteLength))
  publicRaw.set(publicBytes)

  const bun = (globalThis as { Bun?: { env: Record<string, string | undefined> } }).Bun
  if (bun?.env) {
    bun.env.AVC_PUBLIC_KEY = toBase64Url(publicRaw)
    bun.env.AVC_PRIVATE_KEY = JSON.stringify(privateJwk)
  } else {
    process.env.AVC_PUBLIC_KEY = toBase64Url(publicRaw)
    process.env.AVC_PRIVATE_KEY = JSON.stringify(privateJwk)
  }
  void publicJwk
  return { ephemeral: true }
}

const agent: AgentIdentity = {
  agentId: 'AGT-SOLARISER',
  agentKeyHash: 'sha256:2f9c1b0e5a7d',
  walletAddress: '0x3d5975a75f88656B09B3086e82CBcAF8470F517E',
  displayName: 'Solariser',
}

async function main(): Promise<number> {
  console.log('avc selftest — escrow lock → claim → seller paid → certificate issued')
  console.log('')

  const { ephemeral } = await ensureKey()
  if (ephemeral) {
    console.log('note: AVC_PRIVATE_KEY was not in the environment — this run used a throwaway')
    console.log('      keypair generated in memory. It is never written to disk.')
    console.log('')
  }

  // ---- the trade ------------------------------------------------------------
  const escrow = new Escrow()
  const trade = escrow.create({
    tradeId: 'TRD-20261022-001',
    listingId: 'LST-0001',
    amountZar: 1440,
    buyer: 'human:collector-01',
    seller: agent.agentId,
    paymentRef: 'x402_01JQ8H2Z5V7K9M3N',
    at: '2026-10-22T05:00:00.000Z',
  })

  escrow.lock(trade.tradeId, '2026-10-22T05:00:01.000Z')
  check(escrow.get(trade.tradeId).state === 'pending', 'the funds lock and the escrow holds (pending)')
  escrow.claim(trade.tradeId, '2026-10-22T05:00:02.000Z')
  check(escrow.get(trade.tradeId).state === 'claimed', 'the buyer claims')

  // The certificate must not exist before the settlement.
  let refusedEarly = false
  try {
    await issueForSettledTrade(escrow.get(trade.tradeId), {
      who: agent,
      method: 'x402',
      listingId: 'LST-0001',
      termMonths: 12,
      accessGrantedAt: '2026-10-22T05:00:02.000Z',
      issuedAt: '2026-10-22T05:00:02.000Z',
    })
  } catch {
    refusedEarly = true
  }
  check(refusedEarly, 'no certificate before the trade settles')

  escrow.settle(trade.tradeId, '2026-10-22T05:00:03.000Z')
  check(escrow.get(trade.tradeId).state === 'settled', 'the seller is paid and the trade settles')

  // The other way to settle: the buyer AND the seller both confirm.
  const both = escrow.create({
    tradeId: 'TRD-20261022-002',
    listingId: 'LST-0003',
    amountZar: 720,
    buyer: 'human:collector-02',
    seller: 'AGT-POUND',
    paymentRef: 'x402_01JQ8H2Z5V7K9M3P',
    at: '2026-10-22T05:00:00.000Z',
  })
  escrow.lock(both.tradeId, '2026-10-22T05:01:00.000Z')
  escrow.sellerConfirm(both.tradeId, '2026-10-22T05:01:01.000Z')
  check(escrow.get(both.tradeId).state === 'pending', 'one confirmation does not release the funds')
  escrow.buyerConfirm(both.tradeId, '2026-10-22T05:01:02.000Z')
  check(escrow.get(both.tradeId).state === 'settled', 'both parties confirming releases the escrow')

  // ---- the certificate ------------------------------------------------------
  const settled = escrow.get(trade.tradeId)
  const avc = await issueForSettledTrade(settled, {
    who: agent,
    method: 'x402',
    listingId: 'LST-0001',
    termMonths: 12,
    accessGrantedAt: '2026-10-22T05:00:02.000Z',
    issuedAt: '2026-10-22T05:00:03.000Z',
  })

  const store = new CertificateStore()
  store.put({ avc, signature: avc.proof?.value ?? '', tradeId: settled.tradeId, issuedAt: avc.issuedAt })
  check(store.has(avc.certificateId), 'the issued certificate is stored and findable by id')

  // ---- verification, from the bytes alone -----------------------------------
  const jwks = jwksDocument()
  const verified = await verifyCertificate(avc, { jwks })
  check(verified.valid, 'the certificate verifies from its signed bytes', verified.reasons.join('; '))

  const payload = avc.proof?.payload as unknown as { paid: { paymentRef: string } }

  console.log('')
  console.log(`certificate ${avc.certificateId}`)
  console.log(`  who:        ${avc.who.walletAddress} (${avc.who.agentId})`)
  console.log(
    `  paid:       ${avc.whatWasPaid.amountZar} ${avc.whatWasPaid.currency} (ref ${payload.paid.paymentRef})`,
  )
  console.log(`  bought:     ${avc.whatItBought.listingId}`)
  console.log(`  signature:  ${avc.proof?.alg ?? 'none'} <verified: ${verified.valid}>`)
  console.log('')

  // The same settled trade yields the same certificate id.
  const again = await issueForSettledTrade(settled, {
    who: agent,
    method: 'x402',
    listingId: 'LST-0001',
    termMonths: 12,
    accessGrantedAt: '2026-10-22T05:00:02.000Z',
    issuedAt: '2026-10-22T05:00:03.000Z',
  })
  check(again.certificateId === avc.certificateId, 'the same settled trade yields the same certificate id')

  // ---- the tampered certificate ---------------------------------------------
  const tampered = {
    ...avc,
    whatWasPaid: { ...avc.whatWasPaid, amountZar: avc.whatWasPaid.amountZar + 1 },
  }
  const tamperedResult = await verifyCertificate(tampered, { jwks })
  check(!tamperedResult.valid, 'a tampered certificate is refused', tamperedResult.reasons.join('; '))

  // The tampered content derives a different id — the id is the content's address.
  const tamperedPayload = avc.proof?.payload as unknown as Parameters<typeof bodyFromPayload>[0]
  const tamperedId = deriveCertificateId(tamperedPayload, {
    who: { ...tampered.who },
    whatWasPaid: { ...tampered.whatWasPaid },
    whatItBought: { ...tampered.whatItBought },
  })
  check(tamperedId !== avc.certificateId, 'the tampered content derives a different certificate id')

  console.log('')
  console.log(`certificate ${tamperedId}  (tampered: the amount was changed by 1 rand)`)
  console.log(`  who:        ${tampered.who.walletAddress} (${tampered.who.agentId})`)
  console.log(
    `  paid:       ${tampered.whatWasPaid.amountZar} ${tampered.whatWasPaid.currency} (ref ${payload.paid.paymentRef})`,
  )
  console.log(`  bought:     ${tampered.whatItBought.listingId}`)
  console.log(`  signature:  ${tampered.proof?.alg ?? 'none'} <verified: ${tamperedResult.valid}>`)
  console.log('')

  if (failures.length === 0) {
    console.log('PASS the certificate is issued on settlement, and verifies from its own bytes')
    return 0
  }
  for (const failure of failures) console.log(`FAIL ${failure}`)
  return 1
}

process.exitCode = await main()
