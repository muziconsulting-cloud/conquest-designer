/**
 * The federated pull — the listings and their evidence, over the Zetaris protocol.
 *
 * This is where the sponsor integration stops being a client and starts being a
 * **role in the build**: the swarm's candidate listings and their observations come
 * out of a SQL query over the published API, not out of a file. The rows are mapped
 * onto the frozen `Listing` contract through the existing derivation rail
 * (`toListing` in `src/loading.ts`), so the observation ids, the memory ids and the
 * content ids are derived exactly as they were before — from the content.
 *
 * The pull is three tables:
 *
 *   conquest_listings    who is listed, and at what declared price
 *   zetaris_registry     the registry's observations
 *   zetaris_ledger       the ledger's observations
 *   conquest_declarations  the owner's own declaration — the claim, not a source
 *
 * A source that did not answer is a row with an empty value at zero confidence, and
 * the planner reads that as "this source was silent", exactly as it did when the
 * rows came off disk.
 */

import type { Evidence, Listing } from '../types.ts'
import { toEvidence } from '../loading.ts'
import type { ZetarisAdapter, ZetarisRow } from './adapter.ts'

/** The tables this pull reads. Our schema — the protocol does not change it. */
export const LISTINGS_TABLE = 'conquest_listings'
export const OBSERVATION_TABLES = [
  'zetaris_registry',
  'zetaris_ledger',
  'conquest_declarations',
] as const

const str = (row: ZetarisRow, key: string): string => {
  const value = row[key]
  return value === undefined || value === null ? '' : String(value)
}

const num = (row: ZetarisRow, key: string): number => {
  const value = Number(row[key])
  return Number.isFinite(value) ? value : 0
}

const quote = (value: string): string => value.replace(/'/g, "''")

/**
 * Pull every listing and its observations.
 *
 * Bounded: one query for the listings, and one query per listing per observation
 * table. The page limit is the published maximum, so a real instance returns the
 * whole result in one page unless there is more than 100 rows.
 */
export async function pullListings(adapter: ZetarisAdapter): Promise<Listing[]> {
  const listingRows = await adapter.query(`SELECT * FROM ${LISTINGS_TABLE}`, 100)

  const listings: Listing[] = []
  for (const row of listingRows) {
    const listingId = str(row, 'listing_id')
    if (listingId === '') continue

    const observations: Array<{
      ordinal: number
      source: string
      field: string
      value: string | null
      observedAt: string
      confidence: number
    }> = []

    for (const table of OBSERVATION_TABLES) {
      const sql = `SELECT * FROM ${table} WHERE listing_id = '${quote(listingId)}'`
      const rows = await adapter.query(sql, 100)
      for (const observation of rows) {
        const raw = observation.value
        // A source that did not answer carries no value at all — the row's value is
        // null, not an empty string. Keeping that distinction matters: the content id
        // is derived from it, and the file loader hashes "unavailable" for a null.
        const absent = raw === undefined || raw === null
        observations.push({
          ordinal: num(observation, 'ordinal'),
          source: str(observation, 'source'),
          field: str(observation, 'field'),
          value: absent ? null : String(raw),
          observedAt: str(observation, 'observed_at'),
          confidence: num(observation, 'confidence'),
        })
      }
    }

    // The order the source returned them in is the order the observation ids follow.
    observations.sort((a, b) => a.ordinal - b.ordinal)

    const evidence: Evidence[] = observations.map((observation, index) =>
      toEvidence(listingId, index, {
        source: observation.source,
        field: observation.field,
        value: observation.value,
        observedAt: observation.observedAt,
        confidence: observation.confidence,
        // The silence signal: no value and no confidence. The planner reads this as
        // "this source did not answer", exactly as it did when the rows came off disk.
        unavailable: observation.value === null && observation.confidence === 0,
      }),
    )

    listings.push({
      listingId,
      agent: {
        agentId: str(row, 'agent_id'),
        agentKeyHash: str(row, 'agent_key_hash'),
        walletAddress: str(row, 'wallet_address'),
        displayName: str(row, 'agent_name'),
      },
      declaredPriceZar: num(row, 'declared_price_zar'),
      termMonths: num(row, 'term_months'),
      declaredBy: str(row, 'declared_by') === 'agent' ? 'agent' : 'human',
      evidence,
    })
  }

  return listings
}
