/**
 * Persist per-scale scoring protocol settings (min/max, aggregation, missing rule).
 * Local demo: localStorage. Ready to swap for a Supabase table later.
 */

import {
  getAllDefaultSettings,
  type ScaleScoringSettings,
} from './scoringProtocol'

import { getActiveResearcherId } from './localAuth'

function storageKey(): string {
  const ownerId = getActiveResearcherId() ?? 'anon'
  return `wave-scoring-settings-v1:${ownerId}`
}

export function loadScoringSettings(): Record<string, ScaleScoringSettings> {
  const defaults = getAllDefaultSettings()
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Record<string, Partial<ScaleScoringSettings>>
    const merged: Record<string, ScaleScoringSettings> = { ...defaults }
    for (const [id, patch] of Object.entries(parsed)) {
      merged[id] = { ...defaults[id], ...patch, scaleId: id }
    }
    return merged
  } catch {
    return defaults
  }
}

export function saveScoringSettings(
  settings: Record<string, ScaleScoringSettings>,
): void {
  localStorage.setItem(storageKey(), JSON.stringify(settings))
}

export function updateScaleSetting(
  scaleId: string,
  patch: Partial<Omit<ScaleScoringSettings, 'scaleId'>>,
): Record<string, ScaleScoringSettings> {
  const current = loadScoringSettings()
  const base = current[scaleId] ?? {
    scaleId,
    min: 1,
    max: 7,
    aggregation: 'mean' as const,
    missingRule: 'listwise' as const,
  }
  current[scaleId] = { ...base, ...patch, scaleId }
  saveScoringSettings(current)
  return current
}

export function resetScoringSettings(): Record<string, ScaleScoringSettings> {
  const defaults = getAllDefaultSettings()
  saveScoringSettings(defaults)
  return defaults
}
