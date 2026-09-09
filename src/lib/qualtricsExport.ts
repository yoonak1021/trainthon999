import type { EditableScale } from '../types'

/**
 * Qualtrics Advanced Format (Simple TXT) export.
 * @see https://www.qualtrics.com/support/survey-platform/survey-module/survey-tools/import-and-export-surveys/
 */
export function toQualtricsAdvancedFormat(scales: EditableScale[]): string {
  const lines: string[] = ['[[AdvancedFormat]]', '']

  for (const scale of scales) {
    const blockName = sanitizeBlockName(scale.shortName || scale.name)
    lines.push(`[[Block:${blockName}]]`, '')

    // Scale instructions as descriptive text
    if (scale.instructions.trim()) {
      lines.push('[[Question:DB]]')
      lines.push(`${scale.shortName}: ${scale.instructions.trim()}`)
      lines.push('')
    }

    const reverseItems = scale.items.filter((i) => i.reverseScored)
    if (reverseItems.length > 0) {
      const nums = reverseItems.map((i) => i.number).join(', ')
      lines.push('[[Question:DB]]')
      lines.push(
        `Scoring note (${scale.shortName}): Reverse-scored items — ${nums}. Recode these items before summing (e.g., for a 0–4 scale: 0↔4, 1↔3).`,
      )
      lines.push('')
    }

    for (const item of scale.items) {
      const tag = `${scale.shortName.replace(/\s+/g, '')}_Q${item.number}${item.reverseScored ? '_R' : ''}`
      lines.push('[[Question:MC:SingleAnswer:Horizontal]]')
      lines.push(`[[ID: ${tag}]]`)
      const reverseNote = item.reverseScored ? ' [Reverse-scored]' : ''
      lines.push(`${item.number}. ${item.text.trim()}${reverseNote}`)
      lines.push('[[Choices]]')
      for (const option of scale.responseOptions) {
        lines.push(option.label)
      }
      lines.push('')
    }
  }

  return lines.join('\n').trimEnd() + '\n'
}

function sanitizeBlockName(name: string): string {
  return name.replace(/[\[\]]/g, '').trim() || 'Scale'
}

export function downloadQualtricsTxt(scales: EditableScale[], filename?: string) {
  const content = toQualtricsAdvancedFormat(scales)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `survey-scales-${dateStamp()}.txt`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function dateStamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}
