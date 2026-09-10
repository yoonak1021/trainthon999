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

const APA_CITATIONS: Record<string, string> = {
  dpes_awe:
    'Shiota, M. N., Keltner, D., & John, O. P. (2006). Positive emotion differentiation: A functional approach. Cognition and Emotion, 20(1), 63–89. https://doi.org/10.1080/02699930500236033',
  tipi:
    'Gosling, S. D., Rentfrow, P. J., & Swann, W. B., Jr. (2003). A very brief measure of the Big-Five personality domains. Journal of Research in Personality, 37(6), 504–528. https://doi.org/10.1016/S0092-6566(03)00046-1',
  swls:
    'Diener, E., Emmons, R. A., Larsen, R. J., & Griffin, S. (1985). The Satisfaction With Life Scale. Journal of Personality Assessment, 49(1), 71–75. https://doi.org/10.1207/s15327752jpa4901_13',
  prlq:
    'Oishi, S., Choi, H., Buttrick, N., Graham, J., Tao, R., Sullivan, D., Koo, J., Biesanz, J. C., Westgate, E. C., & Buchtel, E. E. (2019). The psychologically rich life questionnaire. Journal of Research in Personality, 81, 257–270. https://doi.org/10.1016/j.jrp.2019.06.010',
  spane:
    'Diener, E., Wirtz, D., Tov, W., Kim-Prieto, C., Choi, D., Oishi, S., & Biswas-Diener, R. (2010). New well-being measures: Short scales to assess flourishing and positive and negative feelings. Social Indicators Research, 97(2), 143–156. https://doi.org/10.1007/s11205-009-9493-y',
  mvs:
    'Richins, M. L. (2004). The Material Values Scale: Measurement properties and development of a short form. Journal of Consumer Research, 31(1), 209–219. https://doi.org/10.1086/383436',
  small_pes:
    'Piff, P. K., Dietze, P., Feinberg, M., Stancato, D. M., & Keltner, D. (2015). Awe, the small self, and prosocial behavior. Journal of Personality and Social Psychology, 108(6), 883–899; Campbell, W. K., Bonacci, A. M., Shelton, J., Exline, J. J., & Bushman, B. J. (2004). Psychological entitlement: Interpersonal consequences and validation of a new measure. Journal of Personality Assessment, 83(1), 29–45.',
  awe_sf:
    'Yaden, D. B., Kaufman, S. B., Hyde, E., Chirico, A., Gaggioli, A., Wei, M., & Newberg, A. B. (2019). The development of the Awe Experience Scale (AWE-S): A multifactorial measure for research in the integrative study of awe. The Journal of Positive Psychology, 14(4), 474–488. https://doi.org/10.1080/17439760.2018.1484940',
}

const SCALE_KEYWORDS: Record<string, string[]> = {
  dpes_awe: ['awe', '경외감', 'positive emotion', '긍정 정서', 'wonder', '경이로움', 'nature', '자연', 'shiota', 'keltner', 'john'],
  tipi: ['personality', '성격', 'big five', '빅파이브', 'extraversion', 'agreeableness', 'conscientiousness', 'neuroticism', 'openness', '외향성', '성실성', '개방성', '친화성', '정서안정성', 'gosling', 'rentfrow', 'swann'],
  swls: ['life satisfaction', '삶의 만족', 'wellbeing', '웰빙', 'happiness', '행복', 'subjective well-being', 'diener', 'emmons', 'larsen', 'griffin'],
  prlq: ['psychologically rich life', '심리적 풍요', '풍요로운 삶', 'novel experiences', '새로운 경험', 'curiosity', '호기심', 'oishi', 'choi'],
  spane: ['positive experience', 'negative experience', '긍정 경험', '부정 경험', 'affect', '정동', 'mood', '기분', 'emotion', '감정', 'diener', 'wirtz'],
  mvs: ['materialism', '물질주의', 'material values', '소유', 'possession', 'luxury', 'luxury goods', '쇼핑', 'richins', 'dawson'],
  small_pes: ['small self', '작은 자아', 'entitlement', '특권 의식', 'humility', '겸손', 'ego', '자아', 'piff', 'campbell', 'keltner'],
  awe_sf: ['awe', '경외감', 'vastness', '거대함', 'connectedness', '연결감', 'goosebumps', '소름', 'transcendence', '초월', 'yaden', 'kaufman'],
}

function toValidatedScale(scale: SeedScale): ValidatedScale {
  const { options, leftKr, leftEn, rightKr, rightEn } = optionsForScale(scale)
  return {
    id: scale.scale_id,
    name_kr: scale.name_kr,
    name_en: scale.name_en,
    shortName: shortNameFromEn(scale.name_en, scale.scale_id),
    source: scale.source,
    citation: APA_CITATIONS[scale.scale_id] || scale.source,
    keywords: SCALE_KEYWORDS[scale.scale_id] || [],
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
