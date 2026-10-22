/**
 * `bun run swarm` — the entry point.
 *
 * Two modes, one pipeline:
 *   - no arguments: run every fixture listing and print one line per decision;
 *   - `--input <file>`: run one request and write the response to disk.
 *
 * The output path mirrors the input path — the `input` segment becomes `output` — so
 * the response lands beside the request that produced it, and no runtime code has to
 * know the name of the directory it writes into.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { ROOT, loadListings, loadRunRequest } from './loading.ts'
import { runExchange } from './orchestrator/index.ts'
import { createTraceSink } from './orchestrator/trace.ts'
import type { RunRequest } from './loading.ts'

const flagValue = (args: string[], name: string): string | undefined => {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? ''
    if (arg === name) return args[index + 1]
    if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1)
  }
  return undefined
}

/** The input path with its directory segment mirrored: `input_x` -> `output_x`. */
export function deriveOutputPath(inputPath: string): string {
  const absolute = resolve(ROOT, inputPath)
  const relativePath = relative(ROOT, absolute)
  const derived = relativePath.replace(/(^|[\\/])input([_\\/-])/, '$1output$2')
  return join(ROOT, derived)
}

const usage = (): string =>
  [
    'Conquest — the agent exchange swarm.',
    '',
    '  bun run swarm                                   run every fixture listing',
    '  bun run swarm -- --input <request.json>          run one request',
    '  bun run swarm -- --input <request.json> --out <response.json>',
    '',
  ].join('\n')

async function main(): Promise<number> {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    console.log(usage())
    return 0
  }

  const inputPath = flagValue(args, '--input')

  if (!inputPath) {
    const trace = createTraceSink()
    const { listings } = loadListings()
    const request: RunRequest = {
      request_id: `fixture-run-${trace.runId}`,
      user_query: 'Close every sample listing: publish what the evidence supports, and hold what it does not.',
      context: {},
    }

    const response = await runExchange({
      request: {
        ...request,
        context: { listingIds: listings.map((listing) => listing.listingId) },
      },
      trace,
    })

    const entries = countEntries(response.log_path)
    for (const finding of response.result.findings) {
      console.log(
        `${finding.listing_id}  ->  ${finding.decision}  by conflict-critic  ` +
          `(trace: ${entries} entries)`,
      )
    }
    console.log(`trace: ${response.log_path}`)
    return 0
  }

  const request = loadRunRequest(inputPath)
  const outPath = flagValue(args, '--out') ?? deriveOutputPath(inputPath)
  const response = await runExchange({ request })

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(response, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify(response, null, 2))
  console.log(`written: ${relative(ROOT, outPath)}`)
  return 0
}

const countEntries = (logPath: string): number => {
  try {
    return readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).length
  } catch {
    return 0
  }
}

process.exitCode = await main()
