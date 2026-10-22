/**
 * `/avc/:id` — one certificate, and a live verification of it.
 *
 * The page shows the three facts the certificate carries, the signature, and the
 * result of verifying it right now, from its own bytes. A certificate that was never
 * issued has no page: the route answers with a clear "not issued" state, and never a
 * fake one.
 */

import { page } from './layout.ts'
import { escape, rand, term } from './html.ts'
import { verifyIssued } from '../settlement/index.ts'
import type { Avc } from '../types.ts'

export interface CertificatePage {
  html: string
  status: 200 | 404
}

const avcOf = (value: unknown): Avc | null => {
  if (typeof value !== 'object' || value === null) return null
  const source = value as Record<string, unknown>
  const who = source.who
  const whatWasPaid = source.whatWasPaid
  const whatItBought = source.whatItBought
  if (typeof who !== 'object' || who === null) return null
  if (typeof whatWasPaid !== 'object' || whatWasPaid === null) return null
  if (typeof whatItBought !== 'object' || whatItBought === null) return null
  return value as Avc
}

/** The page for a certificate that was never issued. */
export const renderNotIssued = (certificateId: string): string =>
  page({
    title: 'Not issued',
    path: '/listings',
    heading: 'No such certificate',
    body: `<div class="callout bad">
  <p><strong>This certificate was not issued.</strong> <code>${escape(certificateId)}</code> is not in
  the issued-certificate store of this process.</p>
  <p>A certificate exists only when a trade settles. There is no page for one that was
  never issued, and no way to make this page show a certificate that does not exist.</p>
  <p class="small muted">Settle a trade — <code>POST /settle</code> — and the certificate it issues
  will have a page here.</p>
</div>
<p class="small"><a href="/">Back to the exchange →</a></p>`,
  })

export const renderCertificate = async (certificateId: string): Promise<CertificatePage> => {
  const verified = await verifyIssued(certificateId)
  if (!verified.found) {
    return { html: renderNotIssued(certificateId), status: 404 }
  }

  const avc = avcOf(verified.certificate)
  if (!avc) {
    return { html: renderNotIssued(certificateId), status: 404 }
  }

  const proof = avc.proof
  const body = `
<div class="callout${verified.valid ? '' : ' bad'}">
  <p><strong>${verified.valid ? 'Verified.' : 'Refused.'}</strong> The signature over this
  certificate checks out against the published key.</p>
  <p class="small muted">Verified just now, from the certificate's own bytes. The verifier never
  asks us whether the certificate is real — <code>/.well-known/avc-jwks.json</code> publishes the
  key it was checked against.</p>
  ${
    verified.reasons.length > 0
      ? `<ul>${verified.reasons.map((reason) => `<li>${escape(reason)}</li>`).join('')}</ul>`
      : ''
  }
</div>

<h2>The three facts</h2>
<table>
<tbody>
  <tr><th style="width:14rem">Who</th><td>
    <strong>${escape(avc.who.displayName)}</strong> <code>${escape(avc.who.agentId)}</code>
    <div class="small muted mono">${escape(avc.who.walletAddress)}</div>
    <div class="small muted mono">key ${escape(avc.who.agentKeyHash)}</div>
  </td></tr>
  <tr><th>What was paid</th><td>
    <strong>${escape(rand(avc.whatWasPaid.amountZar))}</strong>
    <span class="muted">(${escape(avc.whatWasPaid.currency)}, whole rand)</span>
    <div class="small muted">method ${escape(avc.whatWasPaid.method)} · paid at
      ${escape(avc.whatWasPaid.paidAt)}</div>
    <div class="small muted">declared by the owner:
      ${avc.whatWasPaid.declaredByOwner ? 'yes — the certificate attests what the owner declared, not what we computed' : 'no'}</div>
  </td></tr>
  <tr><th>What it bought</th><td>
    <strong>${escape(avc.whatItBought.listingId)}</strong>
    for ${escape(term(avc.whatItBought.termMonths))}
    <div class="small muted">access granted at ${escape(avc.whatItBought.accessGrantedAt)}</div>
  </td></tr>
  <tr><th>Certificate id</th><td class="mono">${escape(avc.certificateId)}</td></tr>
  <tr><th>Issued at</th><td>${escape(avc.issuedAt)}</td></tr>
</tbody>
</table>
<p class="small muted">Three facts, and nothing else. It is not a valuation, not a score and not a
token: it is a signed statement that a specific payment settled a specific access term.</p>

<h2>The signature</h2>
<table>
<tbody>
  <tr><th style="width:14rem">Algorithm</th><td>${escape(proof?.alg ?? '—')}</td></tr>
  <tr><th>Key id</th><td class="mono">${escape(proof?.kid ?? '—')}</td></tr>
  <tr><th>Signature</th><td class="mono" style="word-break:break-all">${escape(proof?.value ?? '—')}</td></tr>
  <tr><th>Verify at</th><td><a href="${escape(proof?.verify ?? '/.well-known/avc-jwks.json')}">${escape(proof?.verify ?? '/.well-known/avc-jwks.json')}</a></td></tr>
</tbody>
</table>
<p class="small muted">The id is content-addressed: it is derived from the attested content, so the
same settled trade always yields the same id, and a certificate edited in any field no longer
derives its own id.</p>

<p class="small"><a href="/">Back to the exchange →</a></p>
`

  return {
    html: page({
      title: avc.certificateId,
      path: '/listings',
      heading: avc.certificateId,
      lede: `The certificate for ${avc.whatItBought.listingId} — ${avc.who.displayName}.`,
      body,
    }),
    status: 200,
  }
}
