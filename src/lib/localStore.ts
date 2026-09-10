/**
 * In-browser persistence that mirrors the Postgres schema.
 * Used when Supabase env vars are not configured so the demo still works.
 *
 * Each researcher has an isolated database keyed by their account id.
 * Participants never log in; session lookup scans workspaces by code + study.
 */

import { listLocalResearcherIds } from './localAuth'
import type {
  AnswerInput,
  Participant,
  Prompt,
  PromptOccasion,
  Response,
  Study,
  Survey,
  SurveyItem,
} from '../types/database'

const DB_PREFIX = 'wave-researcher-db-v1:'
const LEGACY_V2 = 'longitudinal-survey-demo-v2'
const LEGACY_V1 = 'longitudinal-survey-demo-v1'
const LEGACY_MIGRATED = 'wave-legacy-db-migrated'

export type LocalDb = {
  studies: Study[]
  participants: Participant[]
  surveys: Survey[]
  survey_items: SurveyItem[]
  prompts: Prompt[]
  prompt_occasions: PromptOccasion[]
  responses: Response[]
}

export type OwnerDb = {
  ownerId: string
  db: LocalDb
}

export function emptyDb(): LocalDb {
  return {
    studies: [],
    participants: [],
    surveys: [],
    survey_items: [],
    prompts: [],
    prompt_occasions: [],
    responses: [],
  }
}

export function dbStorageKey(ownerId: string): string {
  return `${DB_PREFIX}${ownerId}`
}

export function loadLocalDb(ownerId: string): LocalDb {
  try {
    const raw = localStorage.getItem(dbStorageKey(ownerId))
    if (!raw) return emptyDb()
    return { ...emptyDb(), ...JSON.parse(raw) } as LocalDb
  } catch {
    return emptyDb()
  }
}

export function saveLocalDb(ownerId: string, db: LocalDb): void {
  localStorage.setItem(dbStorageKey(ownerId), JSON.stringify(db))
}

/** Move the pre-auth shared demo into the first researcher account once. */
export function migrateLegacyDbIfNeeded(ownerId: string): void {
  if (localStorage.getItem(LEGACY_MIGRATED)) return
  const legacy = localStorage.getItem(LEGACY_V2) ?? localStorage.getItem(LEGACY_V1)
  if (!legacy) return
  try {
    const parsed = { ...emptyDb(), ...JSON.parse(legacy) } as LocalDb
    parsed.studies = parsed.studies.map((s) => ({ ...s, owner_id: ownerId }))
    saveLocalDb(ownerId, parsed)
    localStorage.setItem(LEGACY_MIGRATED, ownerId)
    localStorage.removeItem(LEGACY_V2)
    localStorage.removeItem(LEGACY_V1)
  } catch {
    // ignore corrupt legacy payloads
  }
}

export function listOwnerDbs(): OwnerDb[] {
  const ids = new Set<string>(listLocalResearcherIds())
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith(DB_PREFIX)) ids.add(key.slice(DB_PREFIX.length))
  }
  return [...ids].map((ownerId) => ({ ownerId, db: loadLocalDb(ownerId) }))
}

export function findOwnerDbByStudy(studyId: string): OwnerDb | null {
  return listOwnerDbs().find((entry) => entry.db.studies.some((s) => s.id === studyId)) ?? null
}

export function findOwnerDbByParticipant(participantId: string): OwnerDb | null {
  return (
    listOwnerDbs().find((entry) =>
      entry.db.participants.some((p) => p.id === participantId),
    ) ?? null
  )
}

export function findOwnerDbBySurvey(surveyId: string): OwnerDb | null {
  return listOwnerDbs().find((entry) => entry.db.surveys.some((s) => s.id === surveyId)) ?? null
}

