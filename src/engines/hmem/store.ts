/**
 * The tiered memory store (spec §3, §11).
 *
 * One row per memory, held in memory. `long_term` and `working` are the persistent
 * tiers; `short_term` is the session tier. The store never deletes a record because a
 * conflict was resolved — the loser is marked `supersededBy` and penalised in ranking.
 */

import type { Memory } from './types.ts'

export class MemoryStoreService {
  private readonly records = new Map<string, Memory>()

  all(): Memory[] {
    return [...this.records.values()]
  }

  get(id: string): Memory | undefined {
    return this.records.get(id)
  }

  put(memory: Memory): Memory {
    this.records.set(memory.id, memory)
    return memory
  }

  delete(id: string): boolean {
    return this.records.delete(id)
  }

  count(): number {
    return this.records.size
  }

  /** Records that point at `id` through their synthesis lineage. */
  referencing(id: string): Memory[] {
    return this.all().filter((m) => m.derivedFrom.includes(id))
  }
}
