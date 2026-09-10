/**
 * Data access layer. Talks to Supabase when configured; otherwise uses
 * the local demo store so researcher + participant flows work offline.
 *
 * Validated scales: loaded from src/data/validated_scales_seed.json and
 * copied into survey_items (preserving variable_name, position_in_scale,
 * subscale, reverse_scored, text_kr/text_en). Postgres seed lives at
 * supabase/seed/validated_scales_seed.sql (instruments + instrument_items).
 */

import { DEMO_SCALE, getValidatedScale } from '../data/scales'
import { getActiveResearcherId } from './localAuth'
import {
  dbStorageKey,
  ensureDemoSeed,
  findOwnerDbByParticipant,
  listOwnerDbs,
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

function requireOwnerId(): string {
  const ownerId = getActiveResearcherId()
  if (!ownerId) throw new Error('Researcher sign-in required')
  return ownerId
}

function persistDb(db: LocalDb): void {
  saveLocalDb(requireOwnerId(), db)
}

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
    // Default administered language = Korean
    item_text: item.text_kr,
    item_text_kr: item.text_kr,
    item_text_en: item.text_en,
    display_order: startOrder + i,
    response_options: scale.responseOptions,
    min_value: scale.responseOptions[0]?.value ?? 1,
    max_value:
      scale.responseOptions[scale.responseOptions.length - 1]?.value ??
      scale.responseScale.points,
    step_value: 1,
    left_anchor: scale.leftAnchorKr,
    right_anchor: scale.rightAnchorKr,
    left_anchor_kr: scale.leftAnchorKr,
    left_anchor_en: scale.leftAnchorEn,
    right_anchor_kr: scale.rightAnchorKr,
    right_anchor_en: scale.rightAnchorEn,
    variable_name: item.variable_name,
    scale_name: scale.shortName,
    scale_name_kr: scale.name_kr,
    scale_name_en: scale.name_en,
    position_in_scale: item.position,
    reverse_scored: item.reverseScored,
    subscale: item.subscale,
    source: 'validated_scale' as const,
    source_scale_id: scale.id,
    created_at: ts,
  }))
}

function getDb(): LocalDb {
  const ownerId = requireOwnerId()
  return ensureDemoSeed(ownerId, (surveyId, startOrder) =>
    scaleItemsToSurveyItems(surveyId, DEMO_SCALE, startOrder),
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
    if (!user) throw new Error('Researcher sign-in required')
    const { data, error } = await supabase
      .from('studies')
      .insert({
        title: input.title,
        description: input.description ?? null,
        owner_id: user.id,
      })
      .select()
      .single()
    if (error) throw error
    return data
  }

  const study: Study = {
    id: newId(),
    owner_id: requireOwnerId(),
    title: input.title,
    description: input.description ?? null,
    created_at: ts,
    updated_at: ts,
  }
  const db = getDb()
  db.studies.unshift(study)
  persistDb(db)
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
  persistDb(db)
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
  persistDb(db)
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
    item_text_kr: row.item_text_kr ?? row.item_text ?? null,
    item_text_en: row.item_text_en ?? null,
    left_anchor_kr: row.left_anchor_kr ?? row.left_anchor ?? null,
    left_anchor_en: row.left_anchor_en ?? null,
    right_anchor_kr: row.right_anchor_kr ?? row.right_anchor ?? null,
    right_anchor_en: row.right_anchor_en ?? null,
    scale_name_kr: row.scale_name_kr ?? null,
    scale_name_en: row.scale_name_en ?? null,
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
    const survey = await getSurvey(surveyId)
    if (survey && !survey.instructions) {
      await updateSurvey(surveyId, {
        instructions: `${scale.name_kr} / ${scale.name_en}\n${scale.scoringNote}`,
      })
    }
    return listItems(surveyId)
  }

  const db = getDb()
  db.survey_items.push(...fresh)
  const survey = db.surveys.find((s) => s.id === surveyId)
  if (survey && !survey.instructions) {
    survey.instructions = `${scale.name_kr} / ${scale.name_en}\n${scale.scoringNote}`
    survey.updated_at = nowIso()
  }
  persistDb(db)
  return listItems(surveyId)
}

