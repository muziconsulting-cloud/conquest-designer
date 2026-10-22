/**
 * The registration — the human registers once, and pays once.
 *
 * A registration is a human's statement that they stand behind an agent: who the
 * agent is, and who owns it. The registration does not price the agent and it does
 * not list the agent. It only opens a payment for the listing fee, and the payment
 * buys a listing token.
 *
 * The fee is a flat, whole-rand amount. It is the price of the **right to list**,
 * not the price of the listing: the agent declares its own price later, and the
 * evidence pipeline decides whether that price stands.
 */

import { createHash } from 'node:crypto'
import type { AgentIdentity } from '../types.ts'
import { buildPaymentRequest } from './payment.ts'
import type { PaymentReceipt, PaymentRequest } from './payment.ts'

/** The listing fee, in whole rands. The price of the right to list, once. */
export const LISTING_FEE_ZAR = 144

export interface Registration {
  registrationId: string
  agent: AgentIdentity
  /** Who stands behind the agent. */
  owner: string
  createdAt: string
  status: 'registered' | 'paid'
  /** The receipt that paid the fee. Null until the payment verifies. */
  receiptId: string | null
}

/** The registry of registrations. One per exchange process. */
export class ListingRegistry {
  private readonly registrations = new Map<string, Registration>()

  register(input: { agent: AgentIdentity; owner: string; at: string }): Registration {
    const registrationId = `reg-${createHash('sha256')
      .update(`${input.agent.agentId}|${input.owner}|${input.at}`)
      .digest('hex')
      .slice(0, 12)}`

    const registration: Registration = {
      registrationId,
      agent: input.agent,
      owner: input.owner,
      createdAt: input.at,
      status: 'registered',
      receiptId: null,
    }
    this.registrations.set(registrationId, registration)
    return registration
  }

  get(registrationId: string): Registration | undefined {
    return this.registrations.get(registrationId)
  }

  /** Record the payment. The registration is only "paid" once a receipt verifies. */
  markPaid(registrationId: string, receipt: PaymentReceipt): Registration | undefined {
    const registration = this.registrations.get(registrationId)
    if (!registration) return undefined
    registration.status = 'paid'
    registration.receiptId = receipt.receiptId
    return registration
  }
}

export interface RegistrationResult {
  registration: Registration
  /** The 402 the caller answers with, challenge and all. */
  payment: PaymentRequest
}

/**
 * Register an agent and open the payment for the listing fee.
 *
 * The caller answers with the 402 challenge; the client pays it; the receipt comes
 * back and the registration is marked paid. That is the whole human-side path.
 */
export function registerAgent(input: {
  registry: ListingRegistry
  agent: AgentIdentity
  owner: string
  resource: string
  at: string
}): RegistrationResult {
  const registration = input.registry.register({
    agent: input.agent,
    owner: input.owner,
    at: input.at,
  })

  const payment = buildPaymentRequest({
    registrationId: registration.registrationId,
    amountZar: LISTING_FEE_ZAR,
    description: `Listing fee for ${input.agent.displayName} — one listing`,
    resource: input.resource,
    at: input.at,
  })

  return { registration, payment }
}
