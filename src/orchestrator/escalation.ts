/**
 * The escalation branch — one escalation per listing, never two.
 *
 * A listing that survives the challenge but whose price the evidence still does not
 * support escalates once to the telemetry auditor, which records the conflict and its
 * resolution. The bound is enforced here, not by convention: `escalate()` returns
 * `escalated: false` when the listing has already escalated, so a second escalation
 * cannot happen even if a caller asks twice.
 */

import type { Conflict, Critique } from '../types.ts'
import type { Reconciliation } from '../agents/contracts.ts'

export interface Escalation {
  listingId: string
  /** True only for the first escalation of this listing. */
  escalated: boolean
  /** The conflict that caused the escalation. */
  conflict: Conflict | null
  /** The resolution the reconciler reached, in words. */
  resolution: string
}

export function escalate(
  listingId: string,
  recon: Reconciliation,
  critique: Critique,
  alreadyEscalated = false,
): Escalation {
  if (alreadyEscalated) {
    return {
      listingId,
      escalated: false,
      conflict: null,
      resolution: 'A listing escalates at most once. This escalation was already recorded.',
    }
  }

  const conflict = recon.conflicts[0] ?? null

  return {
    listingId,
    escalated: true,
    conflict,
    resolution: conflict
      ? `${conflict.field}: ${conflict.resolution.winner} won — ${conflict.resolution.why}. ${critique.reason}`
      : critique.reason,
  }
}
