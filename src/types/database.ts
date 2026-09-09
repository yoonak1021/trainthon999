/**
 * Domain types mirroring supabase/schema.sql.
 * Keep these aligned when evolving the schema.
 */

export type ItemType =
  | 'single_choice'
  | 'multiple_choice'
  | 'likert'
  | 'slider'
  | 'visual_analog'
  | 'open_text'

export type ItemSource = 'validated_scale' | 'custom'

export type ResponseOption = {
  label: string
  value: number
}

export type Study = {
  id: string
  owner_id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

export type Participant = {
  id: string
  study_id: string
  participant_code: string
  condition_label: string | null
  active: boolean
  enrolled_at: string
  created_at: string
}

export type Survey = {
  id: string
  study_id: string
  title: string
  description: string | null
  instructions: string | null
  created_at: string
  updated_at: string
}

export type SurveyItem = {
  id: string
  survey_id: string
  item_type: ItemType
  item_text: string
  display_order: number
  response_options: ResponseOption[] | null
  min_value: number | null
  max_value: number | null
  step_value: number | null
  left_anchor: string | null
  right_anchor: string | null
  variable_name: string
  scale_name: string | null
  position_in_scale: number | null
  reverse_scored: boolean
  subscale: string | null
  source: ItemSource
  source_scale_id: string | null
  created_at: string
}

export type Prompt = {
  id: string
  survey_id: string
  label: string
  schedule_summary: string | null
  cadence: string | null
  duration_days: number | null
  starts_at: string | null
  ends_at: string | null
  active: boolean
  created_at: string
}

export type PromptOccasion = {
  id: string
  prompt_id: string
  occasion_index: number
  label: string | null
  scheduled_for: string | null
  created_at: string
}

export type Response = {
  id: string
  participant_id: string
  survey_item_id: string
  prompt_occasion_id: string
  numeric_value: number | null
  text_value: string | null
  selected_values: number[] | null
  answered_at: string
  created_at: string
  updated_at: string
}

/** Answer payload written from the participant UI. */
export type AnswerInput = {
  numeric_value?: number | null
  text_value?: string | null
  selected_values?: number[] | null
}

/** Library definition for a validated scale (hardcoded for now). */
export type ValidatedScaleItem = {
  position: number
  text: string
  reverseScored: boolean
  variableSuffix: string
  subscale?: string
}

export type ValidatedScale = {
  id: string
  shortName: string
  fullName: string
  instructions: string
  citation: string
  itemType: ItemType
  responseOptions: ResponseOption[]
  leftAnchor?: string
  rightAnchor?: string
  items: ValidatedScaleItem[]
}

export type ResponseExportRow = Response & {
  participant_code: string
  variable_name: string
  scale_name: string | null
  position_in_scale: number | null
  reverse_scored: boolean
  occasion_index: number
  occasion_label: string | null
  item_text: string
}
