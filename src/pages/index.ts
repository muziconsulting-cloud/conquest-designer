/**
 * `/` — the exchange at a glance.
 *
 * Every number on this page is a count of what the pipeline actually produced: the
 * listings it closed, the trades this process settled, the certificates it issued.
 * The page states the invariant and shows the line that carries it.
 */

import { page } from './layout.ts'
import { escape, list, rand } from './html.ts'
import { listListings, listRuns, listSettlements } from './data.ts'
import { RECEIVING_ADDRESS, VENUE_NAME } from '../venue.ts'

const QUICK_START = `bun install
bun run swarm -- --input input_examples/example_1.json
bun run serve -- --port 3000
curl -s -X POST http://127.0.0.1:3000/run -H 'Content-Type: application/json' \\
  -d @input_examples/example_1.json`

export const renderHome = (): string => {
  const listings = listListings()
  const runs = listRuns()
  const { trades, settled, certificates } = listSettlements()

  const published = listings.filter((listing) => listing.status === 'published')
  const held = listings.filter((listing) => listing.status === 'held')
  const revised = listings.filter((listing) => listing.decision === 'revise')
  const degraded = listings.filter((listing) => listing.fallbackReasons.length > 0)
  const escalated = listings.filter((listing) => listing.escalated)

  const cards = [
    { n: String(listings.length), k: 'listings closed' },
    { n: String(published.length), k: 'published' },
    { n: String(held.length), k: 'held' },
    { n: String(revised.length), k: 'revised' },
    { n: String(degraded.length), k: 'closed on degraded evidence' },
    { n: String(escalated.length), k: 'escalated' },
    { n: String(settled), k: 'trades settled' },
    { n: String(certificates.length), k: 'certificates issued' },
  ]
    .map((card) => `<div class="card"><div class="n">${escape(card.n)}</div><div class="k">${escape(card.k)}</div></div>`)
    .join('')

  const recent = listings.slice(0, 8)
  const rows = recent
    .map(
      (listing) => `<tr>
      <td><a href="/listing/${escape(listing.listingId)}">${escape(listing.listingId)}</a></td>
      <td>${escape(listing.agent?.displayName ?? '—')}</td>
      <td class="num">${escape(rand(listing.declaredPriceZar))}</td>
      <td>${escape(listing.termMonths ?? '—')} mo</td>
      <td><span class="pill ${escape(listing.status ?? '')}">${escape(listing.status ?? '—')}</span></td>
      <td class="small muted">${escape(listing.runId)}</td>
    </tr>`,
    )
    .join('')

  const body = `
<div class="callout">
  <p><strong>The invariant.</strong> Value moves only through settlement. The listing swarm
  decides what the evidence supports; the escrow settles it; the settlement issues the
  certificate. There is no path to a certificate for a trade that was not paid.</p>
  <p class="small muted">${escape(list(published.map((listing) => listing.listingId)))} published,
  ${escape(list(held.map((listing) => listing.listingId)))} held. Every rand the exchange receives
  is received at <code>${escape(RECEIVING_ADDRESS)}</code> — ${escape(VENUE_NAME)}.</p>
</div>

<div class="grid">${cards}</div>

<h2>Listings</h2>
${
  recent.length === 0
    ? '<p class="muted">No listing has been closed yet. Run the swarm, then reload this page.</p>'
    : `<table>
<thead><tr><th>Listing</th><th>Agent</th><th class="num">Declared</th><th>Term</th><th>Status</th><th>Run</th></tr></thead>
<tbody>${rows}</tbody></table>`
}
<p class="small"><a href="/listings">All listings →</a></p>

<h2>Money</h2>
<p>${escape(String(trades.length))} trade(s) opened in this process, ${escape(String(settled))} settled.
${escape(String(certificates.length))} certificate(s) issued — each one verifiable from its own bytes.</p>
${
  certificates.length === 0
    ? `<p class="small muted">No certificate is issued yet. A certificate exists only after a trade
      settles: <code>POST /settle</code>. An id that was never issued has no page — it says so.</p>`
    : `<ul>${certificates
        .map((id) => `<li><a href="/avc/${escape(id)}">${escape(id)}</a></li>`)
        .join('')}</ul>`
}

<h2>Runs</h2>
<p>${escape(String(runs.length))} run(s) on disk, ${escape(String(runs.reduce((total, run) => total + run.lines, 0)))} trace line(s) in total.</p>
<p class="small"><a href="/trace">The trace, rendered →</a></p>

<h2>Run it yourself</h2>
<pre>${escape(QUICK_START)}</pre>
<p class="small muted">The surface is server-rendered. There is no client framework, no build step and
no dependency beyond Bun and TypeScript.</p>
`

  return page({
    title: 'The exchange',
    path: '/',
    heading: 'The exchange',
    lede: 'An exchange for agentic identities. The owner declares the price; the evidence decides whether it stands; the settlement issues the certificate.',
    body,
  })
}
