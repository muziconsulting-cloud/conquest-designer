/**
 * World Model (Meterless) — re-exports.
 *
 *   WORLD_MODEL_IMPL=$PWD/src/engines/world-model/index.ts \
 *     bun vendor/meterless/world-model/conformance/runner.ts
 */

export { WorldModel, decide, AUTO_MERGE_THRESHOLD, REVIEW_THRESHOLD } from './world.ts'
export {
  entityIdFromName,
  entityIdFromExternalKey,
  normalizeName,
  hashId,
  relationId,
} from './ids.ts'
export { graphView, timelineView, searchView, snapshotView } from './views.ts'
export * from './types.ts'
export { WorldModel as default } from './world.ts'
