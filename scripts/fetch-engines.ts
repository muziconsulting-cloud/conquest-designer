// Fetches the three Meterless engine folders (the AGENTS.md contract + the published
// conformance suite) into vendor/meterless/.
//
// They are deliberately NOT vendored into this repository: we implement from the
// contract and attribute Apache-2.0 in SPONSORS.md. The suites are the gate — the
// gate has to be runnable, so the spec folders have to be fetchable.
//
//   bun run engines:fetch
//
// Safe to re-run: an engine folder that already has its AGENTS.md is left alone.

const ENGINES = [
  { repo: 'meterless/meterless/engines/hmem', dest: 'vendor/meterless/hmem', label: 'H-MEM' },
  { repo: 'meterless/meterless/engines/world-model', dest: 'vendor/meterless/world-model', label: 'World Model' },
  { repo: 'meterless/meterless/engines/markovian', dest: 'vendor/meterless/markovian', label: 'Markovian' },
] as const;

const exists = async (p: string): Promise<boolean> =>
  await Bun.file(p).exists().catch(() => false);

const hasSpec = async (dir: string): Promise<boolean> =>
  (await exists(`${dir}/AGENTS.md`)) || (await exists(`${dir}/README.md`));

async function fetch(engine: { repo: string; dest: string; label: string }): Promise<boolean> {
  if (await hasSpec(engine.dest)) {
    console.log(`  ✓ ${engine.label.padEnd(12)} already present — ${engine.dest}`);
    return true;
  }
  console.log(`  → ${engine.label.padEnd(12)} ${engine.repo} → ${engine.dest}`);
  const proc = Bun.spawn(['bunx', 'degit', engine.repo, engine.dest], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const code = await proc.exited;
  if (code !== 0) {
    const err = await new Response(proc.stderr).text();
    console.log(`  ✗ ${engine.label.padEnd(12)} fetch failed (exit ${code})`);
    console.log(`      run it by hand:  npx degit ${engine.repo} ${engine.dest}`);
    if (err.trim()) console.log(`      ${err.trim().split('\n').slice(-3).join('\n      ')}`);
    return false;
  }
  return true;
}

let ok = true;
console.log('Meterless engine specs → vendor/meterless/');
for (const engine of ENGINES) {
  if (!(await fetch(engine))) ok = false;
}
console.log(
  ok
    ? '\nAll three engine specs are in place.  bun run conformance\n'
    : '\nSome engine specs are missing — the conformance suites cannot run until they are fetched.\n',
);
process.exit(ok ? 0 : 1);

export {};
