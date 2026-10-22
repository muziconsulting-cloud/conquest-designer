/**
 * Chunk config and its bounds (spec §2.1, `docs/chunk-config.md`).
 *
 * Out-of-range values are rejected with a typed error at load time. They are never
 * silently clamped — a config that is quietly truncated spends a different budget than
 * the one the caller asked for.
 */

export interface ChunkConfig {
  /** Target generation budget per chunk. */
  chunkSize: number
  /** Hard stop after this many chunks. */
  maxChunks: number
  /** How much state is forwarded to the next chunk. */
  carryoverTokens: number
  /** Overlap window between chunks, in tokens. 0 disables it. */
  overlapTokens: number
}

export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  chunkSize: 8000,
  maxChunks: 24,
  carryoverTokens: 800,
  overlapTokens: 0,
}

/** Engine constants (spec §2.1) — framing overhead and the expected output budget. */
export const FRAMING_TOKENS = 400
export const OUTPUT_BUDGET = 1200

export const BOUNDS = {
  chunkSize: { min: 1000, max: 128000, step: 1000 },
  maxChunks: { min: 1, max: 32, step: 1 },
  carryoverTokens: { min: 128, max: 32768, step: 128 },
  overlapTokens: { min: 0, max: 4096, step: 1 },
} as const

export class ChunkConfigError extends Error {
  readonly code = 'invalid_chunk_config'
  readonly field: string
  readonly value: unknown

  constructor(field: string, value: unknown, reason: string) {
    super(`invalid chunkConfig.${field} = ${String(value)}: ${reason}`)
    this.name = 'ChunkConfigError'
    this.field = field
    this.value = value
  }
}

/** Validate and complete a partial config. Throws a typed error; never clamps. */
export function validateChunkConfig(input: Partial<ChunkConfig>): ChunkConfig {
  const config: ChunkConfig = {
    chunkSize: input.chunkSize ?? DEFAULT_CHUNK_CONFIG.chunkSize,
    maxChunks: input.maxChunks ?? DEFAULT_CHUNK_CONFIG.maxChunks,
    carryoverTokens: input.carryoverTokens ?? DEFAULT_CHUNK_CONFIG.carryoverTokens,
    overlapTokens: input.overlapTokens ?? DEFAULT_CHUNK_CONFIG.overlapTokens,
  }

  check('chunkSize', config.chunkSize, BOUNDS.chunkSize.min, BOUNDS.chunkSize.max)
  check('maxChunks', config.maxChunks, BOUNDS.maxChunks.min, BOUNDS.maxChunks.max)
  check(
    'carryoverTokens',
    config.carryoverTokens,
    BOUNDS.carryoverTokens.min,
    BOUNDS.carryoverTokens.max,
  )
  check(
    'overlapTokens',
    config.overlapTokens,
    BOUNDS.overlapTokens.min,
    BOUNDS.overlapTokens.max,
  )

  if (config.carryoverTokens <= 0) {
    throw new ChunkConfigError('carryoverTokens', config.carryoverTokens, 'must be greater than zero')
  }

  const minimumChunkSize = FRAMING_TOKENS + config.carryoverTokens + OUTPUT_BUDGET
  if (config.chunkSize < minimumChunkSize) {
    throw new ChunkConfigError(
      'chunkSize',
      config.chunkSize,
      `must be at least framingTokens(${FRAMING_TOKENS}) + carryoverTokens(${config.carryoverTokens}) + outputBudget(${OUTPUT_BUDGET}) = ${minimumChunkSize}`,
    )
  }

  return config
}

function check(field: string, value: number, min: number, max: number): void {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new ChunkConfigError(field, value, 'must be a number')
  }
  if (value < min || value > max) {
    throw new ChunkConfigError(field, value, `must be between ${min} and ${max}`)
  }
}

/** Clamp an update into safe bounds — used by the config manager's setter path. */
export function clampChunkConfig(config: ChunkConfig): ChunkConfig {
  const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value))
  return {
    chunkSize: clamp(config.chunkSize, BOUNDS.chunkSize.min, BOUNDS.chunkSize.max),
    maxChunks: clamp(config.maxChunks, BOUNDS.maxChunks.min, BOUNDS.maxChunks.max),
    carryoverTokens: clamp(
      config.carryoverTokens,
      BOUNDS.carryoverTokens.min,
      BOUNDS.carryoverTokens.max,
    ),
    overlapTokens: clamp(config.overlapTokens, BOUNDS.overlapTokens.min, BOUNDS.overlapTokens.max),
  }
}
