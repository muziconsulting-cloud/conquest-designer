/**
 * The escrow — the settlement rail, implemented in this repository.
 *
 * There is no pre-existing settlement API to call: this is the rail. It is a
 * **two-of-two** escrow, and it follows the state machine of record in
 * `docs/AVC-SPEC.md` §5:
 *
 * ```
 * lock ─► pending ─(buyer AND seller confirm)─► settled
 *            ├── dispute ─► suspense ─► claim ─► settled
 *            ├── open + claim  ─► claimed (the seller binds)
 *            └── open + cancel ─► cancelled (the row is released)
 * ```
 *
 * Two ways to reach `settled`, and only from `settled` does a certificate exist:
 *
 *  - the **both confirm** path — the buyer and the seller each confirm, the escrow
 *    releases, and the settlement completes;
 *  - the **claim** path — the buyer claims (or the trade is disputed into suspense and
 *    then claimed), the seller binds, the seller is paid, and the settlement completes.
 *
 * **Whole rand only.** No tokens, no chain, no network.
 */

import type { EscrowState, SettlementEvent, TradeId, ListingId } from '../types.ts'

export type { EscrowState, SettlementEvent }

export interface EscrowTrade {
  tradeId: TradeId
  listingId: ListingId
  amountZar: number
  buyer: string
  seller: string
  state: EscrowState
  /** The payment reference the funds locked against. */
  paymentRef: string
  lockedAt?: string
  sellerConfirmedAt?: string
  buyerConfirmedAt?: string
  claimedAt?: string
  settledAt?: string
  cancelledAt?: string
}

export interface CreateTrade {
  tradeId: TradeId
  listingId: ListingId
  amountZar: number
  buyer: string
  seller: string
  paymentRef: string
  at: string
}

export class Escrow {
  private readonly trades = new Map<TradeId, EscrowTrade>()
  /** Every transition, in order — the escrow's own canonical record. */
  readonly events: SettlementEvent[] = []

  /** Open a trade. The funds have not locked yet. */
  create(input: CreateTrade): EscrowTrade {
    if (!Number.isInteger(input.amountZar) || input.amountZar <= 0) {
      throw new Error('amountZar must be whole rand > 0')
    }
    if (input.paymentRef === '') throw new Error('a trade needs a payment reference')
    const trade: EscrowTrade = {
      tradeId: input.tradeId,
      listingId: input.listingId,
      amountZar: input.amountZar,
      buyer: input.buyer,
      seller: input.seller,
      state: 'pending',
      paymentRef: input.paymentRef,
    }
    this.trades.set(trade.tradeId, trade)
    this.record(trade, input.at)
    return trade
  }

  /** x402 pays in: the funds lock. The purchase vault holds, `state: pending`. */
  lock(tradeId: TradeId, at: string): EscrowTrade {
    const trade = this.get(tradeId)
    if (trade.state !== 'pending') throw new Error(`lock invalid from ${trade.state}`)
    if (trade.lockedAt !== undefined) throw new Error('the funds are already locked')
    trade.lockedAt = at
    this.record(trade, at)
    return trade
  }

  /** The seller confirms delivery. On its own it does not release the funds. */
  sellerConfirm(tradeId: TradeId, at: string): EscrowTrade {
    const trade = this.get(tradeId)
    if (trade.state !== 'pending') throw new Error(`sellerConfirm invalid from ${trade.state}`)
    if (trade.lockedAt === undefined) throw new Error('the funds are not locked')
    trade.sellerConfirmedAt = at
    this.record(trade, at)
    return trade
  }

  /**
   * The buyer confirms receipt. When the seller has confirmed too, the escrow
   * releases and the trade settles — the two-of-two release.
   */
  buyerConfirm(tradeId: TradeId, at: string): EscrowTrade {
    const trade = this.get(tradeId)
    if (trade.state !== 'pending') throw new Error(`buyerConfirm invalid from ${trade.state}`)
    if (trade.lockedAt === undefined) throw new Error('the funds are not locked')
    trade.buyerConfirmedAt = at
    if (trade.sellerConfirmedAt !== undefined) {
      trade.state = 'settled'
      trade.settledAt = at
    }
    this.record(trade, at)
    return trade
  }

  /** A dispute holds the funds in suspense until the claim is resolved. */
  dispute(tradeId: TradeId, at: string): EscrowTrade {
    const trade = this.get(tradeId)
    if (trade.state !== 'pending') throw new Error(`dispute invalid from ${trade.state}`)
    trade.state = 'suspense'
    this.record(trade, at)
    return trade
  }

  /** The buyer claims: the seller binds. Reachable from `pending` or `suspense`. */
  claim(tradeId: TradeId, at: string): EscrowTrade {
    const trade = this.get(tradeId)
    if (trade.state !== 'pending' && trade.state !== 'suspense') {
      throw new Error(`claim invalid from ${trade.state}`)
    }
    trade.state = 'claimed'
    trade.claimedAt = at
    this.record(trade, at)
    return trade
  }

  /** The seller is paid and the trade settles. The certificate is issued here. */
  settle(tradeId: TradeId, at: string): EscrowTrade {
    const trade = this.get(tradeId)
    if (trade.state !== 'claimed') throw new Error(`settle invalid from ${trade.state}`)
    trade.state = 'settled'
    trade.settledAt = at
    this.record(trade, at)
    return trade
  }

  /** The row is released. A settled trade cannot be cancelled. */
  cancel(tradeId: TradeId, at: string): EscrowTrade {
    const trade = this.get(tradeId)
    if (trade.state === 'settled') throw new Error('cannot cancel a settled trade')
    if (trade.state === 'cancelled') throw new Error('the trade is already cancelled')
    trade.state = 'cancelled'
    trade.cancelledAt = at
    this.record(trade, at)
    return trade
  }

  get(tradeId: TradeId): EscrowTrade {
    const trade = this.trades.get(tradeId)
    if (!trade) throw new Error(`trade not found: ${tradeId}`)
    return trade
  }

  list(): EscrowTrade[] {
    return [...this.trades.values()]
  }

  /** One settlement event per transition. */
  private record(trade: EscrowTrade, at: string): void {
    this.events.push({
      tradeId: trade.tradeId,
      listingId: trade.listingId,
      state: trade.state,
      amountZar: trade.amountZar,
      at,
    })
  }
}
