/**
 * The tables the local Zetaris-compatible server serves.
 *
 * They are a projection of the sample listing set into SQL tables — one table for
 * the listings themselves, one per federated source for the observations, and one
 * for the owner's own declaration. The projection is **lossless in both
 * directions**: every observation the fixture carries becomes a row, with its
 * ordinal, so the order the source returns them in is the order the observation
 * ids follow.
 *
 * This file reads nothing from disk. The caller loads the fixture (only
 * `src/loading.ts` reads files) and hands the listings over.
 */

import type { FlatListing } from '../loading.ts'
import type { ZetarisRow } from './adapter.ts'
import type { ZetarisTables } from './local-server.ts'

/** Which table an observation belongs to. */
const TABLE_BY_SOURCE: Record<string, string> = {
  'zetaris:registry': 'zetaris_registry',
  'zetaris:ledger': 'zetaris_ledger',
  'owner-declaration': 'conquest_declarations',
}

/** Build the tables from the sample listing set. */
export function buildTables(listings: FlatListing[]): ZetarisTables {
  const tables: ZetarisTables = {
    conquest_listings: [],
    zetaris_registry: [],
    zetaris_ledger: [],
    conquest_declarations: [],
  }

  for (const listing of listings) {
    const listingRow: ZetarisRow = {
      listing_id: listing.listingId,
      declared_by: listing.declaredBy,
      agent_id: listing.agent.agentId,
      agent_name: listing.agent.displayName,
      agent_key_hash: listing.agent.agentKeyHash,
      wallet_address: listing.agent.walletAddress,
      declared_price_zar: listing.declaredPriceZar,
      term_months: listing.termMonths,
    }
    tables.conquest_listings?.push(listingRow)

    for (const evidence of listing.evidence) {
      const table = TABLE_BY_SOURCE[evidence.source]
      if (!table) continue
      const rows = tables[table]
      if (!rows) continue
      rows.push({
        listing_id: listing.listingId,
        source: evidence.source,
        field: evidence.field,
        value: evidence.value,
        observed_at: evidence.observedAt,
        confidence: evidence.confidence,
        unavailable: evidence.unavailable === true,
        // The ordinal is per listing, across the tables — it is the order the
        // federated source returned the observations in.
        ordinal: rows.length + 1,
      })
    }
  }

  // The ordinal has to count across the tables, not inside each one. Re-stamp it
  // from the fixture order so the merged order is exactly the fixture order.
  let ordinal = 0
  for (const listing of listings) {
    for (const evidence of listing.evidence) {
      const table = TABLE_BY_SOURCE[evidence.source]
      const rows = table ? tables[table] : undefined
      if (!rows) continue
      const row = rows.find(
        (candidate) =>
          candidate.listing_id === listing.listingId &&
          candidate.source === evidence.source &&
          candidate.field === evidence.field &&
          candidate.observed_at === evidence.observedAt &&
          candidate.value === evidence.value,
      )
      if (row) {
        ordinal += 1
        row.ordinal = ordinal
      }
    }
  }

  return tables
}
