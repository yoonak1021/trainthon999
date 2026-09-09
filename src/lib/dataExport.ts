/**
 * Helpers to reshape long response rows into wide participant×occasion tables
 * and run scoreAll() for the researcher data view.
 */

import type { ResponseExportRow } from '../types/database'
import {
  scoreAll,
  scoredVariablesForScales,
  type ScaleScoringSettings,
  type ScoreAllResult,
} from './scoring'

export type WideRow = {
  participant_code: string
  occasion_index: number
  occasion_label: string | null
  /** variable_name → numeric (or null) */
  raw: Record<string, number | null>
  scored: ScoreAllResult
}

export function collectRawItemColumns(rows: ResponseExportRow[]): string[] {
  const set = new Set<string>()
  for (const r of rows) {
    if (r.variable_name) set.add(r.variable_name)
  }
  return Array.from(set).sort()
}

export function collectScaleIdsFromRows(rows: ResponseExportRow[]): string[] {
  const set = new Set<string>()
  for (const r of rows) {
    // Infer scale id from variable prefix / known scored defs via source in item
    // ResponseExportRow has scale_name but not scale_id; infer from variable_name prefixes.
    const v = r.variable_name
    if (v.startsWith('dpes_awe')) set.add('dpes_awe')
    else if (v.startsWith('tipi_')) set.add('tipi')
    else if (v.startsWith('swls_')) set.add('swls')
    else if (v.startsWith('prlq_')) set.add('prlq')
    else if (v.startsWith('spane_')) set.add('spane')
    else if (v.startsWith('mvs_')) set.add('mvs')
    else if (v.startsWith('smallself_') || v.startsWith('pes_')) set.add('small_pes')
    else if (v.startsWith('awe_sf_')) set.add('awe_sf')
  }
  return Array.from(set)
}

export function buildWideRows(
  rows: ResponseExportRow[],
  settingsByScale: Partial<Record<string, ScaleScoringSettings>>,
): WideRow[] {
  const groups = new Map<string, ResponseExportRow[]>()
  for (const r of rows) {
    const key = `${r.participant_code}::${r.occasion_index}`
    const list = groups.get(key) ?? []
    list.push(r)
    groups.set(key, list)
  }

  const scaleIds = collectScaleIdsFromRows(rows)
  const scaleSet = new Set(scaleIds)

  const wide: WideRow[] = []
  for (const [, group] of groups) {
    const first = group[0]
    const raw: Record<string, number | null> = {}
    for (const r of group) {
      raw[r.variable_name] =
        r.numeric_value == null ? null : Number(r.numeric_value)
    }
    const scored = scoreAll(raw, settingsByScale, scaleSet)
    wide.push({
      participant_code: first.participant_code,
      occasion_index: first.occasion_index,
      occasion_label: first.occasion_label,
      raw,
      scored,
    })
  }

  return wide.sort((a, b) => {
    const c = a.participant_code.localeCompare(b.participant_code)
    if (c !== 0) return c
    return a.occasion_index - b.occasion_index
  })
}

export function scoredColumnNames(scaleIds: string[]): string[] {
  return scoredVariablesForScales(scaleIds).map((v) => v.name)
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const escape = (value: string | number | null | undefined) => {
    if (value == null) return ''
    const s = String(value)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  return [
    headers.map(escape).join(','),
    ...rows.map((row) => row.map(escape).join(',')),
  ].join('\n')
}

export function downloadTextFile(filename: string, contents: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
