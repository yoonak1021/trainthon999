import { SCALES } from '../data/scales'
import type { EditableScale, ScaleDefinition } from '../types'

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[\s,;/|]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function scoreScale(query: string, scale: ScaleDefinition): number {
  const q = normalize(query)
  if (!q) return 0

  const haystack = normalize(
    [
      scale.name,
      scale.shortName,
      scale.fullName,
      ...scale.aliases,
      ...scale.constructs,
    ].join(' '),
  )

  let score = 0

  // Direct short-name / alias hits
  for (const alias of [scale.shortName, scale.name, ...scale.aliases]) {
    const a = normalize(alias)
    if (q === a || q.includes(a) || a.includes(q)) score += 100
  }

  // Construct / plain-English matching
  for (const construct of scale.constructs) {
    const c = normalize(construct)
    if (q.includes(c) || c.includes(q)) score += 60
    const overlap = tokenize(c).filter((t) => q.includes(t))
    score += overlap.length * 15
  }

  // Token overlap against full haystack
  for (const token of tokenize(q)) {
    if (token.length < 3) continue
    if (haystack.includes(token)) score += 10
  }

  return score
}

/** Split a multi-scale query into candidate phrases. */
export function parseQueryPhrases(query: string): string[] {
  const parts = query
    .split(/[,;|/]+|\band\b|\bplus\b|\bwith\b/gi)
    .map((p) => p.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : [query.trim()].filter(Boolean)
}

export function findMatchingScales(query: string): ScaleDefinition[] {
  const phrases = parseQueryPhrases(query)
  if (phrases.length === 0) return []

  const matched = new Map<string, { scale: ScaleDefinition; score: number }>()

  for (const phrase of phrases) {
    for (const scale of SCALES) {
      const score = scoreScale(phrase, scale)
      if (score <= 0) continue
      const existing = matched.get(scale.id)
      if (!existing || score > existing.score) {
        matched.set(scale.id, { scale, score })
      }
    }
  }

  // If no phrase-level match, try the whole query once
  if (matched.size === 0) {
    for (const scale of SCALES) {
      const score = scoreScale(query, scale)
      if (score > 0) matched.set(scale.id, { scale, score })
    }
  }

  return [...matched.values()]
    .filter((m) => m.score >= 20)
    .sort((a, b) => b.score - a.score)
    .map((m) => m.scale)
}

export function toEditableScale(scale: ScaleDefinition): EditableScale {
  return {
    instanceId: `${scale.id}-${crypto.randomUUID().slice(0, 8)}`,
    sourceId: scale.id,
    name: scale.fullName,
    shortName: scale.shortName,
    instructions: scale.instructions,
    citation: scale.citation,
    responseOptions: scale.responseOptions.map((o) => ({ ...o })),
    items: scale.items.map((item) => ({ ...item })),
  }
}

export function buildSurvey(query: string): {
  scales: EditableScale[]
  unmatched: string[]
} {
  const phrases = parseQueryPhrases(query)
  const scales: EditableScale[] = []
  const unmatched: string[] = []
  const usedIds = new Set<string>()

  for (const phrase of phrases) {
    const matches = findMatchingScales(phrase)
    if (matches.length === 0) {
      unmatched.push(phrase)
      continue
    }
    for (const match of matches) {
      if (usedIds.has(match.id)) continue
      usedIds.add(match.id)
      scales.push(toEditableScale(match))
    }
  }

  // Whole-query fallback when phrase splitting was too aggressive
  if (scales.length === 0 && query.trim()) {
    const matches = findMatchingScales(query)
    for (const match of matches) {
      scales.push(toEditableScale(match))
    }
  }

  return { scales, unmatched }
}

export const AVAILABLE_SCALE_HINTS = SCALES.map((s) => ({
  shortName: s.shortName,
  fullName: s.fullName,
  constructs: s.constructs.slice(0, 2),
}))
