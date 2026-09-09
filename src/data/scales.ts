import type {
  ContentLocale,
  ResponseOption,
  SeedScale,
  SurveyItem,
  ValidatedScale,
} from '../types/database'
import seedJson from './validated_scales_seed.json'

type SeedFile = {
  scales: SeedScale[]
}

const seed = seedJson as SeedFile

/** Conventional bilingual anchors for common Likert point counts. */
const AGREE_7 = {
  kr: [
    '전혀 동의하지 않는다',
    '동의하지 않는다',
    '약간 동의하지 않는다',
    '중립',
    '약간 동의한다',
    '동의한다',
    '매우 동의한다',
  ],
  en: [
    'Strongly disagree',
    'Disagree',
    'Slightly disagree',
    'Neither agree nor disagree',
    'Slightly agree',
    'Agree',
    'Strongly agree',
  ],
}

const AGREE_5 = {
  kr: [
    '전혀 동의하지 않는다',
    '동의하지 않는다',
    '중립',
    '동의한다',
    '매우 동의한다',
  ],
  en: [
    'Strongly disagree',
    'Disagree',
    'Neither agree nor disagree',
    'Agree',
    'Strongly agree',
  ],
}

const FREQUENCY_5 = {
  kr: ['거의/전혀 없음', '드물게', '가끔', '자주', '매우 자주/항상'],
  en: [
    'Very rarely or never',
    'Rarely',
    'Sometimes',
    'Often',
    'Very often or always',
  ],
}

function optionsForScale(scale: SeedScale): {
  options: ResponseOption[]
  leftKr: string
  leftEn: string
  rightKr: string
  rightEn: string
} {
  const points = scale.response_scale.points
  const isSpane = scale.scale_id === 'spane'
  const pack =
    isSpane && points === 5
      ? FREQUENCY_5
      : points === 5
        ? AGREE_5
        : AGREE_7

  const labelsKr = pack.kr.slice(0, points)
  const labelsEn = pack.en.slice(0, points)
  // Pad if pack is shorter than points (shouldn't happen for 5/7).
  while (labelsKr.length < points) {
    labelsKr.push(`${labelsKr.length + 1}`)
    labelsEn.push(`${labelsEn.length + 1}`)
  }

  const options: ResponseOption[] = labelsKr.map((label_kr, i) => ({
    value: i + 1,
    label: label_kr, // default administered = Korean
    label_kr,
    label_en: labelsEn[i],
  }))

  return {
    options,
    leftKr: labelsKr[0],
    leftEn: labelsEn[0],
    rightKr: labelsKr[labelsKr.length - 1],
    rightEn: labelsEn[labelsEn.length - 1],
  }
}

function shortNameFromEn(nameEn: string, scaleId: string): string {
  const paren = nameEn.match(/\(([^)]+)\)\s*$/)
  if (paren) return paren[1]
  return scaleId.toUpperCase()
}

function toValidatedScale(scale: SeedScale): ValidatedScale {
  const { options, leftKr, leftEn, rightKr, rightEn } = optionsForScale(scale)
  return {
    id: scale.scale_id,
    name_kr: scale.name_kr,
    name_en: scale.name_en,
    shortName: shortNameFromEn(scale.name_en, scale.scale_id),
    source: scale.source,
    scoringNote: scale.scoring_note,
    itemType: 'likert',
    responseOptions: options,
    leftAnchorKr: leftKr,
    leftAnchorEn: leftEn,
    rightAnchorKr: rightKr,
    rightAnchorEn: rightEn,
    responseScale: scale.response_scale,
    items: scale.items.map((item) => ({
      variable_name: item.variable_name,
      position: item.position_in_scale,
      subscale: item.subscale,
      reverseScored: item.reverse_scored,
      text_kr: item.text_kr,
      text_en: item.text_en,
    })),
  }
}

/** The 8 validated scales from the seed JSON (researcher picker). */
export const VALIDATED_SCALES: ValidatedScale[] = seed.scales.map(toValidatedScale)

export function getValidatedScale(id: string): ValidatedScale | undefined {
  return VALIDATED_SCALES.find((s) => s.id === id)
}

/** Default demo scale for local seed (short, clean). */
export const DEMO_SCALE: ValidatedScale =
  getValidatedScale('swls') ?? VALIDATED_SCALES[0]

export function itemTextForLocale(
  item: Pick<SurveyItem, 'item_text' | 'item_text_kr' | 'item_text_en'>,
  locale: ContentLocale,
): string {
  if (locale === 'en') {
    return item.item_text_en || item.item_text_kr || item.item_text
  }
  return item.item_text_kr || item.item_text || item.item_text_en || ''
}

export function optionLabelForLocale(
  option: ResponseOption,
  locale: ContentLocale,
): string {
  if (locale === 'en') {
    return option.label_en || option.label || option.label_kr || String(option.value)
  }
  return option.label_kr || option.label || option.label_en || String(option.value)
}

export function anchorForLocale(
  item: SurveyItem,
  side: 'left' | 'right',
  locale: ContentLocale,
): string | null {
  if (side === 'left') {
    if (locale === 'en') {
      return item.left_anchor_en || item.left_anchor || item.left_anchor_kr
    }
    return item.left_anchor_kr || item.left_anchor || item.left_anchor_en
  }
  if (locale === 'en') {
    return item.right_anchor_en || item.right_anchor || item.right_anchor_kr
  }
  return item.right_anchor_kr || item.right_anchor || item.right_anchor_en
}

export function localizeOptions(
  options: ResponseOption[] | null | undefined,
  locale: ContentLocale,
): ResponseOption[] {
  if (!options) return []
  return options.map((opt) => ({
    ...opt,
    label: optionLabelForLocale(opt, locale),
  }))
}