export type CustomScaleItemInput = {
  item_text_kr: string
  item_text_en?: string | null
  variable_name: string
  reverse_scored?: boolean
}

export type AddCustomScaleInput = {
  survey_id: string
  scale_name?: string | null
  subscale?: string | null
  item_type: ItemType
  response_options?: ResponseOption[] | null
  left_anchor?: string | null
  right_anchor?: string | null
  left_anchor_kr?: string | null
  left_anchor_en?: string | null
  right_anchor_kr?: string | null
  right_anchor_en?: string | null
  min_value?: number | null
  max_value?: number | null
  step_value?: number | null
  items: CustomScaleItemInput[]
}

export async function addCustomScaleWithItems(
  input: AddCustomScaleInput,
): Promise<SurveyItem[]> {
  const existing = await listItems(input.survey_id)
  const startOrder = existing.length + 1
  const ts = nowIso()

  const newItems: SurveyItem[] = input.items.map((it, idx) => {
    const textKr = it.item_text_kr.trim()
    const textEn = it.item_text_en?.trim() || null
    return {
      id: newId(),
      survey_id: input.survey_id,
      item_type: input.item_type,
      item_text: textKr,
      item_text_kr: textKr,
      item_text_en: textEn,
      display_order: startOrder + idx,
      response_options: input.response_options ?? null,
      min_value: input.min_value ?? null,
      max_value: input.max_value ?? null,
      step_value: input.step_value ?? null,
      left_anchor: input.left_anchor ?? null,
      right_anchor: input.right_anchor ?? null,
      left_anchor_kr: input.left_anchor_kr ?? input.left_anchor ?? null,
      left_anchor_en: input.left_anchor_en ?? null,
      right_anchor_kr: input.right_anchor_kr ?? input.right_anchor ?? null,
      right_anchor_en: input.right_anchor_en ?? null,
      variable_name: it.variable_name.trim(),
      scale_name: input.scale_name?.trim() || null,
      scale_name_kr: input.scale_name?.trim() || null,
      scale_name_en: input.scale_name?.trim() || null,
      position_in_scale: idx + 1,
      reverse_scored: it.reverse_scored ?? false,
      subscale: input.subscale?.trim() || null,
      source: 'custom' as const,
      source_scale_id: null,
      created_at: ts,
    }
  })

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('survey_items').insert(newItems).select()
    if (error) throw error
    return listItems(input.survey_id)
  }

  const db = getDb()
  db.survey_items.push(...newItems)
  persistDb(db)
  return listItems(input.survey_id)
}

