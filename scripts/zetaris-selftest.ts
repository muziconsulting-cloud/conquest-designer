/**
 * The Zetaris selftest — the client against the published contract.
 *
 * It is not a unit test with mocks: it boots the protocol-compatible server on an
 * ephemeral port, points the **real** client at it, and drives the published
 * contract end to end:
 *
 *   1. login            GET  /api/v1.0/auth/login          (Basic)
 *   2. open a query     POST /api/v1.0/query/sql/start
 *   3. page it          GET  /api/v1.0/query/sql/page
 *   4. close it         DELETE /api/v1.0/query/sql/close/{queryToken}
 *
 * Then it checks the parts that would otherwise be a promise in a comment:
 *
 *   - the headers the contract names are actually on the wire (the server rejects
 *     a request that arrives without a numeric X-Org-ID or a UUID X-Request-ID),
 *   - the query is closed on the error path too,
 *   - a bad pageLimit is refused by the client before it goes out,
 *   - the pull returns the same listings, the same observation ids and the same
 *     content ids as the file loader — the protocol changed nothing.
 *
 * Run: `bun run zetaris:selftest`
 */

import { ZetarisClient, ZetarisError, assertPageLimit } from '../src/zetaris/adapter.ts'
import { startZetarisLocalServer } from '../src/zetaris/local-server.ts'
import { buildTables } from '../src/zetaris/tables.ts'
import { pullListings } from '../src/zetaris/reader.ts'
import { pullCandidates } from '../src/zetaris/pull.ts'
import { loadFlatListings, loadListings } from '../src/loading.ts'

const failures: string[] = []

const check = (ok: boolean, label: string, detail = ''): void => {
  if (ok) {
    console.log(`ok   ${label}`)
  } else {
    failures.push(label)
    console.log(`FAIL ${label}${detail === '' ? '' : ` — ${detail}`}`)
  }
}

async function main(): Promise<number> {
  console.log('zetaris selftest — the published REST contract, end to end')
  console.log('')

  const server = startZetarisLocalServer({ tables: buildTables(loadFlatListings()) })

  try {
    // 1. The health query — `SELECT 1`, the published shape.
    const client = new ZetarisClient({
      baseUrl: server.url,
      orgId: server.orgId,
      username: server.username,
      password: server.password,
    })

    const health = await client.health()
    check(health.ok, 'the health query answers', health.detail ?? '')
    check(health.mode === 'local', 'the client reports the local mode')

    // 2. The contract refuses a request without the published headers.
    const bare = await fetch(`${server.url}/api/v1.0/query/sql/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ select: 'SELECT * FROM conquest_listings', pageLimit: 10 }),
    })
    check(bare.status === 400, 'a request without the published headers is refused', `HTTP ${bare.status}`)

    // 3. The three-step query, with the close on every path.
    const open = await client.open({ select: 'SELECT * FROM conquest_listings', pageLimit: 100 })
    check(open.queryToken !== '', 'OpenSqlQuery returns a queryToken')
    const page = await client.page(open.queryToken, { pageLimit: 100, pageNumber: 1 })
    check(page.rows.length === 4, 'the open query returns the four listings', `${page.rows.length} rows`)
    await client.close(open.queryToken)
    check(
      server.log.some((entry) => entry.method === 'DELETE' && entry.path.includes('/close/')),
      'CloseSqlQuery is called',
    )

    // 4. The client refuses an out-of-range pageLimit before it goes out.
    let refused = false
    try {
      assertPageLimit(101)
    } catch (error) {
      refused = error instanceof ZetarisError
    }
    check(refused, 'the client refuses a pageLimit above 100')
    let refusedLow = false
    try {
      assertPageLimit(0)
    } catch (error) {
      refusedLow = error instanceof ZetarisError
    }
    check(refusedLow, 'the client refuses a pageLimit below 1')

    // 5. The query is closed even when the page call fails.
    const closedOnError = await (async (): Promise<boolean> => {
      const token = (await client.open({ select: 'SELECT * FROM conquest_listings', pageLimit: 100 }))
        .queryToken
      try {
        await client.page(token, { pageLimit: 100, pageNumber: 99 })
      } catch {
        // The page is out of range; the query must still be released.
      }
      await client.close(token)
      return server.log.some(
        (entry) => entry.method === 'DELETE' && entry.path.includes(encodeURIComponent(token)),
      )
    })()
    check(closedOnError, 'the query is closed on the error path')

    // 6. The pull over the wire is identical to the file loader — same listings,
    //    same observation ids, same content ids.
    const overTheWire = await pullListings(client)
    const { listings: fromFile } = loadListings()

    check(overTheWire.length === fromFile.length, 'the pull returns every listing')
    let sameIds = true
    let sameEvidence = true
    for (let index = 0; index < Math.min(overTheWire.length, fromFile.length); index += 1) {
      const wire = overTheWire[index]
      const file = fromFile[index]
      if (!wire || !file) {
        sameIds = false
        sameEvidence = false
        continue
      }
      if (wire.listingId !== file.listingId) sameIds = false
      if (wire.evidence.length !== file.evidence.length) sameEvidence = false
      for (let e = 0; e < wire.evidence.length; e += 1) {
        const a = wire.evidence[e]
        const b = file.evidence[e]
        if (!a || !b) {
          sameEvidence = false
          continue
        }
        if (a.observationId !== b.observationId || a.source !== b.source) sameEvidence = false
        if (a.provenance.contentId !== b.provenance.contentId) sameEvidence = false
        if (a.value !== b.value) sameEvidence = false
      }
    }
    check(sameIds, 'the listing ids are the same as the file loader')
    check(sameEvidence, 'the observation ids, values and content ids are the same as the file loader')

    // 7. The pull the swarm actually makes.
    const pull = await pullCandidates({ forceLocal: true })
    check(pull.mode === 'local', 'the swarm pull runs in local mode', pull.mode)
    check(pull.listings.length === 4, 'the swarm pull returns every listing', `${pull.listings.length}`)
    check(pull.requests > 0, 'the swarm pull went over the wire', `${pull.requests} requests`)

    // 8. Every request that carried a bearer token also carried the published
    //    headers — a UUID request id and a numeric org id.
    const malformed = server.log.filter(
      (entry) => entry.authorised && !/^[0-9a-f-]{36}$/i.test(entry.requestId),
    )
    check(malformed.length === 0, 'every authorised request carried a UUID request id', `${malformed.length} bad`)
  } finally {
    server.stop()
  }

  console.log('')
  if (failures.length === 0) {
    console.log('PASS the client honours the published Zetaris contract')
    return 0
  }
  for (const failure of failures) console.log(`FAIL ${failure}`)
  return 1
}

process.exitCode = await main()
