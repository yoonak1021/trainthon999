import { useState, type FormEvent } from 'react'
import { itemTextForLocale } from '../../data/scales'
import type {
  ContentLocale,
  ItemType,
  SurveyItem,
} from '../../types/database'
import {
  type ContinuousScaleConfig,
  type OptionDraft,
  ResponseOptionsEditor,
  optionsToDrafts,
} from './ResponseOptionsEditor'

export const ITEM_TYPES: { value: ItemType; label: string; description: string }[] = [
  {
    value: 'likert',
    label: 'Likert Scale (리커트 척도)',
    description: 'Numbered rating options (e.g. 1–5 or 1–7)',
  },
  {
    value: 'single_choice',
    label: 'Single Choice (단일 선택)',
    description: 'Select one option from a list',
  },
  {
    value: 'multiple_choice',
    label: 'Multiple Choice (다중 선택)',
    description: 'Select one or more options',
  },
  {
    value: 'slider',
    label: 'Slider (슬라이더)',
    description: 'Interactive drag slider with numbered increments',
  },
  {
    value: 'visual_analog',
    label: 'Visual Analog Scale (VAS)',
    description: 'Continuous rating scale (e.g. 0 to 100)',
  },
  {
    value: 'open_text',
    label: 'Open Text (주관식 서술형)',
    description: 'Multi-line freeform text answer',
  },
]

export type ItemEditDraft = {
  item_text_kr: string
  item_text_en: string
  variable_name: string
  item_type: ItemType
  scale_name: string
  subscale: string
  reverse_scored: boolean
  options: OptionDraft[]
  continuousConfig: ContinuousScaleConfig
}

export function draftFromItem(item: SurveyItem): ItemEditDraft {
  const isVas = item.item_type === 'visual_analog'
  return {
    item_text_kr: item.item_text_kr || item.item_text || '',
    item_text_en: item.item_text_en || '',
    variable_name: item.variable_name,
    item_type: item.item_type,
    scale_name: item.scale_name || '',
    subscale: item.subscale || '',
    reverse_scored: item.reverse_scored,
    options: optionsToDrafts(item.response_options),
    continuousConfig: {
      min: item.min_value ?? (isVas ? 0 : 1),
      max: item.max_value ?? (isVas ? 100 : 10),
      step: item.step_value ?? 1,
      left_anchor_kr: item.left_anchor_kr || item.left_anchor || '',
      left_anchor_en: item.left_anchor_en || '',
      right_anchor_kr: item.right_anchor_kr || item.right_anchor || '',
      right_anchor_en: item.right_anchor_en || '',
    },
  }
}

type SurveyItemRowProps = {
  item: SurveyItem
  index: number
  total: number
  locale: ContentLocale
  busy: boolean
  isEditing?: boolean
  onStartEdit?: () => void
  onCancelEdit?: () => void
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart?: (e: React.DragEvent, index: number) => void
  onDragOver?: (e: React.DragEvent, index: number) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent, index: number) => void
  onDelete: (id: string) => void
  onSave: (id: string, draft: ItemEditDraft) => Promise<void>
}

