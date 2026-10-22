/**
 * Markovian (Meterless) — re-exports.
 *
 *   MARKOVIAN_IMPL=$PWD/src/engines/markovian/index.ts \
 *     bun vendor/meterless/markovian/conformance/runner.ts
 */

export {
  Markovian,
  ChunkConfigError,
  modelTotals,
  runEfficiency,
  projectedCurve,
  estimateTokens,
  MODEL_CONSTANTS,
  DEFAULT_CHUNK_CONFIG,
  BOUNDS,
  validateChunkConfig,
  clampChunkConfig,
  cleanChunk,
  stripMarkers,
  sanitizeState,
  FRAMING_TOKENS,
  OUTPUT_BUDGET,
} from './markovian.ts'
export type {
  MarkovianRun,
  MarkovianOptions,
  RunOptions,
  ChunkInfo,
  Generator,
  GeneratorResult,
  Attachment,
} from './markovian.ts'
export { Markovian as default } from './markovian.ts'
