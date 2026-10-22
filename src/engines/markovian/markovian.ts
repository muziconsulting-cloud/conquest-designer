/**
 * Markovian — the bounded-context long-run engine (Meterless).
 *
 * Implemented from the sponsor's contract, `vendor/meterless/markovian/AGENTS.md`. The
 * conformance suite is the definition of done:
 *
 *   MARKOVIAN_IMPL=$PWD/src/engines/markovian/index.ts \
 *     bun vendor/meterless/markovian/conformance/runner.ts
 *
 * The engine is provider-agnostic: the caller injects a generator, the engine handles
 * the chunk loop, the carryover, the marker protocol, the accounting and the
 * reflection.
 */

import {
  ChunkConfigError,
  DEFAULT_CHUNK_CONFIG,
  clampChunkConfig,
  validateChunkConfig,
  type ChunkConfig,
} from './config.ts'
import { cleanChunk, stripMarkers } from './markers.ts'
import { estimateTokens, runEfficiency, type RunEfficiency } from './efficiency.ts'

export * from './config.ts'
export * from './markers.ts'
export * from './efficiency.ts'

export type GeneratorResult = {
  text: string
  metadata?: unknown
  usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number }
}

export type Generator = (
  prompt: string,
  attachments?: Attachment[],
  systemPrompt?: string,
  onStream?: (delta: string) => void,
  abortSignal?: AbortSignal,
) => Promise<GeneratorResult>

export interface Attachment {
  name: string
  content: string
}

export interface ChunkInfo {
  id: number
  tokens: number
  carryover: string
  content: string
}

export interface MarkovianRun {
  id: string
  timestamp: string
  prompt: string
  mode: 'architect' | 'research'
  /** The mandatory per-run config snapshot. */
  chunkConfig: ChunkConfig
  chunks: ChunkInfo[]
  output: string
  totalTokensUsed: number
  totalTokensSaved: number
  efficiencyPercent: number
  durationMs: number
  status: 'completed' | 'max-chunks' | 'errored' | 'aborted'
  /** Every reported number carries its source. */
  tokenLabel: 'measured' | 'estimated'
  reflection?: {
    attempted: boolean
    failed: boolean
    content?: string
    error?: string
  }
  warning?: string
}

export interface RunOptions {
  goal: string
  generator: Generator
  mode?: 'architect' | 'research'
  reflect?: boolean
  memoryContext?: string
  attachments?: Attachment[]
  abortSignal?: AbortSignal
  onStream?: (delta: string) => void
  compressorFn?: (prompt: string, systemPrompt?: string) => Promise<string>
}

export interface MarkovianOptions {
  chunkConfig?: Partial<ChunkConfig>
  clock?: () => number | Date
}

export class Markovian {
  private config: ChunkConfig
  private readonly clock: () => number | Date
  private readonly runs: MarkovianRun[] = []

  constructor(options: MarkovianOptions = {}) {
    this.config = validateChunkConfig(options.chunkConfig ?? DEFAULT_CHUNK_CONFIG)
    this.clock = options.clock ?? (() => Date.now())
  }

  /** The current config. */
  getConfig(): ChunkConfig {
    return { ...this.config }
  }

  /** Update the config — clamped into safe bounds (spec §4.1). */
  setConfig(update: Partial<ChunkConfig>): ChunkConfig {
    this.config = clampChunkConfig({ ...this.config, ...update })
    return this.getConfig()
  }

  /** The runs this engine has executed. */
  history(): MarkovianRun[] {
    return [...this.runs]
  }

