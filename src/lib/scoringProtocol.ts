/**
 * Researcher-facing scoring protocol settings layered on top of SCORING_SPECS.
 *
 * IMPORTANT: This module never mutates reverseItems or reverseCode. Editable
 * settings only override response min/max, group aggregation, and missingness
 * (maxPropMissing / prorate) on a cloned copy of each ScaleScoringSpec.
 */

import seedJson from '../data/validated_scales_seed.json'
import type { SeedScale } from '../types/database'
import {
  SCORING_SPECS,
  type Aggregation,
  type ScaleScoringSpec,
} from './scoring'

export type AggregationMethod = Aggregation

/**
 * Missing-data handling surfaced in the researcher UI.
 * Mapped onto ScaleScoringSpec.maxPropMissing + prorate without touching
 * reverse-scoring.
 */
export type MissingDataRule = 'listwise' | 'pairwise' | 'prorate'

export type ScaleScoringSettings = {
  scaleId: string
  min: number
  max: number
  aggregation: AggregationMethod
  missingRule: MissingDataRule
}

export const AGGREGATION_OPTIONS: {
  value: AggregationMethod
  label: string
  help: string
}[] = [
  { value: 'sum', label: 'Sum', help: 'Add item values (after reverse-scoring).' },
  { value: 'mean', label: 'Mean', help: 'Average item values (after reverse-scoring).' },
]

export const MISSING_RULE_OPTIONS: {
  value: MissingDataRule
  label: string
  help: string
}[] = [
  {
    value: 'listwise',
    label: 'Listwise',
    help: 'If any item is missing, the scored variable is blank (maxPropMissing = 0).',
  },
  {
    value: 'pairwise',
    label: 'Pairwise (available-item)',
    help: 'Score from available items only (no proration).',
  },
  {
    value: 'prorate',
    label: 'Prorate',
    help: 'Allow up to 20% missing and prorate sums from available items.',
  },
]

type SeedFile = { scales: SeedScale[] }
const scales = (seedJson as SeedFile).scales
const scaleById = new Map(scales.map((s) => [s.scale_id, s]))

function missingRuleFromSpec(spec: ScaleScoringSpec): MissingDataRule {
  if (spec.maxPropMissing <= 0 && !spec.prorate) return 'listwise'
  if (spec.prorate) return 'prorate'
  return 'pairwise'
}

function applyMissingRule(
  rule: MissingDataRule,
): Pick<ScaleScoringSpec, 'maxPropMissing' | 'prorate'> {
  switch (rule) {
    case 'listwise':
      return { maxPropMissing: 0, prorate: false }
    case 'pairwise':
      return { maxPropMissing: 1, prorate: false }
    case 'prorate':
      return { maxPropMissing: 0.2, prorate: true }
  }
}

/** Defaults derived from SCORING_SPECS (preserves each scale's conventional aggregation). */
export function getDefaultScaleSettings(scaleId: string): ScaleScoringSettings {
  const spec = SCORING_SPECS.find((s) => s.scale_id === scaleId)
  if (!spec) {
    return {
      scaleId,
      min: 1,
      max: 7,
      aggregation: 'mean',
      missingRule: 'listwise',
    }
  }
  const dominantAgg =
    spec.groups.find((g) => g.aggregation)?.aggregation ??
    spec.groups[0]?.aggregation ??
    'mean'
  return {
    scaleId,
    min: spec.response.min,
    max: spec.response.max,
    aggregation: dominantAgg,
    missingRule: missingRuleFromSpec(spec),
  }
}

export function getAllDefaultSettings(): Record<string, ScaleScoringSettings> {
  const out: Record<string, ScaleScoringSettings> = {}
  for (const spec of SCORING_SPECS) {
    out[spec.scale_id] = getDefaultScaleSettings(spec.scale_id)
  }
  return out
}

/**
 * Clone SCORING_SPECS with researcher protocol overrides.
 * reverseItems sets and reverseCode are never altered.
 */
