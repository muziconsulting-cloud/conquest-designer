/**
 * Text utilities for the H-MEM engine: tokenisation, the local deterministic embedder,
 * entity extraction and domain classification (spec §5, §6.1).
 *
 * The embedder is deterministic and local on purpose — the engine must run with no
 * provider key, no network and no API, and the conformance suite asserts *ordering*,
 * never absolute similarity values.
 */

import type { Entity } from './types.ts'

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'being', 'but', 'by', 'can',
  'could', 'did', 'do', 'does', 'for', 'from', 'had', 'has', 'have', 'how', 'i',
  'if', 'in', 'into', 'is', 'it', 'its', 'may', 'might', 'must', 'no', 'not', 'of',
  'on', 'or', 'our', 'out', 'over', 'own', 'shall', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this',
  'those', 'to', 'up', 'us', 'was', 'we', 'were', 'what', 'when', 'where', 'which',
  'while', 'who', 'why', 'will', 'with', 'would', 'you', 'your',
])

/** Technology vocabulary used for entity extraction and domain classification. */
const TECH_VOCAB = new Set([
  'api', 'aws', 'azure', 'bun', 'cdn', 'css', 'database', 'docker', 'dotnet', 'gcp',
  'git', 'github', 'gitlab', 'graphql', 'html', 'ios', 'java', 'javascript', 'kafka',
  'kubernetes', 'linux', 'mongodb', 'mysql', 'nginx', 'node', 'nosql', 'php',
  'postgres', 'postgresql', 'python', 'redis', 'rest', 'ruby', 'rust', 'sql',
  'surreal', 'swift', 'terraform', 'typescript', 'wasm', 'xml', 'yaml',
])

/** Words that mark a deployment/tooling context. */
const DEPLOY_VOCAB = new Set([
  'deploy', 'deploys', 'deployed', 'deployment', 'deploying', 'build', 'builds',
  'built', 'release', 'releases', 'pipeline', 'cluster', 'server', 'service',
  'services', 'runtime', 'compile', 'compiler',
])

const WORK_VOCAB = new Set([
  'meeting', 'meetings', 'standup', 'sprint', 'roadmap', 'deadline', 'client',
  'review', 'quarterly', 'budget', 'invoice', 'stakeholder', 'backlog', 'handoff',
])

const PERSONAL_VOCAB = new Set([
  'family', 'home', 'holiday', 'birthday', 'personal', 'garden', 'recipe',
])

export const EMBED_DIM = 64

export const DAY_MS = 24 * 60 * 60 * 1000
/** Split text into lowercase word tokens. Punctuation is a separator, never a token. */
export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9+#]+/g) ?? []
}

/**
 * Content tokens: the token list used for keyword overlap and embedding. Stopwords are
 * dropped, but negation words that carry meaning for conflict detection are kept in
 * the raw token list instead.
 */
export function contentTokens(text: string): string[] {
  return tokenize(text).filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

/** The top-N query tokens used by the keyword term of the ranking formula (spec §6.1). */
export function queryTokens(text: string, topN = 8): string[] {
  return contentTokens(text).slice(0, topN)
}

export function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  let shared = 0
  for (const t of setA) if (setB.has(t)) shared += 1
  const union = setA.size + setB.size - shared
  return union === 0 ? 0 : shared / union
}

/** Overlap relative to the smaller set — used for clustering, where a small shared
 *  signal between two records is meaningful. */
export function containment(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  let shared = 0
  for (const t of setA) if (setB.has(t)) shared += 1
  return shared / Math.min(setA.size, setB.size)
}

function hash32(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * The local embedder: signed feature hashing over the content tokens plus a type
 * marker, L2 normalised. Deterministic — the same text always yields the same vector.
 */
export function embed(text: string, type?: string): number[] {
  const vector = new Array<number>(EMBED_DIM).fill(0)
  const features = contentTokens(text)
  if (type) features.push(`type:${type}`)
  for (const feature of features) {
    const h = hash32(feature)
    const index = h % EMBED_DIM
    const sign = (h >>> 31) & 1 ? -1 : 1
    vector[index] = (vector[index] ?? 0) + sign
  }
  let norm = 0
  for (const value of vector) norm += value * value
  norm = Math.sqrt(norm)
  if (norm === 0) return vector
  return vector.map((value) => value / norm)
}

export function cosine(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < length; i += 1) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    dot += x * y
    normA += x * x
    normB += y * y
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/** Entity extraction (spec §5) — technology, concept and person heuristics. */
export function extractEntities(text: string): Entity[] {
  const found = new Map<string, Entity>()
  for (const token of tokenize(text)) {
    if (!TECH_VOCAB.has(token)) continue
    const id = `ent-${token}`
    if (!found.has(id)) found.set(id, { id, name: token, type: 'technology' })
  }
  for (const match of text.matchAll(/\b([A-Z][a-zA-Z0-9]{2,})\b/g)) {
    const name = (match[1] ?? '').toLowerCase()
    if (STOPWORDS.has(name)) continue
    const id = `ent-${name}`
    if (!found.has(id)) found.set(id, { id, name, type: 'concept' })
  }
  return [...found.values()].slice(0, 10)
}

/** Entity overlap between a query and a memory (spec §6.1). */
export function entityOverlap(queryEntities: Entity[], memoryEntities: Entity[]): number {
  if (queryEntities.length === 0 || memoryEntities.length === 0) return 0
  const queryIds = new Set(queryEntities.map((e) => e.id))
  const memoryIds = new Set(memoryEntities.map((e) => e.id))
  let shared = 0
  for (const id of queryIds) if (memoryIds.has(id)) shared += 1
  const union = queryIds.size + memoryIds.size - shared
  return union === 0 ? 0 : shared / union
}

/** Domain classification (spec §5) — explicit tags first, then vocabulary. */
export function classifyDomain(text: string, tags: string[] = []): string {
  for (const tag of tags) {
    if (tag.startsWith('project:')) return 'work'
    if (tag.startsWith('tech:')) return 'tech'
  }
  const tokens = new Set(tokenize(text))
  for (const token of tokens) {
    if (TECH_VOCAB.has(token) || DEPLOY_VOCAB.has(token)) return 'tech'
  }
  for (const token of tokens) {
    if (WORK_VOCAB.has(token)) return 'work'
  }
  for (const token of tokens) {
    if (PERSONAL_VOCAB.has(token)) return 'personal'
  }
  return 'general'
}

/** Namespace generation (spec §5) — a sub-bucket inside the domain. */
export function classifyNamespace(text: string, domain: string): string {
  const tokens = new Set(tokenize(text))
  if (domain === 'tech') {
    if ([...tokens].some((t) => ['frontend', 'react', 'css', 'html', 'ui'].includes(t))) {
      return 'tech/frontend'
    }
    if ([...tokens].some((t) => ['database', 'sql', 'postgres', 'redis'].includes(t))) {
      return 'tech/data'
    }
    return 'tech/engineering'
  }
  if (domain === 'work') {
    if ([...tokens].some((t) => ['meeting', 'meetings', 'standup'].includes(t))) return 'work/meetings'
    if ([...tokens].some((t) => ['roadmap', 'quarterly', 'budget'].includes(t))) return 'work/planning'
    return 'work/delivery'
  }
  if (domain === 'personal') return 'personal/life'
  return 'general/uncategorized'
}
