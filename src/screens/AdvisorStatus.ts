/**
 * Advisor footer text: the reviewer route the engine's advisor plugin last
 * wrote to `$DSH_HOME/advisor/state.json` (`effective` plus `enabled`). The
 * footer re-renders on every channel emit, so an mtime cache is enough
 * freshness; a partial write leaves the previous snapshot in place.
 */

import { readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { formatModelRoute } from '../modelRoute.js'

interface AdvisorStateFile {
  enabled?: unknown
  effective?: {
    provider?: unknown
    model?: unknown
    effort?: unknown
  }
}

/** One cached render decision: `undefined` hides the field. */
interface AdvisorCache {
  readonly mtimeMs: number
  readonly text: string | undefined
}

let cache: AdvisorCache | undefined

/**
 * The advisor footer text — `provider/model:effort`, the same spelling as the
 * main model segment — when the advisor is enabled, absent otherwise. Effort
 * `''` (the route default) stops at the model; a missing or pre-effective
 * state file hides the field.
 * @returns the text to render, or `undefined` when there is nothing to show.
 */
export function advisorStatusText(): string | undefined {
  const path = join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'advisor', 'state.json')
  let mtimeMs: number
  try {
    mtimeMs = statSync(path).mtimeMs
  } catch {
    return cache?.text
  }
  if (cache !== undefined && cache.mtimeMs === mtimeMs) return cache.text
  let text: string | undefined
  try {
    const state = JSON.parse(readFileSync(path, 'utf8')) as AdvisorStateFile
    const effective = state.effective
    if (state.enabled === true
      && typeof effective?.provider === 'string'
      && typeof effective?.model === 'string') {
      text = formatModelRoute({
        provider: effective.provider,
        model: effective.model,
        effort: typeof effective?.effort === 'string' ? effective.effort : undefined,
      })
    }
  } catch {
    // A partial write leaves the last good snapshot; a malformed file is the
    // engine plugin's failure to report, not the footer's.
  }
  cache = { mtimeMs, text }
  return text
}