export async function addCustomItem(input: {
  survey_id: string
  item_type: ItemType
  item_text: string
  item_text_kr?: string | null
  item_text_en?: string | null
  variable_name: string
  response_options?: ResponseOption[] | null
  scale_name?: string | null
  position_in_scale?: number | null
  reverse_scored?: boolean
  subscale?: string | null
  left_anchor?: string | null
  right_anchor?: string | null
  left_anchor_kr?: string | null
  left_anchor_en?: string | null
  right_anchor_kr?: string | null
  right_anchor_en?: string | null
  min_value?: number | null
  max_value?: number | null
  step_value?: number | null
}): Promise<SurveyItem> {
  const existing = await listItems(input.survey_id)
  const textKr = input.item_text_kr ?? input.item_text
  const textEn = input.item_text_en ?? null
  const item: SurveyItem = {
    id: newId(),
    survey_id: input.survey_id,
    item_type: input.item_type,
    item_text: textKr,
    item_text_kr: textKr,
    item_text_en: textEn,
    display_order: existing.length + 1,
    response_options: input.response_options ?? null,
    min_value: input.min_value ?? null,
    max_value: input.max_value ?? null,
    step_value: input.step_value ?? null,
    left_anchor: input.left_anchor ?? null,
    right_anchor: input.right_anchor ?? null,
    left_anchor_kr: input.left_anchor_kr ?? input.left_anchor ?? null,
    left_anchor_en: input.left_anchor_en ?? null,
    right_anchor_kr: input.right_anchor_kr ?? input.right_anchor ?? null,
    right_anchor_en: input.right_anchor_en ?? null,
    variable_name: input.variable_name,
    scale_name: input.scale_name ?? null,
    scale_name_kr: input.scale_name ?? null,
    scale_name_en: input.scale_name ?? null,
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
  persistDb(db)
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
  persistDb(db)
}

export type SurveyItemPatch = Partial<
  Pick<
    SurveyItem,
    | 'item_type'
    | 'item_text'
    | 'item_text_kr'
    | 'item_text_en'
    | 'variable_name'
    | 'scale_name'
    | 'scale_name_kr'
    | 'scale_name_en'
    | 'position_in_scale'
    | 'subscale'
    | 'reverse_scored'
    | 'response_options'
    | 'left_anchor'
    | 'right_anchor'
    | 'left_anchor_kr'
    | 'left_anchor_en'
    | 'right_anchor_kr'
    | 'right_anchor_en'
    | 'min_value'
    | 'max_value'
    | 'step_value'
  >
>

export async function updateItem(
  itemId: string,
  patch: SurveyItemPatch,
): Promise<SurveyItem> {
  const nextPatch: SurveyItemPatch = { ...patch }
  if (nextPatch.item_text_kr != null) {
    nextPatch.item_text = nextPatch.item_text_kr
  } else if (nextPatch.item_text != null && nextPatch.item_text_kr === undefined) {
    nextPatch.item_text_kr = nextPatch.item_text
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('survey_items')
      .update(nextPatch)
      .eq('id', itemId)
      .select()
      .single()
    if (error) throw error
    return normalizeItem(data)
  }

  const db = getDb()
  const idx = db.survey_items.findIndex((i) => i.id === itemId)
  if (idx < 0) throw new Error('Item not found')
  db.survey_items[idx] = { ...db.survey_items[idx], ...nextPatch }
  persistDb(db)
  return db.survey_items[idx]
}

/** Move an item up (-1) or down (+1) within its survey; rewrites display_order. */
export async function moveItem(
  itemId: string,
  direction: -1 | 1,
): Promise<SurveyItem[]> {
  const dbLocal = !isSupabaseConfigured
  let items: SurveyItem[]

  if (dbLocal) {
    const db = getDb()
    const target = db.survey_items.find((i) => i.id === itemId)
    if (!target) throw new Error('Item not found')
    items = db.survey_items
      .filter((i) => i.survey_id === target.survey_id)
      .sort((a, b) => a.display_order - b.display_order)
  } else {
    const { data: row, error } = await supabase!
      .from('survey_items')
      .select('*')
      .eq('id', itemId)
      .single()
    if (error) throw error
    items = await listItems(row.survey_id)
  }

  const index = items.findIndex((i) => i.id === itemId)
  const swapWith = index + direction
  if (index < 0 || swapWith < 0 || swapWith >= items.length) {
    return items
  }

  const a = items[index]
  const b = items[swapWith]
  const orderA = a.display_order
  const orderB = b.display_order

  if (dbLocal) {
    const db = getDb()
    const ia = db.survey_items.findIndex((i) => i.id === a.id)
    const ib = db.survey_items.findIndex((i) => i.id === b.id)
    // Avoid unique(display_order) collisions in-memory by assigning temps then finals
    db.survey_items[ia].display_order = -1
    db.survey_items[ib].display_order = -2
    db.survey_items[ia].display_order = orderB
    db.survey_items[ib].display_order = orderA
    persistDb(db)
    return listItems(a.survey_id)
  }

  // Supabase: unique (survey_id, display_order) — park one row first
  const park = -(Math.abs(orderA) + Math.abs(orderB) + 1000)
  const { error: e1 } = await supabase!
    .from('survey_items')
    .update({ display_order: park })
    .eq('id', a.id)
  if (e1) throw e1
  const { error: e2 } = await supabase!
    .from('survey_items')
    .update({ display_order: orderA })
    .eq('id', b.id)
  if (e2) throw e2
  const { error: e3 } = await supabase!
    .from('survey_items')
    .update({ display_order: orderB })
    .eq('id', a.id)
  if (e3) throw e3
  return listItems(a.survey_id)
}

/** Reorder items by providing the full array of item IDs in desired order. */
export async function reorderItems(
  surveyId: string,
  orderedItemIds: string[],
): Promise<SurveyItem[]> {
  const dbLocal = !isSupabaseConfigured
  if (dbLocal) {
    const db = getDb()
    const itemMap = new Map(db.survey_items.map((it) => [it.id, it]))
    orderedItemIds.forEach((id, idx) => {
      const it = itemMap.get(id)
      if (it && it.survey_id === surveyId) {
        it.display_order = idx + 1
      }
    })
    persistDb(db)
    return listItems(surveyId)
  }

  // Supabase: park items to avoid unique constraint violations
  for (let i = 0; i < orderedItemIds.length; i++) {
    const id = orderedItemIds[i]
    await supabase!
      .from('survey_items')
      .update({ display_order: -(i + 1000) })
      .eq('id', id)
  }
  for (let i = 0; i < orderedItemIds.length; i++) {
    const id = orderedItemIds[i]
    await supabase!
      .from('survey_items')
      .update({ display_order: i + 1 })
      .eq('id', id)
  }
  return listItems(surveyId)
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
  persistDb(db)
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

function findLocalParticipantMatches(
  code: string,
  studyId?: string,
): Array<{ ownerId: string; db: LocalDb; participant: Participant; study: Study }> {
  const normalized = code.trim().toUpperCase()
  const matches: Array<{
    ownerId: string
    db: LocalDb
    participant: Participant
    study: Study
  }> = []
  for (const { ownerId, db } of listOwnerDbs()) {
    for (const participant of db.participants) {
      if (!participant.active || participant.participant_code !== normalized) continue
      if (studyId && participant.study_id !== studyId) continue
      const study = db.studies.find((s) => s.id === participant.study_id)
      if (study) matches.push({ ownerId, db, participant, study })
    }
  }
  return matches
}

type ParticipantSessionRow = {
  study: Study
  participant: Participant
  survey: Survey
  items: SurveyItem[]
  prompt: Prompt
  occasion: PromptOccasion
}

async function startSupabaseParticipantSession(args: {
  studyId?: string
  participantCode: string
  occasionId?: string
}): Promise<ParticipantSessionRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('participant_start_session', {
    p_code: args.participantCode.trim().toUpperCase(),
    p_study_id: args.studyId ?? null,
    p_occasion_id: args.occasionId ?? null,
  })
  if (error) throw error
  if (!data) return null
  const payload = data as ParticipantSessionRow
  if (!payload.study || !payload.participant || !payload.survey) return null
  return {
    ...payload,
    items: (payload.items ?? []).map(normalizeItem),
  }
}

/** Resolve participant by code alone (demo links may omit study id). */
export async function findParticipantByCodeGlobal(
  code: string,
): Promise<{ participant: Participant; study: Study } | null> {
  const normalized = code.trim().toUpperCase()
  if (isSupabaseConfigured && supabase) {
    const session = await startSupabaseParticipantSession({
      participantCode: normalized,
    })
    if (!session) return null
    return { participant: session.participant, study: session.study }
  }
  const matches = findLocalParticipantMatches(normalized)
  if (matches.length !== 1) return null
  return { participant: matches[0].participant, study: matches[0].study }
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
  times_per_day?: number
  delivery_times?: string[]
  response_window_minutes?: number
  starts_at?: string
  generated_occasions?: Array<{
    occasion_index: number
    label: string
    scheduled_for: string
    window_closes_at?: string | null
  }>
}): Promise<{ prompt: Prompt; occasions: PromptOccasion[] }> {
  const ts = nowIso()
  const days = input.duration_days ?? 1
  const prompt: Prompt = {
    id: newId(),
    survey_id: input.survey_id,
    label: input.label,
    schedule_summary: input.schedule_summary ?? null,
    cadence: input.cadence ?? 'daily_diary',
    times_per_day: input.times_per_day ?? 1,
    delivery_times: input.delivery_times ?? null,
    response_window_minutes: input.response_window_minutes ?? 1440,
    duration_days: days,
    starts_at: input.starts_at ?? ts,
    ends_at: null,
    active: true,
    created_at: ts,
  }

  let occasions: PromptOccasion[] = []

  if (input.generated_occasions && input.generated_occasions.length > 0) {
    occasions = input.generated_occasions.map((o) => ({
      id: newId(),
      prompt_id: prompt.id,
      occasion_index: o.occasion_index,
      label: o.label,
      scheduled_for: o.scheduled_for,
      window_closes_at: o.window_closes_at ?? null,
      created_at: ts,
    }))
  } else {
    // Default 1 occasion per day
    occasions = Array.from({ length: days }, (_, i) => {
      const d = new Date(input.starts_at ? new Date(input.starts_at) : new Date())
      d.setDate(d.getDate() + i)
      const close = new Date(d)
      close.setMinutes(close.getMinutes() + (input.response_window_minutes ?? 1440))
      return {
        id: newId(),
        prompt_id: prompt.id,
        occasion_index: i + 1,
        label: days === 1 ? 'Wave 1' : `Day ${i + 1}`,
        scheduled_for: d.toISOString(),
        window_closes_at: close.toISOString(),
        created_at: ts,
      }
    })
  }

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
  persistDb(db)
  return { prompt, occasions }
}

