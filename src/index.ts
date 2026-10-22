/**
 * `bun run swarm` — entry point.
 *
 * Default: run the four fixtures through the five stub agents, print one line
 * per listing, write logs/<traceId>.jsonl.
 *
 * With --input <file>: run one request through the same pipeline and capture
 * the response to output_examples/<same-basename>.json.
 */

import {
  runFixtures,
  runRequest,
  type RunRequest,
  writeCapturedOutput,
} from './pipeline.ts'

function parseArgs(argv: string[]): { input?: string } {
  const out: { input?: string } = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--input' || a === '-i') {
      const next = argv[i + 1]
      if (!next) {
        console.error('Usage: bun run swarm -- --input <path.json>')
        process.exit(1)
      }
      out.input = next
      i++
    }
  }
  return out
}

async function loadRequest(inputPath: string): Promise<RunRequest> {
  const data = (await Bun.file(inputPath).json()) as RunRequest
  if (!data.request_id || !data.user_query) {
    throw new Error(`Invalid request file ${inputPath}: need request_id and user_query`)
  }
  return data
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (args.input) {
    const request = await loadRequest(args.input)
    const response = await runRequest(request)
    const outPath = await writeCapturedOutput(args.input, response)
    console.log(
      `${response.request_id} status=${response.status} trace=${response.trace_id} findings=${response.result.findings.length} → ${outPath}`,
    )
    return
  }

  const { response, summaries } = await runFixtures()
  for (const s of summaries) {
    console.log(
      `${s.listingId} ${s.decision} confidence=${s.confidence.toFixed(2)} path=${s.expectedPath} citations=${s.citations.length}`,
    )
  }
  console.error(`trace=${response.trace_id} log=${response.log_path}`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
