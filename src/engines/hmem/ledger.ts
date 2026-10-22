/**
 * The trust ledger (spec §9.1) — append-only, never destructively pruned.
 *
 * Every significant action lands here with its actor, its timestamp and the previous
 * and new state, so a reviewer can reconstruct what the memory system did.
 */

import type { LedgerAction, LedgerEntry } from './types.ts'

export interface LedgerAppend {
  memoryId: string | null
  action: LedgerAction
  actor: string
  previousState?: Record<string, unknown>
  newState?: Record<string, unknown>
  details?: Record<string, unknown>
}

export class TrustLedgerService {
  private readonly entries: LedgerEntry[] = []
  private counter = 0

  constructor(private readonly clock: () => number) {}

  append(entry: LedgerAppend): LedgerEntry {
    this.counter += 1
    const id = `led-${String(this.counter).padStart(6, '0')}`
    const record: LedgerEntry = {
      id,
      memoryId: entry.memoryId,
      action: entry.action,
      actor: entry.actor,
      timestamp: this.clock(),
    }
    if (entry.previousState !== undefined) record.previousState = entry.previousState
    if (entry.newState !== undefined) record.newState = entry.newState
    if (entry.details !== undefined) record.details = entry.details
    this.entries.push(record)
    return record
  }

  /** The audit history of one memory, in the order the actions happened. */
  history(memoryId: string): LedgerEntry[] {
    return this.entries.filter((e) => e.memoryId === memoryId)
  }

  all(): LedgerEntry[] {
    return [...this.entries]
  }

  stats(): { total: number; byAction: Record<string, number> } {
    const byAction: Record<string, number> = {}
    for (const entry of this.entries) {
      byAction[entry.action] = (byAction[entry.action] ?? 0) + 1
    }
    return { total: this.entries.length, byAction }
  }

  /** Archive export — the ledger is append-only, so export is a copy, never a trim. */
  export(): { exportedAt: number; entries: LedgerEntry[] } {
    return { exportedAt: this.clock(), entries: this.all() }
  }
}
