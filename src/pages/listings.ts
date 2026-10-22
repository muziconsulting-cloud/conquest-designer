/**
 * `/listings` and `/listing/:id` — what the pipeline decided, and the lines that decided it.
 *
 * A held listing is shown as held, with the critique that held it. Nothing here is
 * softened: the decision, the status, the price the evidence supports and the memory ids
 * the evidence cites are all read from the trace, and the trace is linked.
 */

import { page } from './layout.ts'
import { confidence, escape, list, rand, short, term } from './html.ts'
import { getListing, listListings } from './data.ts'
import type { ListingView, TraceLine } from './data.ts'

const pill = (value: string | null, kind?: string): string =>
  `<span class="pill ${escape(kind ?? value ?? '')}">${escape(value ?? '—')}</span>`

const memoryChips = (ids: string[]): string =>
  ids.length === 0
    ? '<span class="muted">none</span>'
    : ids.map((id) => `<code>${escape(id)}</code>`).join(' ')

const traceTable = (lines: TraceLine[]): string => {
  if (lines.length === 0) return '<p class="muted">No trace line for this listing.</p>'
  const rows = lines
    .map(
      (line) => `<tr>
      <td class="num">${escape(line.step)}</td>
      <td>${escape(line.role)}</td>
      <td><code>${escape(line.action)}</code></td>
      <td>${pill(line.outcome, line.outcome)}</td>
      <td>${escape(line.input_summary)}</td>
      <td>${escape(line.output_summary)}</td>
      <td class="num">${escape(confidence(line.confidence))}</td>
    </tr>`,
    )
    .join('')
  return `<table>
<thead><tr><th class="num">#</th><th>Agent</th><th>Action</th><th>Outcome</th><th>In</th><th>Out</th><th class="num">Conf.</th></tr></thead>
<tbody>${rows}</tbody></table>`
}

export const renderListings = (): string => {
  const listings = listListings()

  const rows = listings
    .map(
      (listing) => `<tr>
      <td><a href="/listing/${escape(listing.listingId)}">${escape(listing.listingId)}</a></td>
      <td>${escape(listing.agent?.displayName ?? '—')}<div class="small muted mono">${escape(listing.agent?.agentId ?? '')}</div></td>
      <td class="num">${escape(rand(listing.declaredPriceZar))}</td>
      <td class="num">${escape(rand(listing.reconciledPriceZar))}</td>
      <td>${escape(term(listing.termMonths))}</td>
      <td>${pill(listing.decision)}</td>
      <td>${pill(listing.status)}</td>
      <td>${escape(listing.memoryIds.length)}</td>
      <td class="small muted">${escape(listing.runId)}</td>
    </tr>`,
    )
    .join('')

  const body = listings.length === 0
    ? '<p class="muted">No listing has been closed yet.</p>'
    : `<table>
<thead><tr><th>Listing</th><th>Agent</th><th class="num">Declared</th><th class="num">Supported</th><th>Term</th><th>Decision</th><th>Status</th><th class="num">Memories</th><th>Run</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="small muted">“Supported” is the price the reconciled evidence stands behind. It is the
pipeline's number, read from the trace — not a second opinion from the surface.</p>`

  return page({
    title: 'Listings',
    path: '/listings',
    heading: 'Listings',
    lede: 'Every listing the swarm has closed: the agent, the price it declared, the price the evidence supports, the decision and the status.',
    body,
  })
}

/** The state for a listing that was never closed. A clear miss, not a fake. */
export const renderListingMissing = (listingId: string): string =>
  page({
    title: 'Not closed',
    path: '/listings',
    heading: 'No such listing',
    body: `<div class="callout bad">
  <p><strong>This listing was never closed.</strong> <code>${escape(listingId)}</code> is not in any
  trace on disk.</p>
  <p>A listing exists when the swarm closes one. There is no page for a listing that was never
  closed, and no way to make this page show one that does not exist.</p>
</div>
<p class="small"><a href="/listings">All listings →</a></p>`,
  })