  /**
   * Run the chain (spec §4.5). The loop is bounded by `maxChunks`, the carryover is
   * bounded by `carryoverTokens`, and no single failure — least of all a reflection
   * failure — takes the run down with it.
   */
  async run(options: RunOptions): Promise<MarkovianRun> {
    const startedAt = this.now()
    const mode = options.mode ?? 'architect'
    const config = this.getConfig()
    const chunks: ChunkInfo[] = []

    let carryover = ''
    let previousContent = ''
    let status: MarkovianRun['status'] = 'max-chunks'
    let warning: string | undefined
    let tokenLabel: 'measured' | 'estimated' = 'estimated'
    let reflection: MarkovianRun['reflection']

    const maxIterations = Math.max(1, config.maxChunks)

    for (let index = 1; index <= maxIterations; index += 1) {
      if (options.abortSignal?.aborted) {
        status = 'aborted'
        warning = 'aborted before the next chunk'
        break
      }

      const prompt = this.buildPrompt({
        goal: options.goal,
        chunkIndex: index,
        carryover,
        previousContent,
        mode,
        memoryContext: options.memoryContext,
        overlapTokens: config.overlapTokens,
      })

      let result: GeneratorResult
      try {
        result = await options.generator(
          prompt,
          options.attachments ?? [],
          this.systemPrompt(mode),
          options.onStream,
          options.abortSignal,
        )
      } catch (error) {
        status = 'errored'
        warning = `chunk ${index} failed: ${(error as Error).message}`
        break
      }

      const usage = this.usageOf(result)
      if (usage !== undefined) tokenLabel = 'measured'

      const cleaned = cleanChunk(result.text)
      const tokens = usage?.output ?? estimateTokens(cleaned.content)

      chunks.push({
        id: index,
        tokens,
        carryover,
        content: cleaned.content,
      })

      if (cleaned.marker === 'complete') {
        status = 'completed'
        previousContent = cleaned.content
        break
      }

      previousContent = cleaned.content
      carryover = await this.nextCarryover(cleaned.state, cleaned.content, options)

      if (index === maxIterations && status === 'max-chunks') {
        warning = `reached maxChunks (${maxIterations}) — the run stopped on the hard cap, not on completion`
      }
    }

    if (status === 'max-chunks' && chunks.length > 0 && chunks.length < maxIterations) {
      status = 'completed'
    }

    // Reflection: post-chain synthesis. A reflection failure never fails the run
    // (spec §7, §11).
    if (options.reflect !== false && status === 'completed' && chunks.length > 0) {
      reflection = { attempted: true, failed: false }
      try {
        const reflectionPrompt = this.buildReflectionPrompt(options.goal, carryover, chunks)
        const result = await options.generator(
          reflectionPrompt,
          [],
          'You summarise a completed run. Be brief and factual.',
        )
        const cleaned = cleanChunk(result.text)
        reflection.content = cleaned.content
      } catch (error) {
        reflection.failed = true
        reflection.error = (error as Error).message
      }
    } else if (options.reflect !== false) {
      reflection = { attempted: false, failed: false }
    }

    const efficiency = runEfficiency(chunks, config)
    const output = chunks.map((chunk) => chunk.content).join('\n\n')
    const finishedAt = this.now()

    const run: MarkovianRun = {
      id: crypto.randomUUID(),
      timestamp: new Date(startedAt).toISOString(),
      prompt: options.goal.slice(0, 200),
      mode,
      chunkConfig: config,
      chunks,
      output: stripMarkers(output),
      totalTokensUsed: efficiency.totalTokensUsed,
      totalTokensSaved: efficiency.tokensSaved,
      efficiencyPercent: efficiency.efficiencyPercent,
      durationMs: Math.max(0, finishedAt - startedAt),
      status,
      tokenLabel,
      ...(reflection ? { reflection } : {}),
      ...(warning ? { warning } : {}),
    }

    this.runs.push(run)
    return run
  }

  /** The historical efficiency of a finished run, against that run's own snapshot. */
  efficiencyOf(run: MarkovianRun): RunEfficiency {
    return runEfficiency(run.chunks, run.chunkConfig)
  }

  // ------------------------------------------------------------------ internals

