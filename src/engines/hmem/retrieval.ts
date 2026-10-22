/**
 * The retrieval service (spec §6) — the hybrid ranking formula and the reinjection
 * formatter.
 *
 *   raw = 0.35·semantic + 0.20·keyword + 0.10·tag + 0.10·domain
 *       + 0.15·entity   + 0.05·layer   + 0.05·recency − 0.20·superseded
 *   score = clamp01(raw) × confidence
 *
 * The constants are the spec's, the terms are the spec's, and the superseded penalty is
 * the one that makes a replaced record rank below a live one with the same content.
 */

import { MemoryStoreService } from './store.ts'
import { TrustLedgerService } from './ledger.ts'
import {
  DAY_MS,
  classifyDomain,
  classifyNamespace,
  contentTokens,
  cosine,
  embed,
  entityOverlap,
  extractEntities,
  jaccard,
  queryTokens,
} from './text.ts'
import type { Memory, QueryResult, ScoredMemory } from './types.ts'

export const LAYER_WEIGHTS: Record<Memory['layer'], number> = {
  long_term: 1.0,
  working: 0.8,
  short_term: 0.6,
}

export const RETRIEVAL_THRESHOLD = 0.35
export const RETRIEVAL_TOP_N = 5
export const RECENCY_TAU_DAYS = 14

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

export class MemoryRetrievalService {
  constructor(
    private readonly store: MemoryStoreService,
    private readonly ledger: TrustLedgerService,
    private readonly clock: () => number,
  ) {}

  /**
   * Score one memory against one query. Every factor is reported, so a ranking can be
   * explained rather than trusted.
   */
  score(memory: Memory, text: string, tokens: string[], queryEmbedding: number[]): ScoredMemory {
    const now = this.clock()
    const queryEntities = extractEntities(text)
    const queryDomain = classifyDomain(text)

    const semantic = cosine(queryEmbedding, memory.embedding)
    const keyword = jaccard(tokens, contentTokens(memory.content))
    const tag = jaccard(tokens, memory.tags.map((t) => t.toLowerCase()))
    const domain = memory.domain === queryDomain ? 1 : memory.namespace.startsWith(queryDomain) ? 0.5 : 0
    const entity = entityOverlap(queryEntities, memory.entities)
    const layer = LAYER_WEIGHTS[memory.layer]
    const ageMs = Math.max(0, now - memory.lastAccessed)
    const recency = Math.exp(-ageMs / (RECENCY_TAU_DAYS * DAY_MS))
    const superseded = memory.supersededBy ? 1 : 0

    const raw =
      0.35 * semantic +
      0.20 * keyword +
      0.10 * tag +
      0.10 * domain +
      0.15 * entity +
      0.05 * layer +
      0.05 * recency -
      0.20 * superseded

    return {
      memory,
      score: clamp01(raw) * memory.confidence,
      raw,
      factors: { semantic, keyword, tag, domain, entity, layer, recency, superseded },
    }
  }

  query(
    text: string,
    options?: { threshold?: number; topN?: number },
  ): QueryResult {
    const threshold = options?.threshold ?? RETRIEVAL_THRESHOLD
    const topN = options?.topN ?? RETRIEVAL_TOP_N
    const tokens = queryTokens(text)
    const queryEmbedding = embed(text)

    const scored = this.store.all().map((memory) => this.score(memory, text, tokens, queryEmbedding))
    const kept = scored
      .filter((s) => s.score >= threshold)
      .sort((a, b) => b.score - a.score || b.memory.timestamp - a.memory.timestamp || a.memory.id.localeCompare(b.memory.id))
    const top = kept.slice(0, topN)

    for (const result of top) {
      this.ledger.append({
        memoryId: result.memory.id,
        action: 'read',
        actor: 'retrieval',
        details: { score: result.score, query: text },
      })
    }

    const strategy: QueryResult['strategy'] =
      top.length === 0 ? 'minimal' : top.length <= 2 ? 'personal' : 'comprehensive'

    return {
      memories: top,
      strategy,
      retrievalReason: `${kept.length} of ${scored.length} records above the ${threshold} threshold`,
      queryTokens: tokens,
      evaluated: scored.length,
      kept: kept.length,
    }
  }

  /**
   * Reinjection (spec §6.2) — the memory context as it would be handed to a model,
   * grouped by domain, one line per memory, with its layer marker and entities.
   */
  reinject(result: QueryResult): string {
    const groups = new Map<string, ScoredMemory[]>()
    for (const scored of result.memories) {
      const bucket = groups.get(scored.memory.domain)
      if (bucket) bucket.push(scored)
      else groups.set(scored.memory.domain, [scored])
    }
    const lines: string[] = []
    for (const [domain, bucket] of groups) {
      lines.push(`## ${domain}`)
      for (const scored of bucket) {
        const entities = scored.memory.entities.map((e) => e.name).join(', ')
        const suffix = entities.length > 0 ? ` [${entities}]` : ''
        lines.push(`- (${scored.memory.layer}) ${scored.memory.content}${suffix}`)
      }
    }
    return lines.join('\n')
  }
}

/** Enrichment helpers used when a record is written (spec §5). */
export function enrichDomain(content: string, tags: string[]): { domain: string; namespace: string } {
  const domain = classifyDomain(content, tags)
  return { domain, namespace: classifyNamespace(content, domain) }
}
