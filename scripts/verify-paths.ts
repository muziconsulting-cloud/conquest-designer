/**
 * The fixture oracle — does the swarm take the path the fixtures describe?
 *
 * The four fixtures describe four paths: accept, revise, hold, fallback. The
 * expected path is read HERE and only here — the runtime never sees it, so a wrong
 * decision cannot be masked by the fixture's own answer key.
 *
 * Run: `bun run scripts/verify-paths.ts`
 */

import { loadListings } from '../src/loading.ts'
import { runExchange } from '../src/orchestrator/index.ts'

const EXPECTED = ['accept', 'revise', 'hold', 'fallback'] as const

async function main(): Promise<number> {
  const { listings, expected } = loadListings()
  const response = await runExchange({
    request: {
      request_id: 'verify-paths',
      user_query: 'Close every sample listing.',
      context: { listingIds: listings.map((listing) => listing.listingId) },
    },
  })

  let failures = 0
  console.log('path verification — the fixture answer key is read here, never at runtime')
  console.log('')

  for (const finding of response.result.findings) {
    const want = expected.get(finding.listing_id)
    const got = finding.decision
    const ok = want === got
    if (!ok) failures += 1
    console.log(
      `${ok ? 'ok  ' : 'FAIL'} ${finding.listing_id}  expected ${want ?? '?'}  got ${got}` +
        `  (${finding.status}, confidence ${finding.confidence})`,
    )
  }

  const covered = new Set(response.result.findings.map((finding) => finding.decision))
  const missing = EXPECTED.filter((path) => !covered.has(path))
  if (missing.length > 0) {
    failures += 1
    console.log(`\nFAIL paths never taken: ${missing.join(', ')}`)
  }

  console.log('')
  console.log(failures === 0 ? 'PASS all four paths taken as described' : `FAIL ${failures} problem(s)`)
  console.log(`trace: ${response.log_path}`)
  return failures === 0 ? 0 : 1
}

process.exitCode = await main()
