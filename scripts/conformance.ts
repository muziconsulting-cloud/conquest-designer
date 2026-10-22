/**
 * The conformance gate — our implementations against the three Meterless suites.
 *
 * The runners are the sponsors'. They read `HMEM_IMPL`, `WORLD_MODEL_IMPL` and
 * `MARKOVIAN_IMPL` and run OUR modules against the reference suites. Each runner is
 * invoked with `bun` — no `npx tsx`, no network, no key.
 *
 * Until an engine exists the script says so, plainly, and exits non-zero. It never
 * falls back to the reference implementation and reports that as ours.
 *
 * Run: `bun run scripts/conformance.ts`
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from '../src/loading.ts'

interface Engine {
  key: 'hmem' | 'world-model' | 'markovian'
  label: string
  implPath: string
  runnerPath: string
  envVar: string
  prompt: string
}

const ENGINES: Engine[] = [
  {
    key: 'hmem',
    label: 'H-MEM',
    implPath: 'src/engines/hmem/index.ts',
    runnerPath: 'vendor/meterless/hmem/conformance/runner.ts',
    envVar: 'HMEM_IMPL',
    prompt: 'P1',
  },
  {
    key: 'world-model',
    label: 'World Model',
    implPath: 'src/engines/world-model/index.ts',
    runnerPath: 'vendor/meterless/world-model/conformance/runner.ts',
    envVar: 'WORLD_MODEL_IMPL',
    prompt: 'P2',
  },
  {
    key: 'markovian',
    label: 'Markovian',
    implPath: 'src/engines/markovian/index.ts',
    runnerPath: 'vendor/meterless/markovian/conformance/runner.ts',
    envVar: 'MARKOVIAN_IMPL',
    prompt: 'P3',
  },
]

const main = async (): Promise<number> => {
  console.log('conformance — our implementations against the sponsors\' suites')
  console.log('')

  if (!existsSync(join(ROOT, 'vendor/meterless'))) {
    console.log('The engine specs are not on disk. Run: bun run engines:fetch')
    return 1
  }

  let failures = 0

  for (const engine of ENGINES) {
    const runner = join(ROOT, engine.runnerPath)
    const impl = join(ROOT, engine.implPath)

    if (!existsSync(runner)) {
      console.log(`SKIP ${engine.label}: the runner is missing at ${engine.runnerPath}`)
      failures += 1
      continue
    }

    if (!existsSync(impl)) {
      console.log(
        `PENDING ${engine.label}: ${engine.implPath} is not written yet (${engine.prompt}). ` +
          'The reference implementation scores well; ours does not exist yet, and this script ' +
          'will not pretend otherwise.',
      )
      failures += 1
      continue
    }

    console.log(`RUN ${engine.label} (${engine.envVar}=${engine.implPath})`)
    const proc = Bun.spawn({
      cmd: ['bun', runner],
      cwd: ROOT,
      env: { ...process.env, [engine.envVar]: impl },
      stdout: 'inherit',
      stderr: 'inherit',
    })
    const code = await proc.exited
    if (code !== 0) {
      console.log(`FAIL ${engine.label}: the runner exited ${code}`)
      failures += 1
    }
    console.log('')
  }

  if (failures > 0) {
    console.log(`FAIL ${failures} engine(s) are not passing their suite yet`)
    return 1
  }
  console.log('PASS all three engines pass their suites')
  return 0
}

process.exitCode = await main()