export async function updatePrompt(
  promptId: string,
  patch: Partial<Omit<Prompt, 'id' | 'survey_id' | 'created_at'>>,
): Promise<Prompt> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('prompts')
      .update(patch)
      .eq('id', promptId)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const db = getDb()
  const idx = db.prompts.findIndex((p) => p.id === promptId)
  if (idx < 0) throw new Error('Prompt not found')
  db.prompts[idx] = { ...db.prompts[idx], ...patch }
  persistDb(db)
  return db.prompts[idx]
}

export async function deletePrompt(promptId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('prompts').delete().eq('id', promptId)
    if (error) throw error
    return
  }
  const db = getDb()
  db.prompts = db.prompts.filter((p) => p.id !== promptId)
  db.prompt_occasions = db.prompt_occasions.filter((o) => o.prompt_id !== promptId)
  persistDb(db)
}

export async function updatePromptOccasion(
  occasionId: string,
  patch: Partial<Omit<PromptOccasion, 'id' | 'prompt_id' | 'created_at'>>,
): Promise<PromptOccasion> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('prompt_occasions')
      .update(patch)
      .eq('id', occasionId)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const db = getDb()
  const idx = db.prompt_occasions.findIndex((o) => o.id === occasionId)
  if (idx < 0) throw new Error('Occasion not found')
  db.prompt_occasions[idx] = { ...db.prompt_occasions[idx], ...patch }
  persistDb(db)
  return db.prompt_occasions[idx]
}