export function newId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** Seed a private demo study with SWLS so a new researcher can try the flow. */
export function ensureDemoSeed(
  ownerId: string,
  seedItems: (surveyId: string, startOrder: number) => SurveyItem[],
): LocalDb {
  migrateLegacyDbIfNeeded(ownerId)
  const db = loadLocalDb(ownerId)
  if (db.studies.length > 0) return db

  const studyId = newId()
  const surveyId = newId()
  const promptId = newId()
  const occasionId = newId()
  const participantId = newId()
  const ts = nowIso()

  const study: Study = {
    id: studyId,
    owner_id: ownerId,
    title: '데모 종단 연구',
    description:
      'Example longitudinal study. Participants answer SWLS (삶의 만족도 척도) once per occasion.',
    created_at: ts,
    updated_at: ts,
  }

  const survey: Survey = {
    id: surveyId,
    study_id: studyId,
    title: '삶의 만족도 체크인',
    description: 'SWLS administered for repeated measures (Korean default).',
    instructions:
      '다음 문항들에 대해 각 진술에 얼마나 동의하는지 표시해 주세요. / Please indicate how much you agree with each statement.',
    created_at: ts,
    updated_at: ts,
  }

  const items = seedItems(surveyId, 1)

  const prompt: Prompt = {
    id: promptId,
    survey_id: surveyId,
    label: 'Daily for 14 days',
    schedule_summary: 'daily for 14 days',
    cadence: 'daily',
    duration_days: 14,
    starts_at: ts,
    ends_at: null,
    active: true,
    created_at: ts,
  }

  const occasion: PromptOccasion = {
    id: occasionId,
    prompt_id: promptId,
    occasion_index: 1,
    label: 'Day 1',
    scheduled_for: ts,
    created_at: ts,
  }

  const moreOccasions: PromptOccasion[] = Array.from({ length: 13 }, (_, i) => {
    const idx = i + 2
    const d = new Date()
    d.setDate(d.getDate() + (idx - 1))
    return {
      id: newId(),
      prompt_id: promptId,
      occasion_index: idx,
      label: `Day ${idx}`,
      scheduled_for: d.toISOString(),
      created_at: ts,
    }
  })

  const participant: Participant = {
    id: participantId,
    study_id: studyId,
    participant_code: 'DEMO01',
    condition_label: null,
    active: true,
    enrolled_at: ts,
    created_at: ts,
  }

  const seeded: LocalDb = {
    studies: [study],
    participants: [participant],
    surveys: [survey],
    survey_items: items,
    prompts: [prompt],
    prompt_occasions: [occasion, ...moreOccasions],
    responses: [],
  }
  saveLocalDb(ownerId, seeded)
  return seeded
}

export function upsertLocalResponse(
  ownerId: string,
  db: LocalDb,
  args: {
    participant_id: string
    survey_item_id: string
    prompt_occasion_id: string
    answer: AnswerInput
  },
): { db: LocalDb; response: Response } {
  const ts = nowIso()
  const existing = db.responses.find(
    (r) =>
      r.participant_id === args.participant_id &&
      r.survey_item_id === args.survey_item_id &&
      r.prompt_occasion_id === args.prompt_occasion_id,
  )

  if (existing) {
    const response: Response = {
      ...existing,
      numeric_value: args.answer.numeric_value ?? null,
      text_value: args.answer.text_value ?? null,
      selected_values: args.answer.selected_values ?? null,
      answered_at: ts,
      updated_at: ts,
    }
    const next = {
      ...db,
      responses: db.responses.map((r) => (r.id === existing.id ? response : r)),
    }
    saveLocalDb(ownerId, next)
    return { db: next, response }
  }

  const response: Response = {
    id: newId(),
    participant_id: args.participant_id,
    survey_item_id: args.survey_item_id,
    prompt_occasion_id: args.prompt_occasion_id,
    numeric_value: args.answer.numeric_value ?? null,
    text_value: args.answer.text_value ?? null,
    selected_values: args.answer.selected_values ?? null,
    answered_at: ts,
    created_at: ts,
    updated_at: ts,
  }
  const next = { ...db, responses: [...db.responses, response] }
  saveLocalDb(ownerId, next)
  return { db: next, response }
}
