/**
 * Scoring module for validated psychology scales.
 *
 * Protocol decisions (response min/max, aggregation, missing-data rule) are
 * intentionally exposed as editable ScaleScoringSettings — not hard-coded
 * silently. Defaults come from each instrument's conventional scoring, but
 * researchers should confirm against their lab protocol before analysis.
 *
 * Primary entry point: scoreAll(rawByVariable, settingsByScaleId?)
 */

import seedJson from '../data/validated_scales_seed.json'
import type { SeedScale } from '../types/database'

// ---------------------------------------------------------------------------
// Protocol settings (editable in researcher UI)
// ---------------------------------------------------------------------------

/** How item values are combined into a subscale / total. */
export type AggregationMethod = 'sum' | 'mean'

/**
 * Missing-data handling when some items on a scored variable are blank.
 * - listwise: require every item; else score is null
 * - pairwise: score from available items only (mean of available, or sum of available)
 * - prorate:  mean(available) * n_expected  (common for sum-scored scales)
 */
export type MissingDataRule = 'listwise' | 'pairwise' | 'prorate'

export type ScaleScoringSettings = {
  scaleId: string
  /** Response scale minimum (used for reverse-scoring). */
  min: number
  /** Response scale maximum (used for reverse-scoring). */
  max: number
  aggregation: AggregationMethod
  missingRule: MissingDataRule
}

export const AGGREGATION_OPTIONS: { value: AggregationMethod; label: string; help: string }[] =
  [
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
    help: 'If any item is missing, the scored variable is blank.',
  },
  {
    value: 'pairwise',
    label: 'Pairwise (available-item)',
    help: 'Score using only non-missing items (sum or mean of available).',
  },
  {
    value: 'prorate',
    label: 'Prorate',
    help: 'mean(available) × n_expected — common when sum-scoring with partial missingness.',
  },
]

// ---------------------------------------------------------------------------
// Scored-variable definitions
// ---------------------------------------------------------------------------

export type ScoredVariableDef = {
  /** Export column name, e.g. swls_total, tipi_extraversion, spane_b */
  name: string
  label: string
  scaleId: string
  /** Raw item variable_names that feed this score (pre-reverse). */
  items: string[]
  /**
   * Optional override of the scale's default aggregation for this variable.
   * Tipi dimensions are means even if a scale default were sum.
   */
  aggregation?: AggregationMethod
  /**
   * Derived scores that are not simple aggregates (e.g. SPANE-B = P − N).
   * When set, `items` is unused and `derive` runs after base scores exist.
   */
  derive?: (scores: Record<string, number | null>) => number | null
}

type SeedFile = { scales: SeedScale[] }
const scales = (seedJson as SeedFile).scales
const scaleById = new Map(scales.map((s) => [s.scale_id, s]))

function itemVars(scaleId: string, predicate?: (it: SeedScale['items'][number]) => boolean): string[] {
  const scale = scaleById.get(scaleId)
  if (!scale) return []
  return scale.items.filter((it) => (predicate ? predicate(it) : true)).map((it) => it.variable_name)
}

function reverseMapForScale(scaleId: string): Map<string, boolean> {
  const scale = scaleById.get(scaleId)
  const map = new Map<string, boolean>()
  if (!scale) return map
  for (const it of scale.items) {
    map.set(it.variable_name, it.reverse_scored)
  }
  return map
}

/** Default protocol settings per instrument (researchers can edit these). */
export function getDefaultScaleSettings(scaleId: string): ScaleScoringSettings {
  const scale = scaleById.get(scaleId)
  const points = scale?.response_scale.points ?? 7
  // Conventional defaults from scoring notes / literature
  const aggregation: AggregationMethod =
    scaleId === 'tipi' || scaleId === 'mvs' || scaleId === 'awe_sf' || scaleId === 'dpes_awe'
      ? 'mean'
      : scaleId === 'swls' || scaleId === 'prlq' || scaleId === 'spane' || scaleId === 'small_pes'
        ? 'sum'
        : 'mean'

  return {
    scaleId,
    min: 1,
    max: points,
    aggregation,
    missingRule: 'listwise',
  }
}

