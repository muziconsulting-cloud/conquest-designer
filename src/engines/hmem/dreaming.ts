/**
 * The dreaming system (spec §7) — constructive synthesis with a human approval
 * boundary.
 *
 * Dreaming proposes; it never materialises. A proposal becomes durable memory only
 * when it is approved, and then it carries its lineage: the approved record is
 * `long_term` and points back at the records it was synthesised from.
 */

import { MemoryStoreService } from './store.ts'
import { TrustLedgerService } from './ledger.ts'
import { cosine, containment, contentTokens } from './text.ts'
import type { DreamProposal, Memory } from './types.ts'

/** Two records are related when their relatedness reaches this threshold (spec §13). */
export const RELATEDNESS_THRESHOLD = 0.35

/** A cluster needs at least this many records (spec §13). */
export const MIN_CLUSTER_SIZE = 2

export class DreamingService {
  private readonly proposals: DreamProposal[] = []
  private counter = 0

  constructor(
    private readonly store: MemoryStoreService,
    private readonly ledger: TrustLedgerService,
    private readonly clock: () => number,
  ) {}

  all(): DreamProposal[] {
    return [...this.proposals]
  }

  pending(): DreamProposal[] {
    return this.proposals.filter((p) => p.status === 'pending')
  }

  /**
   * Relatedness between two records: semantic similarity, shared type, shared domain
   * and shared tokens (spec §7.1).
   */
  relatedness(a: Memory, b: Memory): number {
    const semantic = cosine(a.embedding, b.embedding)
    const sameType = a.type === b.type ? 1 : 0
    const sameDomain = a.domain === b.domain ? 1 : 0
    const sharedTokens = containment(contentTokens(a.content), contentTokens(b.content))
    return 0.6 * semantic + 0.15 * sameType + 0.1 * sameDomain + 0.15 * sharedTokens
  }

  /** Cluster the memories by relatedness (spec §7.1). */
  cluster(): Memory[][] {
    const memories = this.store.all()
    const clusters: Memory[][] = []
    const used = new Set<string>()

    for (const memory of memories) {
      if (used.has(memory.id)) continue
      const cluster: Memory[] = [memory]
      used.add(memory.id)
      for (const candidate of memories) {
        if (used.has(candidate.id)) continue
        if (this.relatedness(memory, candidate) >= RELATEDNESS_THRESHOLD) {
          cluster.push(candidate)
          used.add(candidate.id)
        }
      }
      if (cluster.length >= MIN_CLUSTER_SIZE) clusters.push(cluster)
    }
    return clusters
  }

  /** Generate the proposals for review (spec §7.3). */
  dream(): DreamProposal[] {
    const produced: DreamProposal[] = []

    for (const cluster of this.cluster()) {
      const shared = this.sharedSignal(cluster)
      const types = [...new Set(cluster.map((m) => m.type))]
      const ids = cluster.map((m) => m.id)

      produced.push(
        this.propose(
          'insight',
          `Synthesis of ${cluster.length} related ${types.join('/')} records (shared signal: ${shared}).`,
          ids,
          0.6,
        ),
      )

      if (types.some((t) => t === 'preference' || t === 'personal')) {
        produced.push(
          this.propose(
            'invariant',
            `Stable pattern across ${cluster.length} ${types.join('/')} records: ${shared}.`,
            ids,
            0.55,
          ),
        )
      }

      const uncategorised = cluster.filter((m) => m.domain === 'general')
      if (uncategorised.length >= MIN_CLUSTER_SIZE) {
        produced.push(
          this.propose(
            'domain',
            `Reclassification suggestion for ${uncategorised.length} uncategorized records (shared signal: ${shared}).`,
            uncategorised.map((m) => m.id),
            0.5,
          ),
        )
      }
    }

    for (const proposal of produced) {
      this.ledger.append({
        memoryId: null,
        action: 'dream_proposed',
        actor: 'dreaming',
        details: {
          proposalId: proposal.id,
          type: proposal.type,
          derivedFrom: proposal.derivedFrom,
        },
      })
    }
    return produced
  }

  /**
   * Approve a proposal. An approved insight becomes a long-term factual record, an
   * approved invariant a long-term preference — both with `derivedFrom` lineage
   * (spec §7.4).
   */
  approve(proposalId: string): Memory | undefined {
    const proposal = this.proposals.find((p) => p.id === proposalId)
    if (!proposal || proposal.status !== 'pending') return undefined

    const type = proposal.type === 'invariant' ? 'preference' : 'factual'
    const created = this.store.put({
      id: `mem-dream-${proposal.id}`,
      content: proposal.content,
      type,
      layer: 'long_term',
      timestamp: this.clock(),
      lastAccessed: this.clock(),
      accessCount: 0,
      tags: ['dreamed', proposal.type],
      embedding: [],
      score: 0,
      confidence: proposal.confidence,
      source: 'dreaming',
      provenance: {
        origin: 'dreaming',
        learnedAt: this.clock(),
        label: `dream:${proposal.type}`,
        refs: [...proposal.derivedFrom],
      },
      domain: 'general',
      namespace: 'general/synthesized',
      entities: [],
      relatedTo: [],
      derivedFrom: [...proposal.derivedFrom],
    })

    proposal.status = 'approved'
    this.ledger.append({
      memoryId: created.id,
      action: 'dream_approved',
      actor: 'human',
      newState: { confidence: created.confidence, layer: created.layer, type: created.type },
      details: { proposalId: proposal.id, derivedFrom: proposal.derivedFrom },
    })
    return created
  }

  /** Reject a proposal — logged, never materialised (spec §7.4). */
  reject(proposalId: string): boolean {
    const proposal = this.proposals.find((p) => p.id === proposalId)
    if (!proposal || proposal.status !== 'pending') return false
    proposal.status = 'rejected'
    this.ledger.append({
      memoryId: null,
      action: 'dream_rejected',
      actor: 'human',
      details: { proposalId: proposal.id },
    })
    return true
  }

  private propose(
    type: DreamProposal['type'],
    content: string,
    derivedFrom: string[],
    confidence: number,
  ): DreamProposal {
    this.counter += 1
    const proposal: DreamProposal = {
      id: `drm-${String(this.counter).padStart(4, '0')}-${derivedFrom.join('_')}`,
      type,
      content,
      derivedFrom,
      confidence,
      status: 'pending',
    }
    this.proposals.push(proposal)
    return proposal
  }

  /** The signal the cluster shares — the tokens every record in it has in common. */
  private sharedSignal(cluster: Memory[]): string {
    if (cluster.length === 0) return 'none'
    let shared = new Set(contentTokens(cluster[0]?.content ?? ''))
    for (const memory of cluster.slice(1)) {
      const tokens = new Set(contentTokens(memory.content))
      shared = new Set([...shared].filter((t) => tokens.has(t)))
    }
    const list = [...shared].slice(0, 3)
    return list.length > 0 ? `"${list.join('", "')}"` : 'a shared topic'
  }
}
