/**
 * Runs the three Meterless conformance suites against OUR implementations.
 * P0: scaffold only — engines land in P1–P3. Exit 0 when nothing is wired yet
 * so `bun run conformance` does not block the scaffold gate.
 */

export {}

const ENGINES = [
  { name: 'hmem', label: 'H-MEM', target: '13/13', implEnv: 'HMEM_IMPL' },
  { name: 'world-model', label: 'World Model', target: '8/8', implEnv: 'WORLD_MODEL_IMPL' },
  { name: 'markovian', label: 'Markovian', target: '8/8', implEnv: 'MARKOVIAN_IMPL' },
] as const

async function hasRunner(engine: string): Promise<boolean> {
  return Bun.file(`vendor/meterless/${engine}/conformance/runner.ts`).exists()
}

async function main(): Promise<void> {
  console.log('conformance — Meterless engine gates')
  let runnable = 0

  for (const engine of ENGINES) {
    const runner = `vendor/meterless/${engine.name}/conformance/runner.ts`
    if (!(await hasRunner(engine.name))) {
      console.log(`  · ${engine.label.padEnd(12)} skipped — no runner at ${runner}`)
      continue
    }
    const impl = Bun.env[engine.implEnv] ?? process.env[engine.implEnv]
    if (!impl) {
      console.log(
        `  · ${engine.label.padEnd(12)} skipped — set ${engine.implEnv}=<path> (target ${engine.target})`,
      )
      continue
    }
    runnable++
    console.log(`  → ${engine.label.padEnd(12)} ${engine.implEnv}=${impl}`)
    const proc = Bun.spawn(['bun', runner], {
      env: { ...process.env, [engine.implEnv]: impl },
      stdout: 'inherit',
      stderr: 'inherit',
    })
    const code = await proc.exited
    if (code !== 0) {
      console.error(`conformance failed: ${engine.label} exit ${code}`)
      process.exit(code)
    }
  }

  if (runnable === 0) {
    console.log('  (no engines wired yet — P1–P3 will light these up)')
  }
  console.log('conformance: ok')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
