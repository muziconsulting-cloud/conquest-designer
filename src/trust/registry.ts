/**
 * CDHQ Trust Registry
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const REGISTRY_PATH = join(process.cwd(), 'data', 'cdhq-trust.json')

export interface TrustEntry {
  id: string
  vcUrl: string
  agentId: string
  score: number
  issuedAt: string
  proofDigest: string
  endpoint?: string
}

export class TrustRegistry {
  private entries: TrustEntry[] = []

  async load() {
    try {
      const data = await readFile(REGISTRY_PATH, 'utf8')
      this.entries = JSON.parse(data)
    } catch {
      this.entries = []
    }
  }

  async save() {
    try {
      await mkdir(join(process.cwd(), 'data'), { recursive: true })
      await writeFile(REGISTRY_PATH, JSON.stringify(this.entries, null, 2))
    } catch {}
  }

  async add(entry: TrustEntry) {
    const exists = this.entries.find(e => e.id === entry.id || e.agentId === entry.agentId)
    if (exists) return exists
    this.entries.push(entry)
    await this.save()
    return entry
  }

  list(): TrustEntry[] {
    return this.entries
  }

  get(id: string): TrustEntry | undefined {
    return this.entries.find(e => e.id === id)
  }
}

export const trustRegistry = new TrustRegistry()
