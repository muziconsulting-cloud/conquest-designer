/**
 * A2A Discovery & Remote Probe Reader
 * No sandbox, no git clone, no local execution - only remote HTTP
 */

export interface A2AAgentCard {
  name?: string
  description?: string
  url?: string
  version?: string
  capabilities?: any
  skills?: any[]
  extensions?: any[]
  defaultInputModes?: string[]
  defaultOutputModes?: string[]
  [key: string]: any
}

export class A2AReader {
  async discover(endpoint: string): Promise<A2AAgentCard | null> {
    if (!endpoint) return null
    const base = endpoint.replace(/\/$/, '')
    const candidates = [
      base + '/.well-known/agent.json',
      base + '/.well-known/agent-card.json',
      base + '/agent.json',
    ]
    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000),
        })
        if (res.ok) {
          const card = (await res.json()) as A2AAgentCard
          return card
        }
      } catch {}
    }
    return null
  }

  normalize(card: A2AAgentCard): A2AAgentCard {
    return {
      name: card.name || card.agentName || 'Unknown',
      description: card.description || '',
      url: card.url || card.endpoint || '',
      version: card.version || '1.0',
      capabilities: card.capabilities || {},
      skills: card.skills || [],
      extensions: card.extensions || [],
      defaultInputModes: card.defaultInputModes || ['text'],
      defaultOutputModes: card.defaultOutputModes || ['text'],
      ...card
    }
  }

  async probe(agentCard: A2AAgentCard): Promise<any> {
    const endpoint = agentCard.url
    if (!endpoint) return { ok: false, error: 'no endpoint' }
    try {
      // Try A2A message/send style probe if it looks like A2A
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'tasks/send', id: 1, params: { message: { parts: [{ type: 'text', text: 'ping' }] } } }),
        signal: AbortSignal.timeout(5000),
      })
      return { ok: res.ok, status: res.status }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  }
}

export const a2aReader = new A2AReader()