  private buildPrompt(input: {
    goal: string
    chunkIndex: number
    carryover: string
    previousContent: string
    mode: 'architect' | 'research'
    memoryContext?: string
    overlapTokens: number
  }): string {
    const parts: string[] = []

    if (input.chunkIndex === 1 && input.memoryContext) {
      parts.push(input.memoryContext, '', `User Request: ${input.goal}`)
    } else {
      parts.push(input.goal)
    }

    if (input.chunkIndex > 1) {
      parts.push('', '--- PREVIOUS STATE ---', input.carryover)

      if (input.overlapTokens > 0 && input.previousContent.length > 0) {
        const overlapChars = input.overlapTokens * 4
        const tail = input.previousContent.slice(Math.max(0, input.previousContent.length - overlapChars))
        if (tail.length > 0) {
          parts.push('', '--- [OVERLAP] ---', tail)
        }
      }

      parts.push(
        '',
        'Continue from the state above. End this chunk with [STATE_CHECKPOINT] and the',
        'COMPLETED / REMAINING / DECISIONS / CONTEXT block, or with [TASK_COMPLETE] when done.',
      )
    } else {
      parts.push(
        '',
        'Work the first chunk. End it with [STATE_CHECKPOINT] and the',
        'COMPLETED / REMAINING / DECISIONS / CONTEXT block, or with [TASK_COMPLETE] when done.',
      )
    }

    return parts.join('\n')
  }

  private systemPrompt(mode: 'architect' | 'research'): string {
    return mode === 'research'
      ? 'You are a research engine. Log actions and snapshot your state each chunk.'
      : 'You are an architect engine. Continue the plan and snapshot your state each chunk.'
  }

  /**
   * The carryover cascade (spec §4.3): the explicit marker block first, then a
   * model-based compression, then a heuristic extraction, then a truncation.
   */
  private async nextCarryover(
    state: string | undefined,
    content: string,
    options: RunOptions,
  ): Promise<string> {
    const budget = this.config.carryoverTokens * 4

    if (state && state.length >= 24 && state.length <= budget) return state
    if (state && state.length > budget) return this.truncate(state, budget)

    if (options.compressorFn) {
      try {
        const compressed = await options.compressorFn(
          `Compress this state into COMPLETED / REMAINING / DECISIONS / CONTEXT:\n${state ?? content.slice(-2000)}`,
        )
        const cleaned = cleanChunk(compressed)
        if (cleaned.content.length >= 24) return this.truncate(cleaned.content, budget)
      } catch {
        // fall through to the heuristic ladder
      }
    }

    const heuristic = this.heuristicCarryover(content)
    if (heuristic.length >= 24) return this.truncate(heuristic, budget)

    return this.truncate(content, budget)
  }

  /** Heuristic extraction fallback — the key phrases, semicolon-joined. */
  private heuristicCarryover(content: string): string {
    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0)
    const key = sentences.filter((sentence) =>
      /^(Therefore|Key insight|Status|Important|Next|So|Thus|Currently)/i.test(sentence),
    )
    const chosen = (key.length > 0 ? key : sentences).slice(0, 5)
    return chosen.join('; ')
  }

  /** The absolute fallback — tail-truncate to the budget. */
  private truncate(text: string, budget: number): string {
    if (text.length <= budget) return text
    return text.slice(text.length - budget)
  }

  /** The provider-reported usage, when the provider gives one. */
  private usageOf(result: GeneratorResult): { input?: number; output?: number } | undefined {
    const direct = result.usage
    if (direct && (direct.output_tokens !== undefined || direct.input_tokens !== undefined)) {
      return {
        ...(direct.input_tokens !== undefined ? { input: direct.input_tokens } : {}),
        ...(direct.output_tokens !== undefined ? { output: direct.output_tokens } : {}),
      }
    }
    const metadata = result.metadata as
      | { usage?: { output_tokens?: number; input_tokens?: number; prompt_tokens?: number } }
      | undefined
    const usage = metadata?.usage
    if (!usage) return undefined
    const output = usage.output_tokens
    const input = usage.input_tokens ?? usage.prompt_tokens
    if (output === undefined && input === undefined) return undefined
    return {
      ...(output !== undefined ? { output } : {}),
      ...(input !== undefined ? { input } : {}),
    }
  }

  private buildReflectionPrompt(goal: string, carryover: string, chunks: ChunkInfo[]): string {
    const content = chunks.map((chunk) => chunk.content).join('\n\n').slice(-8000)
    return [
      'Reflect on the completed run.',
      '',
      `Original request: ${goal.slice(0, 500)}`,
      '',
      'Final state:',
      carryover,
      '',
      'Generated content:',
      content,
    ].join('\n')
  }

  private now(): number {
    const value = this.clock()
    return value instanceof Date ? value.getTime() : value
  }
}

export { ChunkConfigError }
export default Markovian
