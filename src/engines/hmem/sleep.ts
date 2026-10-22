/**
 * The sleep cycle (spec §8) — preview first, then execute.
 *
 * `preview()` computes what consolidation, archival and synthesis would touch and
 * never mutates anything. `execute()` takes a backup first, then performs the work
 * and reports what it did. The guardrails are absolute: a record that is derived,
 * current, or a relationship hub is never archived, whatever the preview said.
 */

import { MemoryStoreService } from './store.ts'
import { TrustLedgerService } from './ledger.ts'
import { cosine } from './text.ts'
import type { Memory, SleepPreview, SleepReport } from './types.ts'

/** Consolidation threshold: 7 days without access (spec §13). */
export const CONSOLIDATION_AGE_DAYS = 7

/** Archive threshold: 30 days old, accessCount ≤ 2, unreferenced (spec §13). */
export const ARCHIVE_AGE_DAYS = 30
export const ARCHIVE_MAX_ACCESS = 2

/** Sleep synthesis similarity (spec §13). */
export const SYNTHESIS_SIMILARITY = 0.82

export class SleepCycleService {
  private readonly backups = new Map<string, Memory[]>()
  private counter = 0

  constructor(
    private readonly store: MemoryStoreService,
    private readonly ledger: TrustLedgerService,
    private readonly clock: () => number,
  ) {}

  /**
   * Guardrails (spec §8.2) — a record with high relationship value is not archivable:
   * current records, derived records and relationship hubs.
   */
  protected(memory: Memory): boolean {
    if (memory.derivedFrom.length > 0) return true
    if (memory.supersededBy !== undefined) return true
    if (memory.supersedes !== undefined) return true
    if (memory.relatedTo.length >= 3) return true
    if (this.store.referencing(memory.id).length > 0) return true
    if (memory.entities.length >= 4) return true
    return false
  }

  /** Compute the sleep plan without touching the store (spec §8.1). */
  preview(): SleepPreview {
    const now = this.clock()
    const toConsolidate: string[] = []
    const toArchive: string[] = []

    for (const memory of this.store.all()) {
      if (this.protected(memory)) continue
      const ageDays = (now - memory.timestamp) / (24 * 60 * 60 * 1000)

      if (memory.layer === 'short_term' && ageDays >= CONSOLIDATION_AGE_DAYS && memory.accessCount >= 1) {
        toConsolidate.push(memory.id)
        continue
      }
      if (ageDays >= ARCHIVE_AGE_DAYS && memory.accessCount <= ARCHIVE_MAX_ACCESS) {
        toArchive.push(memory.id)
      }
    }

    const toSynthesize: string[][] = []
    const candidates = this.store.all().filter((m) => !this.protected(m))
    for (let i = 0; i < candidates.length; i += 1) {
      const group: string[] = []
      for (let j = i; j < candidates.length; j += 1) {
        const a = candidates[i]
        const b = candidates[j]
        if (!a || !b) continue
        if (a.id === b.id) {
          group.push(a.id)
          continue
        }
        if (cosine(a.embedding, b.embedding) >= SYNTHESIS_SIMILARITY) group.push(b.id)
      }
      if (group.length >= 2) toSynthesize.push([...new Set(group)])
    }

    return { toConsolidate, toArchive, toSynthesize }
  }

  /** Execute a plan: back up first, then consolidate, archive and synthesise (spec §8.3). */
  execute(preview: SleepPreview): SleepReport {
    const backupId = this.backup()
    const actionLog: SleepReport['actionLog'] = []
    const consolidated: string[] = []
    const archived: string[] = []
    const synthesized: string[] = []

    for (const id of preview.toConsolidate) {
      const memory = this.store.get(id)
      if (!memory || this.protected(memory)) continue
      const previous = memory.layer
      memory.layer = 'long_term'
      consolidated.push(id)
      actionLog.push({ action: 'sleep_consolidate', memoryId: id })
      this.ledger.append({
        memoryId: id,
        action: 'sleep_consolidate',
        actor: 'sleep',
        previousState: { layer: previous },
        newState: { layer: memory.layer },
        details: { backupId },
      })
    }

    for (const id of preview.toArchive) {
      const memory = this.store.get(id)
      if (!memory) continue
      if (this.protected(memory)) continue
      this.store.delete(id)
      archived.push(id)
      actionLog.push({ action: 'sleep_archive', memoryId: id })
      this.ledger.append({
        memoryId: id,
        action: 'sleep_archive',
        actor: 'sleep',
        previousState: { layer: memory.layer, confidence: memory.confidence },
        details: { backupId },
      })
    }

    for (const group of preview.toSynthesize) {
      const sources = group.map((id) => this.store.get(id)).filter((m): m is Memory => m !== undefined)
      if (sources.length < 2) continue
      const tags = [...new Set(sources.flatMap((m) => m.tags))]
      const created = this.store.put({
        id: `mem-sleep-${this.counter + 1}-${sources.map((m) => m.id).join('_')}`,
        content: sources.map((m) => m.content).join(' | '),
        type: sources[0]?.type ?? 'general',
        layer: 'long_term',
        timestamp: this.clock(),
        lastAccessed: this.clock(),
        accessCount: 0,
        tags,
        embedding: [],
        score: 0,
        confidence: sources.reduce((sum, m) => sum + m.confidence, 0) / sources.length,
        source: 'sleep',
        provenance: {
          origin: 'sleep',
          learnedAt: this.clock(),
          label: 'sleep:synthesize',
          refs: sources.map((m) => m.id),
        },
        domain: sources[0]?.domain ?? 'general',
        namespace: sources[0]?.namespace ?? 'general/synthesized',
        entities: [],
        relatedTo: [],
        derivedFrom: sources.map((m) => m.id),
      })
      for (const source of sources) this.store.delete(source.id)
      synthesized.push(created.id)
      actionLog.push({ action: 'sleep_synthesize', memoryId: created.id })
      this.ledger.append({
        memoryId: created.id,
        action: 'sleep_synthesize',
        actor: 'sleep',
        newState: { layer: created.layer, confidence: created.confidence },
        details: { backupId, derivedFrom: created.derivedFrom },
      })
    }

    this.counter += 1
    return {
      backupId,
      consolidated,
      archived,
      synthesized,
      counts: {
        consolidated: consolidated.length,
        archived: archived.length,
        synthesized: synthesized.length,
      },
      actionLog,
    }
  }

  /** Restore from a backup snapshot (spec §8.3). */
  restore(backupId: string): boolean {
    const snapshot = this.backups.get(backupId)
    if (!snapshot) return false
    for (const memory of this.store.all()) this.store.delete(memory.id)
    for (const memory of snapshot) this.store.put(memory)
    this.ledger.append({
      memoryId: null,
      action: 'restore',
      actor: 'sleep',
      details: { backupId, records: snapshot.length },
    })
    return true
  }

  backupsList(): string[] {
    return [...this.backups.keys()]
  }

  /** Snapshot every record before the sleep cycle touches anything. */
  private backup(): string {
    this.counter += 1
    const backupId = `bkp-${String(this.counter).padStart(4, '0')}`
    this.backups.set(
      backupId,
      this.store.all().map((memory) => ({ ...memory, tags: [...memory.tags] })),
    )
    return backupId
  }
}