export const renderListing = (listing: ListingView): string => {
  const agent = listing.agent
  const evidence = listing.evidence

  /**
   * What to say about the supported price. The words follow the pipeline's own
   * outcome: a published listing either stands at the declared price or was revised,
   * and a held listing was never reconciled into a price at all.
   */
  const supportedNote = (): string => {
    if (listing.reconciledPriceZar === null) return 'the listing was held — it was never reconciled into a price'
    if (listing.reconciledPriceZar === listing.declaredPriceZar) return 'the declared price stands'
    if (listing.status === 'held') return 'the declared price does not stand'
    return 'the price was revised'
  }

  const evidenceRows = evidence
    ? Object.keys(evidence.values)
        .map(
          (field) => `<tr>
      <td><code>${escape(field)}</code></td>
      <td>${escape(evidence.values[field] ?? '')}</td>
      <td>${escape(evidence.provenance[field] ?? '—')}</td>
      <td class="small">${escape(list(evidence.corroborated[field] ?? [], 'and'))}</td>
    </tr>`,
        )
        .join('')
    : ''

  const conflicts =
    listing.critique && listing.critique.conflicts.length > 0
      ? `<pre>${escape(JSON.stringify(listing.critique.conflicts, null, 2))}</pre>`
      : '<p class="muted small">No conflicting positions were recorded for this listing.</p>'

  const body = `
<div class="grid">
  <div class="card"><div class="k">Declared price</div><div class="n">${escape(rand(listing.declaredPriceZar))}</div>
    <div class="k">for ${escape(term(listing.termMonths))}</div></div>
  <div class="card"><div class="k">Supported by the evidence</div><div class="n">${escape(rand(listing.reconciledPriceZar))}</div>
    <div class="k">${escape(supportedNote())}</div></div>
  <div class="card"><div class="k">Decision</div><div class="n">${escape(listing.decision ?? '—')}</div>
    <div class="k">${escape(listing.status ?? '—')}</div></div>
  <div class="card"><div class="k">Confidence</div><div class="n">${escape(confidence(listing.confidence))}</div>
    <div class="k">content id ${escape(short(listing.contentId ?? '—', 14))}</div></div>
</div>

<h2>The agent</h2>
<table>
<tbody>
  <tr><th>Agent id</th><td><code>${escape(agent?.agentId ?? '—')}</code></td></tr>
  <tr><th>Display name</th><td>${escape(agent?.displayName ?? '—')}</td></tr>
  <tr><th>Wallet</th><td class="mono">${escape(agent?.walletAddress ?? '—')}</td></tr>
  <tr><th>Key hash</th><td class="mono">${escape(agent?.agentKeyHash ?? '—')}</td></tr>
  <tr><th>Declared by</th><td>${escape(listing.declaredBy ?? '—')}</td></tr>
</tbody>
</table>

<h2>The evidence</h2>
${
  evidenceRows === ''
    ? '<p class="muted">This listing carries no reconciled field.</p>'
    : `<table>
<thead><tr><th>Field</th><th>Value</th><th>Provenance</th><th>Corroborated by</th></tr></thead>
<tbody>${evidenceRows}</tbody></table>`
}
<p class="small">Sources pulled: ${escape(list(evidence?.sources ?? [], 'and'))}. Memory ids cited:
${memoryChips(listing.memoryIds)}.</p>
${
  listing.fallbackReasons.length > 0
    ? `<div class="callout bad"><p><strong>Closed on degraded evidence.</strong>
        ${escape(list(listing.fallbackReasons, 'and'))}.</p></div>`
    : ''
}

<h2>The critique</h2>
${
  listing.critique
    ? `<div class="callout${listing.critique.verdict === 'hold' ? ' warn' : ''}">
  <p>${pill(listing.critique.verdict)}</p>
  <p>${escape(listing.critique.reason)}</p>
  <p class="small muted">Supported by ${memoryChips(listing.critique.supportingMemoryIds)}</p>
</div>
${conflicts}`
    : '<p class="muted">The critic did not challenge this listing.</p>'
}
${
  listing.revision
    ? `<h3>The answer</h3><pre>${escape(JSON.stringify(listing.revision.answers, null, 2))}</pre>`
    : ''
}
${
  listing.escalated
    ? `<div class="callout bad"><p><strong>Escalated by the auditor.</strong>
        ${escape(listing.escalation || 'The auditor escalated this listing.')}</p></div>`
    : ''
}

<h2>The listing copy</h2>
<p>${escape(listing.listingCopy || '—')}</p>

<h2>The trace</h2>
<p class="small">Run <code>${escape(listing.runId)}</code> — <code>${escape(listing.tracePath)}</code>.
<a href="/trace?run=${escape(listing.runId)}">The whole run, rendered →</a></p>
${traceTable(listing.lines)}
`

  return page({
    title: listing.listingId,
    path: '/listings',
    heading: listing.listingId,
    lede: `${listing.agent?.displayName ?? 'An agent'} — declared ${rand(listing.declaredPriceZar)} for ${term(listing.termMonths)}.`,
    body,
  })
}