export async function addPromptOccasion(
  promptId: string,
  input: {
    label: string
    scheduled_for: string
    window_closes_at?: string | null
  },
): Promise<PromptOccasion> {
  const occasions = await listOccasions(promptId)
  const nextIndex = occasions.length > 0 ? Math.max(...occasions.map((o) => o.occasion_index)) + 1 : 1
  const ts = nowIso()
  const occasion: PromptOccasion = {
    id: newId(),
    prompt_id: promptId,
    occasion_index: nextIndex,
    label: input.label,
    scheduled_for: input.scheduled_for,
    window_closes_at: input.window_closes_at ?? null,
    created_at: ts,
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('prompt_occasions').insert(occasion).select().single()
    if (error) throw error
    return data
  }

  const db = getDb()
  db.prompt_occasions.push(occasion)
  persistDb(db)
  return occasion
}

export async function deletePromptOccasion(occasionId: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('prompt_occasions').delete().eq('id', occasionId)
    if (error) throw error
    return
  }
  const db = getDb()
  db.prompt_occasions = db.prompt_occasions.filter((o) => o.id !== occasionId)
  persistDb(db)
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

function sessionFromLocalDb(
  db: LocalDb,
  study: Study,
  participant: Participant,
  occasionId?: string,
): ParticipantSessionRow | null {
  if (occasionId) {
    const occasion = db.prompt_occasions.find((o) => o.id === occasionId)
    if (!occasion) return null
    const prompt = db.prompts.find((p) => p.id === occasion.prompt_id)
    if (!prompt) return null
    const survey = db.surveys.find((s) => s.id === prompt.survey_id && s.study_id === study.id)
    if (!survey) return null
    const items = db.survey_items
      .filter((i) => i.survey_id === survey.id)
      .sort((a, b) => a.display_order - b.display_order)
    return { study, participant, survey, items, prompt, occasion }
  }

  const survey = db.surveys
    .filter((s) => s.study_id === study.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))[0]
  if (!survey) return null
  const items = db.survey_items
    .filter((i) => i.survey_id === survey.id)
    .sort((a, b) => a.display_order - b.display_order)
  const prompt = db.prompts.find((p) => p.survey_id === survey.id && p.active)
  if (!prompt) return null
  const occasions = db.prompt_occasions
    .filter((o) => o.prompt_id === prompt.id)
    .sort((a, b) => a.occasion_index - b.occasion_index)
  if (occasions.length === 0) return null
  const today = new Date().toDateString()
  const occasion =
    occasions.find((o) =>
      o.scheduled_for ? new Date(o.scheduled_for).toDateString() === today : false,
    ) ?? occasions[0]
  return { study, participant, survey, items, prompt, occasion }
}

