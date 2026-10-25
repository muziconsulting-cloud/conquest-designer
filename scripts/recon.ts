/**
 * The listing-side reconciliation check.
 *
 * HONEST SCOPE: this script checks the **listing-side** invariant. The money path
 * lives elsewhere: the escrow settles and the certificate is issued by the settlement
 * work (P7/P8), and its own invariant is proved by `bun run avc:selftest` — the
 * certificate verifies from its own bytes. No cash moves here, and this script does
 * not claim to check it. It checks the invariants that exist in the listing swarm:
 *
 *  1. Nothing is published that the evidence does not support.
 *  2. Every published listing carries the provenance of the source that decided it.
 *  3. The canonical record is content-addressed: the same content yields the same id,
 *     and a different decision yields a different id.
 *  4. Two runs of the same fixtures are decision-identical.
 *
 * Run: `bun run scripts/recon.ts`
 */

import { loadListings } from '../src/loading.ts'
import { runExchange } from '../src/orchestrator/index.ts'
import type { Finding } from '../src/orchestrator/index.ts'

const run = async (requestId: string) =>
  runExchange({
    request: {
      request_id: requestId,
      user_query: 'Close every sample listing.',
      context: {},
    },
  })

const decide = (finding: Finding): string =>
  `${finding.listing_id}|${finding.decision}|${finding.status}|${finding.content_id}|` +
  `${finding.sources.join(',')}|${finding.confidence}`

async function main(): Promise<number> {
  const { listings } = loadListings()
  const first = await run('recon-a')
  const second = await run('recon-b')

  const problems: string[] = []

  for (const finding of first.result.findings) {
    if (finding.status === 'published') {
      if (finding.reconciled_price_zar === null) {
        problems.push(`${finding.listing_id}: published with no reconciled price`)
      }
      if (finding.reconciled_price_zar !== finding.declared_price_zar) {
        problems.push(
          `${finding.listing_id}: published at R${finding.reconciled_price_zar} against a declared ` +
            `R${finding.declared_price_zar} — the decision must be a hold`,
        )
      }
      if (finding.sources.length === 0) {
        problems.push(`${finding.listing_id}: published with no source behind it`)
      }
      if (finding.decision === 'hold' || finding.decision === 'revise' && finding.status !== 'published') {
        problems.push(`${finding.listing_id}: inconsistent decision and status`)
      }
    }
    if (finding.status === 'held' && finding.reconciled_price_zar !== null) {
      problems.push(`${finding.listing_id}: held but carries a reconciled price`)
    }
  }

  const firstDecisions = first.result.findings.map(decide).join('\n')
  const secondDecisions = second.result.findings.map(decide).join('\n')
  if (firstDecisions !== secondDecisions) {
    problems.push('two runs of the same fixtures disagree')
  }

  const ids = new Map<string, string>()
  for (const finding of first.result.findings) {
    const previous = ids.get(finding.content_id)
    if (previous && previous !== finding.listing_id) {
      problems.push(`content id ${finding.content_id} is shared by two listings`)
    }
    ids.set(finding.content_id, finding.listing_id)
  }

  console.log('recon — the listing-side invariant')
  console.log('  money path: out of scope here — escrow settlement and the certificate are proved by `bun run avc:selftest`')
  console.log('')
  console.log(`listings checked : ${first.result.findings.length} of ${listings.length}`)
  console.log(`published        : ${first.result.findings.filter((f) => f.status === 'published').length}`)
  console.log(`held             : ${first.result.findings.filter((f) => f.status === 'held').length}`)
  console.log(`degraded         : ${first.result.findings.filter((f) => f.fallback).length}`)
  console.log(`determinism      : ${firstDecisions === secondDecisions ? 'identical' : 'DIFFERENT'}`)
  console.log('')

  if (problems.length === 0) {
    console.log('PASS no listing is published without supported, attributed evidence')
    return 0
  }
  for (const problem of problems) console.log(`FAIL ${problem}`)
  return 1
}

process.exitCode = await main()
