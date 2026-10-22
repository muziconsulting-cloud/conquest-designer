/**
 * The efficiency math (spec §6, `docs/efficiency-model.md`).
 *
 * Two baselines: the naive append-history baseline, which grows quadratically with the
 * step count, and Markovian, whose per-step cost is flat because only a bounded
 * carryover crosses the chunk boundary.
 */

import type { ChunkConfig } from './config.ts'

/** The doc constants (spec §6). */
export const MODEL_CONSTANTS = {
  framingTokens: 400,
  goalTokens: 200,
  stepInputTokens: 300,
  outputTokens: 1200,
  carryoverTokens: 800,
} as const

export interface ModelTotals {
  naiveTotal: number
  markovianTotal: number
  efficiency: number
}

/**
 * The modelled totals for N steps, using the doc constants. These are *modelled*
 * numbers, not measured ones — the label matters as much as the figure.
 */
export function modelTotals(steps: number): ModelTotals {
  const n = Math.max(0, Math.floor(steps))
  const { framingTokens: F, goalTokens: G, stepInputTokens: S, outputTokens: O, carryoverTokens: C } =
    MODEL_CONSTANTS

  const naiveTotal = n * (F + G + S) + (O * n * (n - 1)) / 2
  const markovianTotal = n * (F + G + C + S)
  const efficiency = naiveTotal === 0 ? 0 : (naiveTotal - markovianTotal) / naiveTotal

  return { naiveTotal, markovianTotal, efficiency }
}

export interface EfficiencyChunk {
  id?: number
  tokens: number
  carryover?: string
  content?: string
}

export interface RunEfficiency {
  standardCost: number
  markovianCost: number
  tokensSaved: number
  efficiencyPercent: number
  totalTokensUsed: number
}

/**
 * Historical run efficiency (spec §6.3) — computed against the run's own config
 * snapshot, never the current one.
 */
export function runEfficiency(
  chunks: EfficiencyChunk[],
  config: Pick<ChunkConfig, 'carryoverTokens'>,
): RunEfficiency {
  const totalTokensUsed = chunks.reduce((sum, chunk) => sum + chunk.tokens, 0)

  let standardCost = 0
  let prefix = 0
  for (const chunk of chunks) {
    prefix += chunk.tokens
    standardCost += prefix
  }

  const markovianCost = chunks.length * config.carryoverTokens + totalTokensUsed
  const tokensSaved = Math.max(0, standardCost - markovianCost)
  const efficiencyPercent = standardCost > 0 ? (tokensSaved / standardCost) * 100 : 0

  return { standardCost, markovianCost, tokensSaved, efficiencyPercent, totalTokensUsed }
}

/** The projected efficiency curve (spec §4.1) — what the chart shows before any run. */
export function projectedCurve(
  steps: number,
  config: Pick<ChunkConfig, 'chunkSize' | 'carryoverTokens'>,
): Array<{ step: number; standardCost: number; markovianCost: number }> {
  const curve: Array<{ step: number; standardCost: number; markovianCost: number }> = []
  let standard = 0
  let markovian = 0
  for (let step = 1; step <= steps; step += 1) {
    const historySize = (step - 1) * config.chunkSize
    standard += historySize + config.chunkSize
    markovian += config.carryoverTokens + config.chunkSize
    curve.push({ step, standardCost: standard, markovianCost: markovian })
  }
  return curve
}

/** The fallback token estimator: ceil(chars / 4). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
