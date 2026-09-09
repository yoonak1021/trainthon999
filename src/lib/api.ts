/**
 * Data access layer. Talks to Supabase when configured; otherwise uses
 * the local demo store so researcher + participant flows work offline.
 */

import { getValidatedScale, PSS_10 } from '../data/scales'
import {
  ensureDemoSeed,
  newId,
  nowIso,
  saveLocalDb,
  upsertLocalResponse,
  type LocalDb,
} from './localStore'
import { isSupabaseConfigured, supabase } from './supabase'
import type {
  AnswerInput,
  ItemType,
  Participant,
  Prompt,
  PromptOccasion,
  Response,
  ResponseExportRow,
  ResponseOption,
  Study,
  Survey,
  SurveyItem,
  ValidatedScale,
} from '../types/database'

export { isSupabaseConfigured }

const LOCAL_OWNER = 'local-researcher'

function scaleItemsToSurveyItems(
  surveyId: string,
  scale: ValidatedScale,
  startOrder: number,
): SurveyItem[] {
  const ts = nowIso()
  return scale.items.map((item, i) => ({
    id: newId(),
    survey_id: surveyId,
    item_type: scale.itemType,
    item_text: item.text,
    display_order: startOrder + i,
    response_options: scale.responseOptions,
    min_value: scale.responseOptions[0]?.value ?? 0,
    max_value: scale.responseOptions[scale.responseOptions.length - 1]?.value ?? 4,
    step_value: 1,
    left_anchor: scale.leftAnchor ?? scale.responseOptions[0]?.label ?? null,
    right_anchor:
      scale.rightAnchor ??
      scale.responseOptions[scale.responseOptions.length - 1]?.label ??
      null,
    variable_name: `${scale.id.replace(/-/g, '_')}_${item.variableSuffix}`,
    scale_name: scale.shortName,
    position_in_scale: item.position,
    reverse_scored: item.reverseScored,
    subscale: item.subscale ?? null,
    source: 'validated_scale' as const,
    source_scale_id: scale.id,
    created_at: ts,
  }))
}

function getDb(): LocalDb {
  return ensureDemoSeed((surveyId, startOrder) =>
    scaleItemsToSurveyItems(surveyId, PSS_10, startOrder),
  )
}

// ---- Studies ----

export async function listStudies(): Promise<Study[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('studies')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }
  return getDb().studies.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function getStudy(id: string): Promise<Study | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('studies').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  }
  return getDb().studies.find((s) => s.id === id) ?? null
}

