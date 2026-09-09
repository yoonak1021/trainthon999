/**
 * scoring.ts — Psychometric scale scoring for the survey platform.
 *
 * Turns raw item responses into scored variables (subscales + totals),
 * handling reverse-coding and missing data. Pure functions, no I/O — safe to
 * run client-side, in a Supabase edge function, or in a test.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THREE RESEARCH DECISIONS ARE ENCODED HERE. Each is a real methodological
 * choice, not a default you can ignore. They live in SCORING_SPECS so you can
 * see and change them per scale:
 *
 *   1. response.min / response.max  — the reverse-code formula is
 *      (min + max) - raw. If your actual anchors differ from what's assumed
 *      (these came from convention, NOT your document), reverse-coding is WRONG.
 *      Verify against your protocol before collecting real data.
 *
 *   2. aggregation: 'sum' | 'mean' — differs by scale by convention
 *      (SWLS sums, SPANE sums per subscale, most others average). Confirm each
 *      against the scale's manual / your preregistration.
 *
 *   3. maxPropMissing + prorate — how much missingness is tolerated before a
 *      score becomes null, and whether to prorate from available items.
 *      Conservative default (0.2) below. Set this to match your analysis plan.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type Aggregation = "sum" | "mean";

export interface ResponseScale {
  min: number;
  max: number;
}

/** One scored variable: a subscale, a dimension, or a total. */
export interface ScoreGroup {
  /** Output variable name, e.g. "swls_total", "tipi_extraversion", "spane_p". */
  name: string;
  /** Item variable_names that feed this score (as they appear in responses). */
  items: string[];
  aggregation: Aggregation;
}

/** A score computed from other scores, e.g. SPANE balance = P - N. */
export interface DerivedScore {
  name: string;
  /** Function of already-computed group scores (null if any input is null). */
  compute: (scores: Record<string, number | null>) => number | null;
}

export interface ScaleScoringSpec {
  scale_id: string;
  response: ResponseScale;
  /** variable_names that are reverse-scored (must match the seed's flags). */
  reverseItems: Set<string>;
  groups: ScoreGroup[];
  derived?: DerivedScore[];
  /** Max fraction of a group's items allowed missing before its score = null. */
  maxPropMissing: number;
  /** If true, impute missing items using the mean of available items. */
  prorate: boolean;
}

/** A participant's raw responses: variable_name -> numeric value (or null/undefined if unanswered). */
export type RawResponses = Record<string, number | null | undefined>;

/** Reverse-code a single raw value on a given response scale. */
export function reverseCode(raw: number, scale: ResponseScale): number {
  return scale.min + scale.max - raw;
}

/**
 * Score one group. Returns { value, nPresent, nMissing }.
 * value is null when too much is missing per the spec.
 */
function scoreGroup(
  group: ScoreGroup,
  responses: RawResponses,
  spec: ScaleScoringSpec
): { value: number | null; nPresent: number; nMissing: number } {
  const n = group.items.length;
  const present: number[] = [];

  for (const varName of group.items) {
    const raw = responses[varName];
    if (raw === null || raw === undefined || Number.isNaN(raw)) continue;
    const coded = spec.reverseItems.has(varName)
      ? reverseCode(raw, spec.response)
      : raw;
    present.push(coded);
  }

  const nPresent = present.length;
  const nMissing = n - nPresent;

  if (nPresent === 0 || nMissing / n > spec.maxPropMissing) {
    return { value: null, nPresent, nMissing };
  }

  const meanPresent = present.reduce((a, b) => a + b, 0) / nPresent;

  let value: number;
  if (group.aggregation === "mean") {
    value = meanPresent;
  } else {
    // sum: prorate to full length if allowed, else exact sum of present.
    value = spec.prorate ? meanPresent * n : present.reduce((a, b) => a + b, 0);
  }

  return { value: round(value), nPresent, nMissing };
}

/** Score one participant against one scale spec. */
export function scoreScale(
  responses: RawResponses,
  spec: ScaleScoringSpec
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const group of spec.groups) {
    out[group.name] = scoreGroup(group, responses, spec).value;
  }
  for (const d of spec.derived ?? []) {
    out[d.name] = d.compute(out);
  }
  return out;
}

