/**
 * The read surface (spec: `docs/read-surface.md`).
 *
 * The canonical store is the source of truth; every view is derived from it and can be
 * thrown away and rebuilt. The views here are projections over the canonical state —
 * they never mutate it.
 */

import type { ContextRecord, Entity, Fact, NeighborOptions, Relation, WorldEvent } from './types.ts'

export interface WorldReader {
  entities(): Entity[]
  contexts(): ContextRecord[]
  relations(): Relation[]
  facts(): Fact[]
  events(): WorldEvent[]
}

export interface GraphView {
  neighborsOf(id: string, options?: NeighborOptions): Entity[]
  traverse(id: string, options?: NeighborOptions & { maxDepth?: number }): Entity[]
}

export interface TimelineView {
  entitiesOfType(type: string, options?: { from?: string; to?: string }): Entity[]
  contextChildren(contextId: string, options?: { type?: string }): ContextRecord[]
}

export interface SearchView {
  entities(options?: { text?: string; types?: string[]; limit?: number }): Entity[]
}

export interface SnapshotView {
  entityAt(id: string, at: string): Entity | undefined
}

export interface CustomView {
  get(key: string): unknown
  state(): unknown
}

function tokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? []
}

export function graphView(world: WorldReader): GraphView {
  return {
    neighborsOf(id: string, options: NeighborOptions = {}): Entity[] {
      const direction = options.direction ?? 'out'
      const at = options.at
      const found: Entity[] = []

      for (const relation of world.relations()) {
        if (options.via !== undefined && relation.type !== options.via) continue
        if (options.inContext !== undefined && relation.context !== options.inContext) continue

        let otherId: string | undefined
        if (direction !== 'in' && relation.from === id) otherId = relation.to
        if (direction !== 'out' && relation.to === id && otherId === undefined) otherId = relation.from
        if (otherId === undefined) continue

        if (at !== undefined) {
          // point in time: the edge must be valid then
          if (relation.validFrom > at) continue
          if (relation.validTo !== undefined && relation.validTo <= at) continue
        } else if (relation.validTo !== undefined) {
          // now: only open edges
          continue
        }

        const entity = world.entities().find((e) => e.id === otherId)
        if (entity) found.push(entity)
      }
      return found
    },

    traverse(id: string, options: NeighborOptions & { maxDepth?: number } = {}): Entity[] {
      const maxDepth = options.maxDepth ?? 3
      const seen = new Set<string>([id])
      const result: Entity[] = []
      let frontier = [id]

      for (let depth = 0; depth < maxDepth; depth += 1) {
        const next: string[] = []
        for (const current of frontier) {
          for (const neighbor of this.neighborsOf(current, options)) {
            if (seen.has(neighbor.id)) continue
            seen.add(neighbor.id)
            result.push(neighbor)
            next.push(neighbor.id)
          }
        }
        if (next.length === 0) break
        frontier = next
      }
      return result
    },
  }
}

export function timelineView(world: WorldReader): TimelineView {
  return {
    entitiesOfType(type: string, options: { from?: string; to?: string } = {}): Entity[] {
      return world.entities().filter((entity) => {
        if (entity.type !== type) return false
        if (options.from !== undefined && entity.lastSeenAt < options.from) return false
        if (options.to !== undefined && entity.firstSeenAt > options.to) return false
        return true
      })
    },

    contextChildren(contextId: string, options: { type?: string } = {}): ContextRecord[] {
      return world.contexts().filter((context) => {
        if (context.parent !== contextId) return false
        if (options.type !== undefined && context.type !== options.type) return false
        return true
      })
    },
  }
}

export function searchView(world: WorldReader): SearchView {
  return {
    entities(options: { text?: string; types?: string[]; limit?: number } = {}): Entity[] {
      const queryTokens = options.text ? tokens(options.text) : []
      const limit = options.limit ?? 20
      const scored = world.entities().map((entity) => {
        if (options.types && options.types.length > 0 && !options.types.includes(entity.type)) {
          return { entity, score: -1 }
        }
        if (queryTokens.length === 0) return { entity, score: 1 }
        const haystack = tokens(`${entity.name ?? ''} ${JSON.stringify(entity.attrs)}`)
        const haystackSet = new Set(haystack)
        let shared = 0
        for (const token of queryTokens) if (haystackSet.has(token)) shared += 1
        return { entity, score: shared / queryTokens.length }
      })
      return scored
        .filter((s) => s.score >= 0)
        .sort((a, b) => b.score - a.score || a.entity.id.localeCompare(b.entity.id))
        .slice(0, limit)
        .map((s) => s.entity)
    },
  }
}

export function snapshotView(world: WorldReader): SnapshotView {
  return {
    entityAt(id: string, at: string): Entity | undefined {
      let state: Entity | undefined
      for (const event of world.events()) {
        if (event.at > at) break
        if (event.kind !== 'upsertEntity') continue
        const payload = event.payload as { entity?: Entity }
        if (payload.entity && payload.entity.id === id) state = payload.entity
      }
      return state ?? world.entities().find((e) => e.id === id)
    },
  }
}
