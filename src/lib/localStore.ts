/**
 * In-browser persistence that mirrors the Postgres schema.
 * Used when Supabase env vars are not configured so the demo still works.
 */

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

const STORAGE_KEY = 'longitudinal-survey-demo-v1'

export type LocalDb = {
  studies: Study[]
  participants: Participant[]
  surveys: Survey[]
  survey_items: SurveyItem[]
  prompts: Prompt[]
  prompt_occasions: PromptOccasion[]
  responses: Response[]
}

function emptyDb(): LocalDb {
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

export function loadLocalDb(): LocalDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyDb()
    return { ...emptyDb(), ...JSON.parse(raw) } as LocalDb
  } catch {
    return emptyDb()
  }
}

export function saveLocalDb(db: LocalDb): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function newId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** Seed a demo study with PSS-10 so participant flow is immediately tryable. */
export function ensureDemoSeed(
  seedItems: (surveyId: string, startOrder: number) => SurveyItem[],
): LocalDb {
  const db = loadLocalDb()
  if (db.studies.length > 0) return db

  const studyId = newId()
  const surveyId = newId()
  const promptId = newId()
  const occasionId = newId()
  const participantId = newId()
  const ts = nowIso()

  const study: Study = {
    id: studyId,
    owner_id: 'local-researcher',
    title: 'Demo Stress Diary',
    description:
      'Example longitudinal study. Participants answer the PSS-10 once per occasion.',
    created_at: ts,
    updated_at: ts,
  }

  const survey: Survey = {
    id: surveyId,
    study_id: studyId,
    title: 'Daily Perceived Stress',
    description: 'PSS-10 administered for repeated measures.',
    instructions:
      'The questions in this scale ask you about your feelings and thoughts during the last month. In each case, you will be asked to indicate how often you felt or thought a certain way.',
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

  // Extra occasions so researchers can see longitudinal structure
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
  saveLocalDb(seeded)
  return seeded
}

export function upsertLocalResponse(
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
    const responses = db.responses.map((r) =>
      r.id === existing.id ? response : r,
    )
    const next = { ...db, responses }
    saveLocalDb(next)
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
  saveLocalDb(next)
  return { db: next, response }
}
