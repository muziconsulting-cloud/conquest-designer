/**
 * Money invariant check — whole-rand only on user-facing / funding paths.
 * P0: scaffold stub that scans fixtures for fractional ZAR and exits non-zero
 * if any appear.
 */

export {}

const FIXTURE = 'fixtures/listing-set.json'

function isWholeRand(n: unknown): boolean {
  return typeof n === 'number' && Number.isFinite(n) && Number.isInteger(n) && n >= 0
}

async function main(): Promise<void> {
  const data = (await Bun.file(FIXTURE).json()) as {
    listings: { listingId: string; declaredPriceZar: unknown }[]
  }

  const bad: string[] = []
  for (const listing of data.listings) {
    if (!isWholeRand(listing.declaredPriceZar)) {
      bad.push(`${listing.listingId}: declaredPriceZar=${String(listing.declaredPriceZar)}`)
    }
  }

  if (bad.length > 0) {
    console.error('recon FAILED — fractional or invalid ZAR:')
    for (const line of bad) console.error(`  ${line}`)
    process.exit(1)
  }

  console.log(`recon ok — ${data.listings.length} listings, whole-rand only`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