export async function createStudy(input: {
  title: string
  description?: string
}): Promise<Study> {
  const ts = nowIso()
  if (isSupabaseConfigured && supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('studies')
      .insert({
        title: input.title,
        description: input.description ?? null,
        owner_id: user?.id ?? LOCAL_OWNER,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  const study: Study = {
    id: newId(),
    owner_id: LOCAL_OWNER,
    title: input.title,
    description: input.description ?? null,
    created_at: ts,
    updated_at: ts,
  }
  const db = getDb()
  db.studies.unshift(study)
  saveLocalDb(db)
  return study
}

// ---- Surveys ----

export async function listSurveys(studyId: string): Promise<Survey[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('study_id', studyId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }
  return getDb().surveys.filter((s) => s.study_id === studyId)
}

export async function getSurvey(id: string): Promise<Survey | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('surveys').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  }
  return getDb().surveys.find((s) => s.id === id) ?? null
}

export async function createSurvey(input: {
  study_id: string
  title: string
  description?: string
  instructions?: string
}): Promise<Survey> {
  const ts = nowIso()
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('surveys')
      .insert({
        study_id: input.study_id,
        title: input.title,
        description: input.description ?? null,
        instructions: input.instructions ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  const survey: Survey = {
    id: newId(),
    study_id: input.study_id,
    title: input.title,
    description: input.description ?? null,
    instructions: input.instructions ?? null,
    created_at: ts,
    updated_at: ts,
  }
  const db = getDb()
  db.surveys.push(survey)
  saveLocalDb(db)
  return survey
}

export async function updateSurvey(
  id: string,
  patch: Partial<Pick<Survey, 'title' | 'description' | 'instructions'>>,
): Promise<Survey> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('surveys')
      .update({ ...patch, updated_at: nowIso() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const db = getDb()
  const idx = db.surveys.findIndex((s) => s.id === id)
  if (idx < 0) throw new Error('Survey not found')
  db.surveys[idx] = { ...db.surveys[idx], ...patch, updated_at: nowIso() }
  saveLocalDb(db)
  return db.surveys[idx]
}

// ---- Items ----

export async function listItems(surveyId: string): Promise<SurveyItem[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('survey_items')
      .select('*')
      .eq('survey_id', surveyId)
      .order('display_order', { ascending: true })
    if (error) throw error
    return (data ?? []).map(normalizeItem)
  }
  return getDb()
    .survey_items.filter((i) => i.survey_id === surveyId)
    .sort((a, b) => a.display_order - b.display_order)
}

function normalizeItem(row: SurveyItem): SurveyItem {
  return {
    ...row,
    response_options: row.response_options ?? null,
  }
}

export async function addValidatedScaleItems(
  surveyId: string,
  scaleId: string,
): Promise<SurveyItem[]> {
  const scale = getValidatedScale(scaleId)
  if (!scale) throw new Error(`Unknown scale: ${scaleId}`)

  const existing = await listItems(surveyId)
  const startOrder = existing.length + 1
  const items = scaleItemsToSurveyItems(surveyId, scale, startOrder)

  // Avoid duplicate variable names if scale already added
  const existingVars = new Set(existing.map((i) => i.variable_name))
  const fresh = items.filter((i) => !existingVars.has(i.variable_name))
  if (fresh.length === 0) return existing

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('survey_items').insert(fresh).select()
    if (error) throw error
    // Also set survey instructions if empty
    const survey = await getSurvey(surveyId)
    if (survey && !survey.instructions) {
      await updateSurvey(surveyId, { instructions: scale.instructions })
    }
    return listItems(surveyId)
  }

  const db = getDb()
  db.survey_items.push(...fresh)
  const survey = db.surveys.find((s) => s.id === surveyId)
  if (survey && !survey.instructions) {
    survey.instructions = scale.instructions
    survey.updated_at = nowIso()
  }
  saveLocalDb(db)
  return listItems(surveyId)
}

export async function addCustomItem(input: {
  survey_id: string
  item_type: ItemType
  item_text: string
  variable_name: string
  response_options?: ResponseOption[] | null
  scale_name?: string | null
  position_in_scale?: number | null
  reverse_scored?: boolean
  subscale?: string | null
  left_anchor?: string | null
  right_anchor?: string | null
  min_value?: number | null
  max_value?: number | null
  step_value?: number | null
}): Promise<SurveyItem> {
  const existing = await listItems(input.survey_id)
  const item: SurveyItem = {
    id: newId(),
    survey_id: input.survey_id,
    item_type: input.item_type,
    item_text: input.item_text,
    display_order: existing.length + 1,
    response_options: input.response_options ?? null,
    min_value: input.min_value ?? null,
    max_value: input.max_value ?? null,
    step_value: input.step_value ?? null,
    left_anchor: input.left_anchor ?? null,
    right_anchor: input.right_anchor ?? null,
    variable_name: input.variable_name,
    scale_name: input.scale_name ?? null,
    position_in_scale: input.position_in_scale ?? null,
    reverse_scored: input.reverse_scored ?? false,
    subscale: input.subscale ?? null,
    source: 'custom',
    source_scale_id: null,
    created_at: nowIso(),
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('survey_items').insert(item).select().single()
    if (error) throw error
    return normalizeItem(data)
  }

  const db = getDb()
  db.survey_items.push(item)
  saveLocalDb(db)
  return item
}

export async function deleteItem(itemId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('survey_items').delete().eq('id', itemId)
    if (error) throw error
    return
  }
  const db = getDb()
  db.survey_items = db.survey_items.filter((i) => i.id !== itemId)
  // Re-pack display_order
  const bySurvey = new Map<string, SurveyItem[]>()
  for (const item of db.survey_items) {
    const list = bySurvey.get(item.survey_id) ?? []
    list.push(item)
    bySurvey.set(item.survey_id, list)
  }
  for (const list of bySurvey.values()) {
    list
      .sort((a, b) => a.display_order - b.display_order)
      .forEach((item, i) => {
        item.display_order = i + 1
      })
  }
  saveLocalDb(db)
}

// ---- Participants ----

export async function listParticipants(studyId: string): Promise<Participant[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('study_id', studyId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }
  return getDb().participants.filter((p) => p.study_id === studyId)
}

export async function createParticipant(input: {
  study_id: string
  participant_code: string
  condition_label?: string
}): Promise<Participant> {
  const ts = nowIso()
  const row: Participant = {
    id: newId(),
    study_id: input.study_id,
    participant_code: input.participant_code.trim().toUpperCase(),
    condition_label: input.condition_label ?? null,
    active: true,
    enrolled_at: ts,
    created_at: ts,
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('participants').insert(row).select().single()
    if (error) throw error
    return data
  }

  const db = getDb()
  if (
    db.participants.some(
      (p) =>
        p.study_id === row.study_id &&
        p.participant_code === row.participant_code,
    )
  ) {
    throw new Error('Participant code already exists in this study')
  }
  db.participants.push(row)
  saveLocalDb(db)
  return row
}

export async function findParticipantByCode(
  studyId: string,
  code: string,
): Promise<Participant | null> {
  const normalized = code.trim().toUpperCase()
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('study_id', studyId)
      .eq('participant_code', normalized)
      .eq('active', true)
      .maybeSingle()
    if (error) throw error
    return data
  }
  return (
    getDb().participants.find(
      (p) =>
        p.study_id === studyId &&
        p.participant_code === normalized &&
        p.active,
    ) ?? null
  )
}