export function SurveyItemRow({
  item,
  index,
  locale,
  busy,
  isEditing,
  onStartEdit,
  onCancelEdit,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onDelete,
  onSave,
}: SurveyItemRowProps) {
  const [internalEditing, setInternalEditing] = useState(false)
  const isCurrentlyEditing = isEditing !== undefined ? isEditing : internalEditing

  const [draft, setDraft] = useState<ItemEditDraft>(() => draftFromItem(item))
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const primary = itemTextForLocale(item, locale)
  const secondary =
    locale === 'ko' ? item.item_text_en : item.item_text_kr || item.item_text

  function startEdit() {
    setDraft(draftFromItem(item))
    setLocalError(null)
    if (onStartEdit) {
      onStartEdit()
    } else {
      setInternalEditing(true)
    }
  }

  function cancelEdit() {
    if (onCancelEdit) {
      onCancelEdit()
    } else {
      setInternalEditing(false)
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setLocalError(null)
    try {
      await onSave(item.id, draft)
      if (onCancelEdit) onCancelEdit()
      else setInternalEditing(false)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not save item')
    } finally {
      setSaving(false)
    }
  }

  if (isCurrentlyEditing) {
    return (
      <li className="rounded-2xl border-2 border-sea/40 bg-white p-5 shadow-md animate-fade">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center justify-between border-b border-sand/70 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sea">
                Editing Item #{item.display_order}
              </p>
              <h4 className="font-display text-base font-semibold text-sea-deep">
                문항 정보 및 척도 설정 수정
              </h4>
            </div>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs font-medium text-ink-soft hover:text-sea-deep"
            >
              Cancel
            </button>
          </div>

          {/* 1. Research & Scale Metadata FIRST */}
          <div className="rounded-xl border border-sand/80 bg-mist/25 p-3.5">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-sea-deep">
              1. Scale & Scoring Metadata (척도 및 메타데이터)
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs">
                <span className="mb-1 block font-medium text-ink-soft">
                  Scale Name (소속 척도명)
                </span>
                <input
                  value={draft.scale_name}
                  onChange={(e) => setDraft({ ...draft, scale_name: e.target.value })}
                  placeholder="e.g. SWLS, Life Satisfaction"
                  className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none focus:border-sea/40"
                />
              </label>

              <label className="block text-xs">
                <span className="mb-1 block font-medium text-ink-soft">
                  Subscale / Factor (하위척도, Optional)
                </span>
                <input
                  value={draft.subscale}
                  onChange={(e) => setDraft({ ...draft, subscale: e.target.value })}
                  placeholder="e.g. positive_affect"
                  className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none focus:border-sea/40"
                />
              </label>

              <div className="sm:col-span-2 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-sea-deep cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.reverse_scored}
                    onChange={(e) =>
                      setDraft({ ...draft, reverse_scored: e.target.checked })
                    }
                    className="size-4 accent-sea rounded"
                  />
                  <span>Reverse scored item (역코딩 문항 — 채점 시 점수가 반전됨)</span>
                </label>
              </div>
            </div>
          </div>

          {/* 2. Question Text */}
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-sea-deep">
                2. Question Text (Korean / 한국어 문항 내용) <span className="text-warn">*</span>
              </span>
              <textarea
                value={draft.item_text_kr}
                onChange={(e) => setDraft({ ...draft, item_text_kr: e.target.value })}
                required
                rows={2}
                placeholder="예: 나는 내 삶에 만족한다."
                className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-sea-deep">
                Question Text (English / 영어 번역, Optional)
              </span>
              <textarea
                value={draft.item_text_en}
                onChange={(e) => setDraft({ ...draft, item_text_en: e.target.value })}
                rows={2}
                placeholder="e.g. I am satisfied with my life."
                className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
              />
            </label>
          </div>

          {/* 3. Type & Variable Name */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-sea-deep">
                Question Type (응답 유형) <span className="text-warn">*</span>
              </span>
              <select
                value={draft.item_type}
                onChange={(e) => {
                  const newType = e.target.value as ItemType
                  setDraft({ ...draft, item_type: newType })
                }}
                className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-sea-deep">
                Export Variable Name (변수명 / CSV 열 이름) <span className="text-warn">*</span>
              </span>
              <input
                value={draft.variable_name}
                onChange={(e) => setDraft({ ...draft, variable_name: e.target.value })}
                required
                placeholder="e.g. mood_1, swls_3"
                className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 font-mono text-sm outline-none transition focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
              />
            </label>
          </div>

          {/* 4. Response Options Editor */}
          <ResponseOptionsEditor
            itemType={draft.item_type}
            options={draft.options}
            onOptionsChange={(opts) => setDraft({ ...draft, options: opts })}
            continuousConfig={draft.continuousConfig}
            onContinuousConfigChange={(cfg) => setDraft({ ...draft, continuousConfig: cfg })}
          />

          {localError && (
            <p role="alert" className="text-sm text-warn">
              {localError}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-sea px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sea-bright disabled:opacity-50"
            >
              {saving ? 'Saving changes…' : 'Save changes'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={cancelEdit}
              className="rounded-xl border border-sand bg-white px-4 py-2.5 text-sm font-semibold text-sea-deep hover:bg-mist/40"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li
      draggable={!busy && Boolean(onDragStart)}
      onDragStart={onDragStart ? (e) => onDragStart(e, index) : undefined}
      onDragOver={onDragOver ? (e) => onDragOver(e, index) : undefined}
      onDragEnd={onDragEnd}
      onDrop={onDrop ? (e) => onDrop(e, index) : undefined}
      className={[
        'group rounded-2xl border bg-white/75 p-4 transition select-none',
        isDragging ? 'opacity-30 border-dashed border-sea bg-mist/50' : 'border-sand/80 hover:border-sea/40 hover:bg-white shadow-sm',
        isDragOver ? 'border-t-4 border-t-sea bg-sea/5 scale-[1.01]' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div
          className="flex shrink-0 items-center justify-center pt-0.5 text-ink-soft/40 group-hover:text-sea cursor-grab active:cursor-grabbing p-1 hover:bg-mist rounded transition"
          title="Drag up or down to reorder"
        >
          <svg width="14" height="18" viewBox="0 0 14 20" fill="currentColor">
            <circle cx="4" cy="4" r="1.8" />
            <circle cx="10" cy="4" r="1.8" />
            <circle cx="4" cy="10" r="1.8" />
            <circle cx="10" cy="10" r="1.8" />
            <circle cx="4" cy="16" r="1.8" />
            <circle cx="10" cy="16" r="1.8" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sea text-xs font-mono">
              #{item.display_order}
            </span>
            <p className="text-sm font-semibold leading-snug text-sea-deep">
              {primary}
            </p>
          </div>

          {secondary && secondary !== primary && (
            <p className="mt-1 text-xs leading-snug text-ink-soft pl-5">{secondary}</p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px] text-ink-soft">
            <span className="rounded bg-mist px-2 py-0.5 font-semibold text-sea-deep">
              {item.variable_name}
            </span>
            <span className="font-sans capitalize text-ink-soft">
              {item.item_type.replace('_', ' ')}
            </span>
            {(locale === 'ko'
              ? item.scale_name_kr || item.scale_name
              : item.scale_name_en || item.scale_name) && (
              <span className="font-sans text-ink-soft">
                Scale: {locale === 'ko'
                  ? item.scale_name_kr || item.scale_name
                  : item.scale_name_en || item.scale_name}
              </span>
            )}
            {item.subscale && (
              <span className="font-sans text-ink-soft">
                Subscale: {item.subscale}
              </span>
            )}
            {item.reverse_scored && (
              <span className="rounded bg-warn-bg px-2 py-0.5 font-sans font-semibold text-warn">
                Reverse Scored
              </span>
            )}
            <span className="font-sans text-ink-soft/70">
              {item.source === 'validated_scale' ? 'Validated' : 'Custom'}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={startEdit}
            className="rounded-lg border border-sand/80 bg-white px-2.5 py-1 text-xs font-semibold text-sea transition hover:border-sea/40 hover:bg-mist/50"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(item.id)}
            className="px-2 py-1 text-xs text-ink-soft/80 transition hover:text-warn"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  )
}
