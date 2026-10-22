/**
 * The marker protocol (spec §3).
 *
 * The model signals continuation with `[STATE_CHECKPOINT]` and completion with
 * `[TASK_COMPLETE]`. Markers are control text: they drive the run and they are
 * stripped from everything a user sees.
 */

export const STATE_MARKERS = ['[STATE_CHECKPOINT]', '@@@STATE@@@', '[STATE]', '---STATE---']

export const COMPLETE_MARKERS = ['[TASK_COMPLETE]', '@@@FINAL@@@', '[FINAL]', '---FINAL---']

export interface CleanedChunk {
  /** The display content — markers and control text removed. */
  content: string
  /** Which marker the chunk carried, if any. */
  marker: 'state' | 'complete' | undefined
  /** The structured state block that followed a state marker. */
  state: string | undefined
  /** The raw text, untouched. */
  raw: string
}

function findFirst(text: string, markers: string[]): { marker: string; index: number } | undefined {
  let best: { marker: string; index: number } | undefined
  for (const marker of markers) {
    const index = text.indexOf(marker)
    if (index === -1) continue
    if (!best || index < best.index) best = { marker, index }
  }
  return best
}

/**
 * Clean a chunk: strip the markers and the control text that follows them, and pull
 * out the structured state block.
 */
export function cleanChunk(raw: string): CleanedChunk {
  const complete = findFirst(raw, COMPLETE_MARKERS)
  const state = findFirst(raw, STATE_MARKERS)

  if (complete) {
    const before = raw.slice(0, complete.index)
    return {
      content: before.trim(),
      marker: 'complete',
      state: undefined,
      raw,
    }
  }

  if (state) {
    const before = raw.slice(0, state.index)
    const after = raw.slice(state.index + state.marker.length)
    return {
      content: before.trim(),
      marker: 'state',
      state: sanitizeState(after),
      raw,
    }
  }

  return { content: raw.trim(), marker: undefined, state: undefined, raw }
}

/** Keep the canonical carryover shape: COMPLETED / REMAINING / DECISIONS / CONTEXT. */
export function sanitizeState(block: string): string {
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const wanted = ['COMPLETED', 'REMAINING', 'DECISIONS', 'CONTEXT']
  const kept: string[] = []
  for (const key of wanted) {
    const line = lines.find((l) => l.toUpperCase().startsWith(`${key}:`))
    if (line) kept.push(line)
  }
  if (kept.length > 0) return kept.join('\n')

  // No labelled block — keep the lines themselves, minus anything that looks like a marker.
  const fallback = lines.filter((line) => !/^\[|@@@|^---/.test(line)).slice(0, 6)
  return fallback.join('\n')
}

/** Strip every marker from a display string — the UI never renders control text. */
export function stripMarkers(text: string): string {
  let out = text
  for (const marker of [...STATE_MARKERS, ...COMPLETE_MARKERS]) {
    out = out.split(marker).join('')
  }
  return out.replace(/\n{3,}/g, '\n\n').trim()
}
