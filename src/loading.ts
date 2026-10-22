/**
 * The loaders — the only place that reads a file from disk.
 *
 * The fixture is sample data: a flat shape, written before the code existed. It is
 * mapped here into the frozen `Listing` contract of `src/types.ts`, deterministically:
 * the observation id, the memory ids and the content id are all derived from the
 * observation's own content, so two runs see exactly the same evidence.
 */

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { ContentId, Evidence, Listing, MemoryId, ObservationId } from './types.ts'
import type { SourceDescriptor } from './agents/contracts.ts'

/** The repo root — every relative path in the app resolves from here. */
export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

const readJson = (relative: string): unknown =>
  JSON.parse(readFileSync(join(ROOT, relative), 'utf8')) as unknown

const slug = (value: string): string => value.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()

const contentHash = (parts: string[]): string =>
  createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24)

/** One flat observation, exactly as the sample data carries it. */
export interface FlatObservation {
  source: string
  field: string
  value: string | null
  observedAt: string
  confidence: number
  unavailable?: boolean
}

export interface FlatListing {
  listingId: string
  declaredBy: 'human' | 'agent'
  agent: Listing['agent']
  declaredPriceZar: number
  termMonths: number
  expectedPath?: string
  evidence: FlatObservation[]
}

export interface FlatListingSet {
  currency: string
  listings: FlatListing[]
}

/** Map one flat observation onto the frozen `Evidence` contract. */
export function toEvidence(listingId: string, index: number, flat: FlatObservation): Evidence {
  const observationId: ObservationId = `obs-${listingId}-${String(index + 1).padStart(2, '0')}`
  const memoryIds: MemoryId[] = [
    `mem-${slug(flat.source)}-${slug(flat.field)}` as MemoryId,
  ]
  const contentId: ContentId = `cnt-${contentHash([
    flat.source,
    flat.field,
    flat.value ?? 'unavailable',
    flat.observedAt,
  ])}` as ContentId

  return {
    observationId,
    source: flat.source,
    field: flat.field,
    value: flat.value ?? '',
    observedAt: flat.observedAt,
    provenance: {
      memoryIds,
      contentId,
      confidence: flat.confidence,
    },
  }
}

/** Map the flat listing onto the frozen `Listing` contract. */
export function toListing(flat: FlatListing): Listing {
  return {
    listingId: flat.listingId,
    agent: flat.agent,
    declaredPriceZar: flat.declaredPriceZar,
    termMonths: flat.termMonths,
    declaredBy: flat.declaredBy,
    evidence: flat.evidence.map((observation, index) => toEvidence(flat.listingId, index, observation)),
  }
}

/**
 * The sample listings in their flat shape.
 *
 * The flat shape is what the SQL tables are projected from (see
 * `src/zetaris/tables.ts`), so the pull over the Zetaris protocol and the file
 * loader carry exactly the same data.
 */
export function loadFlatListings(): FlatListing[] {
  const raw = readJson('fixtures/listing-set.json') as FlatListingSet
  return raw.listings
}

/** The four sample listings, in fixture order. */
export function loadListings(): { listings: Listing[]; expected: Map<string, string> } {
  const expected = new Map<string, string>()
  for (const flat of loadFlatListings()) {
    if (flat.expectedPath) expected.set(flat.listingId, flat.expectedPath)
  }
  return { listings: loadFlatListings().map(toListing), expected }
}

/** The source registry — which sources exist, and how much they are trusted. */
export function loadSourceRegistry(): SourceDescriptor[] {
  const raw = readJson('data/sources.json') as { sources: SourceDescriptor[] }
  return raw.sources
}

export interface RunRequest {
  request_id: string
  user_query: string
  context?: {
    track?: string
    listingIds?: string[]
    [key: string]: unknown
  }
}

/** Read one request file — the `POST /run` contract, verbatim. */
export function loadRunRequest(path: string): RunRequest {
  const absolute = path.startsWith('/') ? path : join(ROOT, path)
  const raw = JSON.parse(readFileSync(absolute, 'utf8')) as RunRequest
  return raw
}