export function getAllDefaultSettings(): Record<string, ScaleScoringSettings> {
  const out: Record<string, ScaleScoringSettings> = {}
  for (const s of scales) {
    out[s.scale_id] = getDefaultScaleSettings(s.scale_id)
  }
  return out
}

/**
 * Scored variables produced by scoreAll().
 * Built from seed scoring notes; keep in sync when adding instruments.
 */
export const SCORED_VARIABLES: ScoredVariableDef[] = [
  // DPES-Awe — total mean of 6 items
  {
    name: 'dpes_awe_total',
    label: 'DPES-Awe total',
    scaleId: 'dpes_awe',
    items: itemVars('dpes_awe'),
    aggregation: 'mean',
  },

  // TIPI — five Big-Five dimensions (each mean of 2 items, one reverse)
  {
    name: 'tipi_extraversion',
    label: 'TIPI Extraversion',
    scaleId: 'tipi',
    items: ['tipi_1', 'tipi_6_r'],
    aggregation: 'mean',
  },
  {
    name: 'tipi_agreeableness',
    label: 'TIPI Agreeableness',
    scaleId: 'tipi',
    items: ['tipi_7', 'tipi_2_r'],
    aggregation: 'mean',
  },
  {
    name: 'tipi_conscientiousness',
    label: 'TIPI Conscientiousness',
    scaleId: 'tipi',
    items: ['tipi_3', 'tipi_8_r'],
    aggregation: 'mean',
  },
  {
    name: 'tipi_emotional_stability',
    label: 'TIPI Emotional Stability',
    scaleId: 'tipi',
    items: ['tipi_9', 'tipi_4_r'],
    aggregation: 'mean',
  },
  {
    name: 'tipi_openness',
    label: 'TIPI Openness',
    scaleId: 'tipi',
    items: ['tipi_5', 'tipi_10_r'],
    aggregation: 'mean',
  },

  // SWLS — sum of 5
  {
    name: 'swls_total',
    label: 'SWLS total',
    scaleId: 'swls',
    items: itemVars('swls'),
    aggregation: 'sum',
  },

  // PRLQ — sum of 12
  {
    name: 'prlq_total',
    label: 'PRLQ total',
    scaleId: 'prlq',
    items: itemVars('prlq'),
    aggregation: 'sum',
  },

  // SPANE — P, N, Balance
  {
    name: 'spane_p',
    label: 'SPANE Positive',
    scaleId: 'spane',
    items: itemVars('spane', (it) => it.subscale === 'positive'),
    aggregation: 'sum',
  },
  {
    name: 'spane_n',
    label: 'SPANE Negative',
    scaleId: 'spane',
    items: itemVars('spane', (it) => it.subscale === 'negative'),
    aggregation: 'sum',
  },
  {
    name: 'spane_b',
    label: 'SPANE Balance (P − N)',
    scaleId: 'spane',
    items: [],
    derive: (scores) => {
      const p = scores.spane_p
      const n = scores.spane_n
      if (p == null || n == null) return null
      return p - n
    },
  },

  // MVS — three subscales (means)
  {
    name: 'mvs_success',
    label: 'MVS Success',
    scaleId: 'mvs',
    items: itemVars('mvs', (it) => it.subscale === 'success'),
    aggregation: 'mean',
  },
  {
    name: 'mvs_centrality',
    label: 'MVS Centrality',
    scaleId: 'mvs',
    items: itemVars('mvs', (it) => it.subscale === 'centrality'),
    aggregation: 'mean',
  },
  {
    name: 'mvs_happiness',
    label: 'MVS Happiness',
    scaleId: 'mvs',
    items: itemVars('mvs', (it) => it.subscale === 'happiness'),
    aggregation: 'mean',
  },
  {
    name: 'mvs_total',
    label: 'MVS total (mean of all items)',
    scaleId: 'mvs',
    items: itemVars('mvs'),
    aggregation: 'mean',
  },

  // Small Self + PES — score SEPARATELY (do not combine)
  {
    name: 'smallself_total',
    label: 'Small Self total',
    scaleId: 'small_pes',
    items: itemVars('small_pes', (it) => it.subscale === 'small_self'),
    aggregation: 'sum',
  },
  {
    name: 'pes_total',
    label: 'PES total',
    scaleId: 'small_pes',
    items: itemVars('small_pes', (it) => it.subscale === 'entitlement'),
    aggregation: 'sum',
  },

  // AWE-SF — six two-item factors + optional total
  {
    name: 'awe_sf_time_perception',
    label: 'AWE-SF Time perception',
    scaleId: 'awe_sf',
    items: itemVars('awe_sf', (it) => it.subscale === 'time_perception'),
    aggregation: 'mean',
  },
  {
    name: 'awe_sf_self_diminishment',
    label: 'AWE-SF Self-diminishment',
    scaleId: 'awe_sf',
    items: itemVars('awe_sf', (it) => it.subscale === 'self_diminishment'),
    aggregation: 'mean',
  },
  {
    name: 'awe_sf_connectedness',
    label: 'AWE-SF Connectedness',
    scaleId: 'awe_sf',
    items: itemVars('awe_sf', (it) => it.subscale === 'connectedness'),
    aggregation: 'mean',
  },
  {
    name: 'awe_sf_vastness',
    label: 'AWE-SF Vastness',
    scaleId: 'awe_sf',
    items: itemVars('awe_sf', (it) => it.subscale === 'vastness'),
    aggregation: 'mean',
  },
  {
    name: 'awe_sf_physical_sensations',
    label: 'AWE-SF Physical sensations',
    scaleId: 'awe_sf',
    items: itemVars('awe_sf', (it) => it.subscale === 'physical_sensations'),
    aggregation: 'mean',
  },
  {
    name: 'awe_sf_need_for_accommodation',
    label: 'AWE-SF Need for accommodation',
    scaleId: 'awe_sf',
    items: itemVars('awe_sf', (it) => it.subscale === 'need_for_accommodation'),
    aggregation: 'mean',
  },
]

