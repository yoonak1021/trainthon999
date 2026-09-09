import type { AnswerInput, SurveyItem } from '../../types/database'

export function isAnswerComplete(
  item: SurveyItem,
  answer: AnswerInput | undefined,
): boolean {
  if (!answer) return false
  switch (item.item_type) {
    case 'open_text':
      return Boolean(answer.text_value && answer.text_value.trim().length > 0)
    case 'multiple_choice':
      return Boolean(answer.selected_values && answer.selected_values.length > 0)
    default:
      return answer.numeric_value !== null && answer.numeric_value !== undefined
  }
}
