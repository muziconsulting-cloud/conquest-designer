/**
 * Deterministic offline LLM adapter.
 *
 * Same input → same output every run. Reads sample source records from data/
 * so the offline path has a grounded corpus without network or keys.
 */

import type { LlmHealth, LlmPort, LlmRequest, LlmResponse } from './port.ts'

const DATA_PATH = 'data/source-records.json'

/** Stable non-cryptographic fingerprint for deterministic responses. */
function fingerprint(text: string): string {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export class OfflineAdapter implements LlmPort {
  readonly appId: string
  readonly name = 'offline'

  constructor(appId = 'conquest-exchange') {
    this.appId = appId
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const corpus = await this.readCorpus()
    const payload = JSON.stringify({
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      model: request.model ?? null,
      temperature: request.temperature ?? null,
      maxTokens: request.maxTokens ?? null,
      corpusIds: corpus.recordIds,
    })
    const fp = fingerprint(payload)
    return {
      text: `offline:${fp}:${corpus.recordIds.join(',')}`,
      model: 'offline/deterministic',
      raw: { fingerprint: fp, sourceCount: corpus.recordIds.length },
    }
  }

  async health(): Promise<LlmHealth> {
    return { state: 'online', reason: 'offline-deterministic', baseUrl: 'local://offline' }
  }

  async models(): Promise<string[]> {
    return ['offline/deterministic']
  }

  private async readCorpus(): Promise<{ recordIds: string[] }> {
    const file = Bun.file(DATA_PATH)
    if (!(await file.exists())) {
      return { recordIds: [] }
    }
    const data = (await file.json()) as {
      records?: { id: string }[]
    }
    const ids = (data.records ?? []).map((r) => r.id).sort()
    return { recordIds: ids }
  }
}