export function scoredVariablesForScales(scaleIds: Iterable<string>): ScoredVariableDef[] {
  const set = new Set(scaleIds)
  return SCORED_VARIABLES.filter((v) => set.has(v.scaleId))
}

// ---------------------------------------------------------------------------
// Core scoring
// ---------------------------------------------------------------------------

export type RawResponses = Record<string, number | null | undefined>

export type ScoreAllResult = {
  /** Scored variable_name → value (null if missing rule failed). */
  scores: Record<string, number | null>
  /** Optional notes per scored variable (e.g. "2/5 items missing"). */
  notes: Record<string, string>
}

function reverseValue(value: number, min: number, max: number): number {
  return min + max - value
}

function aggregate(
  values: number[],
  nExpected: number,
  method: AggregationMethod,
  missingRule: MissingDataRule,
): { value: number | null; note?: string } {
  const n = values.length
  if (n === 0) return { value: null, note: 'no items present' }

  if (missingRule === 'listwise' && n < nExpected) {
    return { value: null, note: `${nExpected - n}/${nExpected} items missing (listwise)` }
  }

  const sum = values.reduce((a, b) => a + b, 0)
  const mean = sum / n

  if (method === 'mean') {
    return {
      value: mean,
      note: n < nExpected ? `${n}/${nExpected} items used` : undefined,
    }
  }

  // sum
  if (missingRule === 'prorate' && n < nExpected) {
    return {
      value: mean * nExpected,
      note: `prorated from ${n}/${nExpected} items`,
    }
  }
  return {
    value: sum,
    note: n < nExpected ? `${n}/${nExpected} items summed (pairwise)` : undefined,
  }
}

