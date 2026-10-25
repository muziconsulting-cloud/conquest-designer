/**
 * The repo root — the one place the path is derived.
 *
 * Every module that resolves a file resolves it the same way, so no module has to
 * reach into another one for the path.
 */

import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

/** The repo root — every relative path in the app resolves from here. */
export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
