/**
 * `/trace` — the JSONL trace, rendered.
 *
 * The trace is the deliverable a judge reads, so the page shows it as it was written:
 * one line per agent step, in order, with the detail the step carried. `?run=<id>`
 * selects a single run; without it the page shows the runs on disk and the lines of the
 * most recent one.
 */

import { page } from './layout.ts'
import { confidence, escape } from './html.ts'
import { listRuns, readRun } from './data.ts'
import type { TraceLine } from './data.ts'

const lineRow = (line: TraceLine): string => `<tr>
  <td class="num">${escape(line.step)}</td>
  <td>${escape(line.role)}</td>
  <td><code>${escape(line.action)}</code></td>
  <td><span class="pill ${escape(line.outcome)}">${escape(line.outcome)}</span></td>
  <td>${escape(line.target_agent ?? '—')}</td>
  <td>${escape(line.input_summary)}</td>
  <td>${escape(line.output_summary)}</td>
  <td class="num">${escape(confidence(line.confidence))}</td>
  <td class="small muted">${escape(line.at)}</td>
</tr>`

const linesTable = (lines: TraceLine[]): string => {
  if (lines.length === 0) return '<p class="muted">No trace line.</p>'
  return `<table>
<thead><tr><th class="num">#</th><th>Agent</th><th>Action</th><th>Outcome</th><th>Hands off to</th><th>In</th><th>Out</th><th class="num">Conf.</th><th>At</th></tr></thead>
<tbody>${lines.map(lineRow).join('')}</tbody></table>`
}

const detailBlocks = (lines: TraceLine[]): string => {
  if (lines.length === 0) return ''
  const blocks = lines
    .map(
      (line) => `<details>
  <summary><code>${escape(line.action)}</code> — ${escape(line.role)}, step ${escape(line.step)}</summary>
  <pre>${escape(JSON.stringify(line.detail, null, 2))}</pre>
</details>`,
    )
    .join('')
  return `<h2>The detail, step by step</h2>${blocks}`
}

export const renderTrace = (runId: string | null): string => {
  const runs = listRuns()

  if (runs.length === 0) {
    return page({
      title: 'Trace',
      path: '/trace',
      heading: 'The trace',
      body: '<p class="muted">No trace on disk yet. Run the swarm, then reload this page.</p>',
    })
  }

  const selected = runId === null ? null : runs.find((run) => run.runId === runId)
  if (runId !== null && !selected) {
    return page({
      title: 'Trace',
      path: '/trace',
      heading: 'No such run',
      body: `<div class="callout bad"><p><strong>No run called <code>${escape(runId)}</code>.</strong></p>
      <p class="small muted">The runs on disk are listed below.</p></div>
      ${runList(runs)}`,
    })
  }

  const run = selected ?? runs[runs.length - 1]
  if (!run) {
    return page({
      title: 'Trace',
      path: '/trace',
      heading: 'The trace',
      body: '<p class="muted">No trace on disk yet. Run the swarm, then reload this page.</p>',
    })
  }
  const lines = readRun(run.runId)

  const body = `
<p class="small">Showing <code>${escape(run.runId)}</code> — ${escape(String(run.lines))} line(s),
${escape(String(run.listingIds.length))} listing(s). The raw file is <code>${escape(run.tracePath)}</code>.</p>

${runList(runs, run.runId)}

<h2>The lines</h2>
${linesTable(lines)}

${detailBlocks(lines)}
`

  return page({
    title: run.runId,
    path: '/trace',
    heading: run.runId,
    lede: 'One line per agent step, in the order they ran. The detail under each step is the evidence that step carried.',
    body,
  })
}

const runList = (runs: ReturnType<typeof listRuns>, current?: string): string => {
  const rows = runs
    .map(
      (run) => `<tr${run.runId === current ? ' style="font-weight:600"' : ''}>
  <td>${run.runId === current ? escape(run.runId) : `<a href="/trace?run=${escape(run.runId)}">${escape(run.runId)}</a>`}</td>
  <td class="num">${escape(String(run.lines))}</td>
  <td>${escape(run.listingIds.join(', ')) || '—'}</td>
  <td class="small muted">${escape(run.startedAt)}</td>
</tr>`,
    )
    .join('')
  return `<h2>Runs on disk</h2>
<table>
<thead><tr><th>Run</th><th class="num">Lines</th><th>Listings</th><th>Started</th></tr></thead>
<tbody>${rows}</tbody></table>`
}