/**
 * Score one participant-occasion's raw item responses.
 *
 * @param raw - map of variable_name → numeric response (null/undefined = missing)
 * @param settingsByScale - optional per-scale protocol overrides (min/max/agg/missing)
 * @param onlyScaleIds - if provided, only score variables belonging to these scales
 */
export function scoreAll(
  raw: RawResponses,
  settingsByScale: Partial<Record<string, ScaleScoringSettings>> = {},
  onlyScaleIds?: Set<string> | string[],
): ScoreAllResult {
  const allow = onlyScaleIds
    ? new Set(onlyScaleIds)
    : null

  const scores: Record<string, number | null> = {}
  const notes: Record<string, string> = {}

  const baseVars = SCORED_VARIABLES.filter(
    (v) => !v.derive && (!allow || allow.has(v.scaleId)),
  )
  const derivedVars = SCORED_VARIABLES.filter(
    (v) => v.derive && (!allow || allow.has(v.scaleId)),
  )

  for (const def of baseVars) {
    const defaults = getDefaultScaleSettings(def.scaleId)
    const settings = { ...defaults, ...settingsByScale[def.scaleId] }
    const reverse = reverseMapForScale(def.scaleId)
    // Protocol setting wins — editable in researcher UI. Per-variable
    // `aggregation` on the def is only the conventional default baked into
    // getDefaultScaleSettings(), not a silent override.
    const method = settings.aggregation

    const collected: number[] = []
    for (const varName of def.items) {
      const rawVal = raw[varName]
      if (rawVal == null || Number.isNaN(Number(rawVal))) continue
      let v = Number(rawVal)
      if (reverse.get(varName)) {
        v = reverseValue(v, settings.min, settings.max)
      }
      collected.push(v)
    }

    const { value, note } = aggregate(
      collected,
      def.items.length,
      method,
      settings.missingRule,
    )
    scores[def.name] = value
    if (note) notes[def.name] = note
  }

  for (const def of derivedVars) {
    const value = def.derive!(scores)
    scores[def.name] = value
    if (value == null) notes[def.name] = 'depends on missing component scores'
  }

  return { scores, notes }
}

// ---------------------------------------------------------------------------
// Codebook
// ---------------------------------------------------------------------------

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
  const rows: CodebookRow[] = []

  for (const scale of scales) {
    if (scaleFilter && !scaleFilter.has(scale.scale_id)) continue
    const settings = {
      ...getDefaultScaleSettings(scale.scale_id),
      ...settingsByScale[scale.scale_id],
    }

    for (const it of scale.items) {
      rows.push({
        variable_name: it.variable_name,
        kind: 'raw_item',
        scale_id: scale.scale_id,
        scale_name_en: scale.name_en,
        scale_name_kr: scale.name_kr,
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
        notes: scale.scoring_note,
      })
    }

    for (const def of SCORED_VARIABLES.filter((v) => v.scaleId === scale.scale_id)) {
      rows.push({
        variable_name: def.name,
        kind: 'scored',
        scale_id: scale.scale_id,
        scale_name_en: scale.name_en,
        scale_name_kr: scale.name_kr,
        position_in_scale: null,
        subscale: null,
        reverse_scored: null,
        text_en: def.label,
        text_kr: null,
        scored_from_items: def.derive
          ? '(derived)'
          : def.items.join(';'),
        aggregation: def.derive
          ? 'derived'
          : settings.aggregation,        response_min: settings.min,
        response_max: settings.max,
        missing_rule: settings.missingRule,
        notes: scale.scoring_note,
      })
    }
  }

  return rows
}

export function listInstrumentIds(): string[] {
  return scales.map((s) => s.scale_id)
}

export function getInstrumentMeta(scaleId: string): SeedScale | undefined {
  return scaleById.get(scaleId)
}