/** Resolve participant by code alone (demo links may omit study id). */
export async function findParticipantByCodeGlobal(
  code: string,
): Promise<{ participant: Participant; study: Study } | null> {
  const normalized = code.trim().toUpperCase()
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('participants')
      .select('*, studies(*)')
      .eq('participant_code', normalized)
      .eq('active', true)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const study = (data as { studies: Study }).studies
    const { studies: _s, ...participant } = data as Participant & { studies: Study }
    return { participant, study }
  }
  const db = getDb()
  const participant = db.participants.find(
    (p) => p.participant_code === normalized && p.active,
  )
  if (!participant) return null
  const study = db.studies.find((s) => s.id === participant.study_id)
  if (!study) return null
  return { participant, study }
}

// ---- Prompts / occasions ----

export async function listPrompts(surveyId: string): Promise<Prompt[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }
  return getDb().prompts.filter((p) => p.survey_id === surveyId)
}

export async function listOccasions(promptId: string): Promise<PromptOccasion[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('prompt_occasions')
      .select('*')
      .eq('prompt_id', promptId)
      .order('occasion_index', { ascending: true })
    if (error) throw error
    return data ?? []
  }
  return getDb()
    .prompt_occasions.filter((o) => o.prompt_id === promptId)
    .sort((a, b) => a.occasion_index - b.occasion_index)
}

export async function createPromptWithOccasions(input: {
  survey_id: string
  label: string
  schedule_summary?: string
  cadence?: string
  duration_days?: number
}): Promise<{ prompt: Prompt; occasions: PromptOccasion[] }> {
  const ts = nowIso()
  const days = input.duration_days ?? 1
  const prompt: Prompt = {
    id: newId(),
    survey_id: input.survey_id,
    label: input.label,
    schedule_summary: input.schedule_summary ?? null,
    cadence: input.cadence ?? 'once',
    duration_days: days,
    starts_at: ts,
    ends_at: null,
    active: true,
    created_at: ts,
  }

  const occasions: PromptOccasion[] = Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      id: newId(),
      prompt_id: prompt.id,
      occasion_index: i + 1,
      label: days === 1 ? 'Wave 1' : `Day ${i + 1}`,
      scheduled_for: d.toISOString(),
      created_at: ts,
    }
  })

  if (isSupabaseConfigured && supabase) {
    const { data: p, error: pe } = await supabase.from('prompts').insert(prompt).select().single()
    if (pe) throw pe
    const { data: o, error: oe } = await supabase
      .from('prompt_occasions')
      .insert(occasions)
      .select()
    if (oe) throw oe
    return { prompt: p, occasions: o ?? [] }
  }

  const db = getDb()
  db.prompts.push(prompt)
  db.prompt_occasions.push(...occasions)
  saveLocalDb(db)
  return { prompt, occasions }
}

export async function getOccasion(id: string): Promise<PromptOccasion | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('prompt_occasions')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }
  return getDb().prompt_occasions.find((o) => o.id === id) ?? null
}

