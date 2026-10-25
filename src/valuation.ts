/**
 * CDHQ Agent Verification - valuation service
 * Evaluates agents via A2A on their own host (no sandbox)
 */
import { claimFromBook } from './agents/book'

export interface ValuationRequest {
  repoUrl?: string
  agentEndpoint?: string
  declaredPrice?: string
  hackathon?: boolean
}

export async function startValuation(req: ValuationRequest) {
  // Try to discover A2A card
  let agentCard: any = null
  const endpoint = req.agentEndpoint || req.repoUrl
  if (endpoint) {
    try {
      const base = endpoint.replace(/\/$/, '')
      // Try common A2A locations
      const urls = [
        base + '/.well-known/agent.json',
        base + '/.well-known/agent-card.json',
        base + '/agent.json',
      ]
      for (const u of urls) {
        try {
          const res = await fetch(u, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(5000) })
          if (res.ok) {
            agentCard = await res.json()
            break
          }
        } catch {}
      }
    } catch {}
  }

  const id = crypto.randomUUID()
  return {
    id,
    status: 'queued',
    agentCard,
    fee: { amount: 1.00, currency: 'USD', to: '0x3d5975a75f88656B09B3086e82CBcAF8470F517E', rail: 'x402' },
    message: 'Payment required via x402 ($1.00). Evaluation will run after payment confirmation.'
  }
}
