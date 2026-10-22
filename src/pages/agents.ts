/**
 * `/agents` — the five agents, what each one decided, and the trace behind it.
 *
 * The roster is the pipeline's own: the roles that actually ran, the steps they took and
 * the last thing each said. The line that carried the decision is linked, so a reader
 * can walk from a decision back to the step that made it.
 */

import { page } from './layout.ts'
import { escape } from './html.ts'
import { listAgents, listListings, readTraceLines } from './data.ts'
import type { AgentView } from './data.ts'

const linesOf = (role: string): number =>
  readTraceLines().filter((line) => line.role === role).length

export const renderAgents = (): string => {
  const agents = listAgents()
  const listings = listListings()

  const cards = agents
    .map(
      (agent: AgentView) => `<div class="card">
  <div class="k">${escape(agent.role)}</div>
  <div class="n">${escape(String(agent.steps))}</div>
  <div class="k">steps in ${escape(String(agent.runs.length))} run(s)</div>
  <p class="small">${escape(agent.duty)}</p>
</div>`,
    )
    .join('')

  const rows = agents
    .map(
      (agent) => `<tr>
  <td><strong>${escape(agent.role)}</strong><div class="small muted">${escape(agent.duty)}</div></td>
  <td class="num">${escape(String(agent.steps))}</td>
  <td>${escape(agent.actions.join(', '))}</td>
  <td>${escape(agent.outcomes.join(', '))}</td>
  <td>${escape(agent.handoff ?? '—')}</td>
  <td class="small">${escape(agent.lastOutput || '—')}</td>
</tr>`,
    )
    .join('')

  const decisions = listings
    .map(
      (listing) => `<tr>
  <td><a href="/listing/${escape(listing.listingId)}">${escape(listing.listingId)}</a></td>
  <td>${escape(listing.agent?.displayName ?? '—')}</td>
  <td>${escape(listing.decision ?? '—')}</td>
  <td>${escape(listing.status ?? '—')}</td>
  <td>${escape(listing.critique?.verdict ?? '—')}</td>
  <td class="small">${escape(listing.critique?.reason ?? '—')}</td>
</tr>`,
    )
    .join('')

  const body = `
<div class="grid">${cards}</div>

<h2>What each agent did</h2>
<table>
<thead><tr><th>Agent</th><th class="num">Steps</th><th>Actions</th><th>Outcomes</th><th>Hands off to</th><th>Last said</th></tr></thead>
<tbody>${rows}</tbody>
</table>

<h2>What each listing was decided</h2>
${
  decisions === ''
    ? '<p class="muted">No listing has been closed yet.</p>'
    : `<table>
<thead><tr><th>Listing</th><th>Agent</th><th>Decision</th><th>Status</th><th>Critic</th><th>Why</th></tr></thead>
<tbody>${decisions}</tbody></table>`
}

<p class="small"><a href="/trace">The trace, rendered →</a></p>
`

  return page({
    title: 'Agents',
    path: '/agents',
    heading: 'The five agents',
    lede: 'The swarm is five agents and one loop: plan, reconcile, close, challenge, audit. Each one hands to the next, and every handoff is in the trace.',
    body,
  })
}