export async function getPrompt(id: string): Promise<Prompt | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('prompts').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  }
  return getDb().prompts.find((p) => p.id === id) ?? null
}

/** For a study, pick the first survey + current (or first) occasion for a participant link. */
export async function resolveParticipationSession(args: {
  studyId?: string
  participantCode: string
  occasionId?: string
}): Promise<{
  study: Study
  participant: Participant
  survey: Survey
  items: SurveyItem[]
  prompt: Prompt
  occasion: PromptOccasion
} | null> {
  let study: Study | null = null
  let participant: Participant | null = null

  if (args.studyId) {
    study = await getStudy(args.studyId)
    if (!study) return null
    participant = await findParticipantByCode(args.studyId, args.participantCode)
  } else {
    const found = await findParticipantByCodeGlobal(args.participantCode)
    if (!found) return null
    study = found.study
    participant = found.participant
  }
  if (!study || !participant) return null

  const surveys = await listSurveys(study.id)
  if (surveys.length === 0) return null
  const survey = surveys[0]
  const items = await listItems(survey.id)
  const prompts = await listPrompts(survey.id)
  if (prompts.length === 0) return null
  const prompt = prompts[0]
  const occasions = await listOccasions(prompt.id)
  if (occasions.length === 0) return null

  let occasion = occasions[0]
  if (args.occasionId) {
    occasion = occasions.find((o) => o.id === args.occasionId) ?? occasion
  } else {
    // Prefer today's occasion if present; else first unanswered-friendly = first
    const today = new Date().toDateString()
    occasion =
      occasions.find((o) =>
        o.scheduled_for ? new Date(o.scheduled_for).toDateString() === today : false,
      ) ?? occasions[0]
  }

  return { study, participant, survey, items, prompt, occasion }
}

// ---- Responses ----

export async function saveResponse(args: {
  participant_id: string
  survey_item_id: string
  prompt_occasion_id: string
  answer: AnswerInput
}): Promise<Response> {
  if (isSupabaseConfigured && supabase) {
    const payload = {
      participant_id: args.participant_id,
      survey_item_id: args.survey_item_id,
      prompt_occasion_id: args.prompt_occasion_id,
      numeric_value: args.answer.numeric_value ?? null,
      text_value: args.answer.text_value ?? null,
      selected_values: args.answer.selected_values ?? null,
      answered_at: nowIso(),
      updated_at: nowIso(),
    }
    const { data, error } = await supabase
      .from('responses')
      .upsert(payload, {
        onConflict: 'participant_id,survey_item_id,prompt_occasion_id',
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { response } = upsertLocalResponse(getDb(), args)
  return response
}

export async function listResponsesForOccasion(
  participantId: string,
  occasionId: string,
): Promise<Response[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .eq('participant_id', participantId)
      .eq('prompt_occasion_id', occasionId)
    if (error) throw error
    return data ?? []
  }
  return getDb().responses.filter(
    (r) =>
      r.participant_id === participantId &&
      r.prompt_occasion_id === occasionId,
  )
}

export async function listStudyResponses(studyId: string): Promise<ResponseExportRow[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('response_export')
      .select('*')
      .eq('study_id', studyId)
      .order('answered_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as ResponseExportRow[]
  }

  const db = getDb()
  const participants = db.participants.filter((p) => p.study_id === studyId)
  const participantIds = new Set(participants.map((p) => p.id))
  const codeById = new Map(participants.map((p) => [p.id, p.participant_code]))

  return db.responses
    .filter((r) => participantIds.has(r.participant_id))
    .map((r) => {
      const item = db.survey_items.find((i) => i.id === r.survey_item_id)
      const occasion = db.prompt_occasions.find((o) => o.id === r.prompt_occasion_id)
      return {
        ...r,
        participant_code: codeById.get(r.participant_id) ?? '?',
        variable_name: item?.variable_name ?? '',
        scale_name: item?.scale_name ?? null,
        position_in_scale: item?.position_in_scale ?? null,
        reverse_scored: item?.reverse_scored ?? false,
        occasion_index: occasion?.occasion_index ?? 0,
        occasion_label: occasion?.label ?? null,
        item_text: item?.item_text ?? '',
      }
    })
    .sort((a, b) => a.answered_at.localeCompare(b.answered_at))
}

export function resetLocalDemo(): void {
  localStorage.removeItem('longitudinal-survey-demo-v1')
  getDb()
}