/** Score one participant across many scales at once. */
export function scoreAll(
  responses: RawResponses,
  specs: ScaleScoringSpec[]
): Record<string, number | null> {
  return Object.assign({}, ...specs.map((s) => scoreScale(responses, s)));
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/* ──────────────────────────────────────────────────────────────────────────
 * SCORING SPECS for the 8 seed scales.
 * Aggregation choices follow each instrument's usual convention — VERIFY.
 * response.min/max follow the conventional anchors — VERIFY against your protocol.
 * ────────────────────────────────────────────────────────────────────────── */

const L7 = { min: 1, max: 7 };
const L5 = { min: 1, max: 5 };

export const SCORING_SPECS: ScaleScoringSpec[] = [
  {
    scale_id: "dpes_awe",
    response: L7,
    reverseItems: new Set(),
    maxPropMissing: 0.2,
    prorate: true,
    groups: [
      {
        name: "dpes_awe_total",
        aggregation: "mean",
        items: ["dpes_awe_1", "dpes_awe_2", "dpes_awe_3", "dpes_awe_4", "dpes_awe_5", "dpes_awe_6"],
      },
    ],
  },
  {
    scale_id: "tipi",
    response: L7,
    reverseItems: new Set(["tipi_2_r", "tipi_4_r", "tipi_6_r", "tipi_8_r", "tipi_10_r"]),
    maxPropMissing: 0, // 2-item dimensions: require both items present (see note in prose)
    prorate: false,
    groups: [
      { name: "tipi_extraversion", aggregation: "mean", items: ["tipi_1", "tipi_6_r"] },
      { name: "tipi_agreeableness", aggregation: "mean", items: ["tipi_7", "tipi_2_r"] },
      { name: "tipi_conscientiousness", aggregation: "mean", items: ["tipi_3", "tipi_8_r"] },
      { name: "tipi_emotional_stability", aggregation: "mean", items: ["tipi_9", "tipi_4_r"] },
      { name: "tipi_openness", aggregation: "mean", items: ["tipi_5", "tipi_10_r"] },
    ],
  },
  {
    scale_id: "swls",
    response: L7,
    reverseItems: new Set(),
    maxPropMissing: 0.2,
    prorate: true,
    groups: [
      { name: "swls_total", aggregation: "sum", items: ["swls_1", "swls_2", "swls_3", "swls_4", "swls_5"] },
    ],
  },
  {
    scale_id: "prlq",
    response: L7,
    reverseItems: new Set(),
    maxPropMissing: 0.2,
    prorate: true,
    groups: [
      {
        name: "prlq_total",
        aggregation: "mean",
        items: Array.from({ length: 12 }, (_, i) => `prlq_${i + 1}`),
      },
    ],
  },
  {
    scale_id: "spane",
    response: L5,
    reverseItems: new Set(),
    maxPropMissing: 0.2,
    prorate: true,
    groups: [
      {
        name: "spane_p",
        aggregation: "sum",
        items: ["spane_pos_1", "spane_pos_2", "spane_pos_3", "spane_pos_4", "spane_pos_5", "spane_pos_6"],
      },
      {
        name: "spane_n",
        aggregation: "sum",
        items: ["spane_neg_1", "spane_neg_2", "spane_neg_3", "spane_neg_4", "spane_neg_5", "spane_neg_6"],
      },
    ],
    derived: [
      {
        name: "spane_balance",
        compute: (s) => (s.spane_p === null || s.spane_n === null ? null : round(s.spane_p - s.spane_n)),
      },
    ],
  },
  {
    scale_id: "mvs",
    response: L5,
    reverseItems: new Set([
      "mvs_ss_3_r", "mvs_ss_6_r", "mvs_c_1_r", "mvs_c_2_r", "mvs_c_3_r", "mvs_c_7_r", "mvs_h_1_r", "mvs_h_3_r",
    ]),
    maxPropMissing: 0.2,
    prorate: true,
    groups: [
      { name: "mvs_success", aggregation: "mean", items: ["mvs_ss_1", "mvs_ss_2", "mvs_ss_3_r", "mvs_ss_4", "mvs_ss_5", "mvs_ss_6_r"] },
      { name: "mvs_centrality", aggregation: "mean", items: ["mvs_c_1_r", "mvs_c_2_r", "mvs_c_3_r", "mvs_c_4", "mvs_c_5", "mvs_c_6", "mvs_c_7_r"] },
      { name: "mvs_happiness", aggregation: "mean", items: ["mvs_h_1_r", "mvs_h_2", "mvs_h_3_r", "mvs_h_4", "mvs_h_5"] },
      {
        name: "mvs_total",
        aggregation: "mean",
        items: [
          "mvs_ss_1", "mvs_ss_2", "mvs_ss_3_r", "mvs_ss_4", "mvs_ss_5", "mvs_ss_6_r",
          "mvs_c_1_r", "mvs_c_2_r", "mvs_c_3_r", "mvs_c_4", "mvs_c_5", "mvs_c_6", "mvs_c_7_r",
          "mvs_h_1_r", "mvs_h_2", "mvs_h_3_r", "mvs_h_4", "mvs_h_5",
        ],
      },
    ],
  },
  {
    scale_id: "small_pes",
    response: L7,
    reverseItems: new Set(["pes_5_r"]),
    maxPropMissing: 0.2,
    prorate: true,
    groups: [
      // Two separate instruments — never summed together.
      { name: "small_self", aggregation: "mean", items: ["smallself_1", "smallself_2"] },
      {
        name: "pes_total",
        aggregation: "mean",
        items: ["pes_1", "pes_2", "pes_3", "pes_4", "pes_5_r", "pes_6", "pes_7", "pes_8", "pes_9"],
      },
    ],
  },
  {
    scale_id: "awe_sf",
    response: L7,
    reverseItems: new Set(),
    maxPropMissing: 0.2,
    prorate: true,
    groups: [
      { name: "awe_time_perception", aggregation: "mean", items: ["awe_sf_1", "awe_sf_2"] },
      { name: "awe_self_diminishment", aggregation: "mean", items: ["awe_sf_3", "awe_sf_4"] },
      { name: "awe_connectedness", aggregation: "mean", items: ["awe_sf_5", "awe_sf_6"] },
      { name: "awe_vastness", aggregation: "mean", items: ["awe_sf_7", "awe_sf_8"] },
      { name: "awe_physical_sensations", aggregation: "mean", items: ["awe_sf_9", "awe_sf_10"] },
      { name: "awe_need_for_accommodation", aggregation: "mean", items: ["awe_sf_11", "awe_sf_12"] },
      {
        name: "awe_total",
        aggregation: "mean",
        items: Array.from({ length: 12 }, (_, i) => `awe_sf_${i + 1}`),
      },
    ],
  },
];