/** For a study, pick the first survey + current (or first) occasion for a participant link. */
export async function resolveParticipationSession(args: {
  studyId?: string
  participantCode: string
  occasionId?: string
}): Promise<ParticipantSessionRow | null> {
  if (isSupabaseConfigured && supabase) {
    return startSupabaseParticipantSession(args)
  }

  const matches = findLocalParticipantMatches(args.participantCode, args.studyId)
  if (matches.length === 0) return null
  if (!args.studyId && matches.length > 1) return null
  const { db, study, participant } = matches[0]
  return sessionFromLocalDb(db, study, participant, args.occasionId)
}

// ---- Responses ----

export async function saveResponse(args: {
  participant_id: string
  survey_item_id: string
  prompt_occasion_id: string
  answer: AnswerInput
}): Promise<Response> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('participant_save_response', {
      p_participant_id: args.participant_id,
      p_survey_item_id: args.survey_item_id,
      p_prompt_occasion_id: args.prompt_occasion_id,
      p_numeric_value: args.answer.numeric_value ?? null,
      p_text_value: args.answer.text_value ?? null,
      p_selected_values: args.answer.selected_values ?? null,
    })
    if (error) throw error
    return data as Response
  }

  const found = findOwnerDbByParticipant(args.participant_id)
  if (!found) throw new Error('Unknown participant')
  const { response } = upsertLocalResponse(found.ownerId, found.db, args)
  return response
}

export async function listResponsesForOccasion(
  participantId: string,
  occasionId: string,
): Promise<Response[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('participant_list_responses', {
      p_participant_id: participantId,
      p_occasion_id: occasionId,
    })
    if (error) throw error
    return (data ?? []) as Response[]
  }
  const found = findOwnerDbByParticipant(participantId)
  if (!found) return []
  return found.db.responses.filter(
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
  const ownerId = getActiveResearcherId()
  if (!ownerId) return
  localStorage.removeItem(dbStorageKey(ownerId))
  getDb()
}