export function specsWithSettings(
  settingsByScale: Partial<Record<string, ScaleScoringSettings>> = {},
  onlyScaleIds?: Iterable<string>,
): ScaleScoringSpec[] {
  const allow = onlyScaleIds ? new Set(onlyScaleIds) : null
  return SCORING_SPECS.filter((s) => !allow || allow.has(s.scale_id)).map((spec) => {
    const settings = settingsByScale[spec.scale_id]
    if (!settings) {
      return {
        ...spec,
        response: { ...spec.response },
        reverseItems: new Set(spec.reverseItems),
        groups: spec.groups.map((g) => ({ ...g, items: [...g.items] })),
        derived: spec.derived?.map((d) => ({ ...d })),
      }
    }
    const missing = applyMissingRule(settings.missingRule)
    return {
      ...spec,
      response: { min: settings.min, max: settings.max },
      // Preserve reverse-scoring flags exactly
      reverseItems: new Set(spec.reverseItems),
      maxPropMissing: missing.maxPropMissing,
      prorate: missing.prorate,
      groups: spec.groups.map((g) => ({
        ...g,
        items: [...g.items],
        aggregation: settings.aggregation,
      })),
      derived: spec.derived?.map((d) => ({ ...d })),
    }
  })
}

export function scoredVariableNames(scaleIds?: Iterable<string>): string[] {
  const allow = scaleIds ? new Set(scaleIds) : null
  const names: string[] = []
  for (const spec of SCORING_SPECS) {
    if (allow && !allow.has(spec.scale_id)) continue
    for (const g of spec.groups) names.push(g.name)
    for (const d of spec.derived ?? []) names.push(d.name)
  }
  return names
}

export function getInstrumentMeta(scaleId: string): SeedScale | undefined {
  return scaleById.get(scaleId)
}

export type CodebookRow = {
  variable_name: string
  kind: 'raw_item' | 'scored'
  scale_id: string | null
  scale_name_en: string | null
  scale_name_kr: string | null
  position_in_scale: number | null
  subscale: string | null
  reverse_scored: boolean | null
  text_en: string | null
  text_kr: string | null
  scored_from_items: string | null
  aggregation: string | null
  response_min: number | null
  response_max: number | null
  missing_rule: string | null
  notes: string | null
}

export function buildCodebook(
  settingsByScale: Partial<Record<string, ScaleScoringSettings>> = {},
  options?: { scaleIds?: string[] },
): CodebookRow[] {
  const scaleFilter = options?.scaleIds ? new Set(options.scaleIds) : null
  const specs = specsWithSettings(settingsByScale, scaleFilter ?? undefined)
  const rows: CodebookRow[] = []

  for (const spec of specs) {
    const seed = scaleById.get(spec.scale_id)
    const settings = {
      ...getDefaultScaleSettings(spec.scale_id),
      ...settingsByScale[spec.scale_id],
    }

    if (seed) {
      for (const it of seed.items) {
        rows.push({
          variable_name: it.variable_name,
          kind: 'raw_item',
          scale_id: seed.scale_id,
          scale_name_en: seed.name_en,
          scale_name_kr: seed.name_kr,
          position_in_scale: it.position_in_scale,
          subscale: it.subscale,
          reverse_scored: it.reverse_scored,
          text_en: it.text_en,
          text_kr: it.text_kr,
          scored_from_items: null,
          aggregation: null,
          response_min: settings.min,
          response_max: settings.max,
          missing_rule: null,
          notes: seed.scoring_note,
        })
      }
    }

    for (const g of spec.groups) {
      rows.push({
        variable_name: g.name,
        kind: 'scored',
        scale_id: spec.scale_id,
        scale_name_en: seed?.name_en ?? null,
        scale_name_kr: seed?.name_kr ?? null,
        position_in_scale: null,
        subscale: null,
        reverse_scored: null,
        text_en: g.name,
        text_kr: null,
        scored_from_items: g.items.join(';'),
        aggregation: g.aggregation,
        response_min: settings.min,
        response_max: settings.max,
        missing_rule: settings.missingRule,
        notes: seed?.scoring_note ?? null,
      })
    }
    for (const d of spec.derived ?? []) {
      rows.push({
        variable_name: d.name,
        kind: 'scored',
        scale_id: spec.scale_id,
        scale_name_en: seed?.name_en ?? null,
        scale_name_kr: seed?.name_kr ?? null,
        position_in_scale: null,
        subscale: null,
        reverse_scored: null,
        text_en: d.name,
        text_kr: null,
        scored_from_items: '(derived)',
        aggregation: 'derived',
        response_min: settings.min,
        response_max: settings.max,
        missing_rule: settings.missingRule,
        notes: seed?.scoring_note ?? null,
      })
    }
  }

  return rows
}
