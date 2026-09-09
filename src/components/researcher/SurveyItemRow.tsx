import { useState, type FormEvent } from 'react'
import { itemTextForLocale } from '../../data/scales'
import type {
  ContentLocale,
  ItemType,
  ResponseOption,
  SurveyItem,
} from '../../types/database'

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: 'likert', label: 'Likert' },
  { value: 'single_choice', label: 'Single choice' },
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'slider', label: 'Slider' },
  { value: 'visual_analog', label: 'Visual analog' },
  { value: 'open_text', label: 'Open text' },
]

export type ItemEditDraft = {
  item_text_kr: string
  item_text_en: string
  variable_name: string
  item_type: ItemType
  scale_name: string
  position_in_scale: string
  subscale: string
  reverse_scored: boolean
  optionsJson: string
}

export function draftFromItem(item: SurveyItem): ItemEditDraft {
  return {
    item_text_kr: item.item_text_kr || item.item_text || '',
    item_text_en: item.item_text_en || '',
    variable_name: item.variable_name,
    item_type: item.item_type,
    scale_name: item.scale_name || '',
    position_in_scale:
      item.position_in_scale == null ? '' : String(item.position_in_scale),
    subscale: item.subscale || '',
    reverse_scored: item.reverse_scored,
    optionsJson: JSON.stringify(item.response_options ?? [], null, 2),
  }
}

type SurveyItemRowProps = {
  item: SurveyItem
  index: number
  total: number
  locale: ContentLocale
  busy: boolean
  onMove: (id: string, direction: -1 | 1) => void
  onDelete: (id: string) => void
  onSave: (id: string, draft: ItemEditDraft) => Promise<void>
}

export function SurveyItemRow({
  item,
  index,
  total,
  locale,
  busy,
  onMove,
  onDelete,
  onSave,
}: SurveyItemRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<ItemEditDraft>(() => draftFromItem(item))
  const [saving, setSaving] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const primary = itemTextForLocale(item, locale)
  const secondary =
    locale === 'ko' ? item.item_text_en : item.item_text_kr || item.item_text

  function startEdit() {
    setDraft(draftFromItem(item))
    setLocalError(null)
    setEditing(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setLocalError(null)
    try {
      await onSave(item.id, draft)
      setEditing(false)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not save item')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <li className="rounded-2xl border border-sea/30 bg-white/80 px-4 py-4">
        <form onSubmit={handleSave} className="grid gap-3 sm:grid-cols-2">
          <p className="sm:col-span-2 text-xs font-semibold uppercase tracking-wide text-sea">
            Editing item {item.display_order}
          </p>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-sea-deep">text_kr</span>
            <textarea
              value={draft.item_text_kr}
              onChange={(e) => setDraft({ ...draft, item_text_kr: e.target.value })}
              required
              rows={2}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 outline-none focus:border-sea/40"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-sea-deep">text_en</span>
            <textarea
              value={draft.item_text_en}
              onChange={(e) => setDraft({ ...draft, item_text_en: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 outline-none focus:border-sea/40"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-sea-deep">variable_name</span>
            <input
              value={draft.variable_name}
              onChange={(e) => setDraft({ ...draft, variable_name: e.target.value })}
              required
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 font-mono text-sm outline-none focus:border-sea/40"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-sea-deep">item_type</span>
            <select
              value={draft.item_type}
              onChange={(e) =>
                setDraft({ ...draft, item_type: e.target.value as ItemType })
              }
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 outline-none focus:border-sea/40"
            >
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-sea-deep">scale</span>
            <input
              value={draft.scale_name}
              onChange={(e) => setDraft({ ...draft, scale_name: e.target.value })}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 outline-none focus:border-sea/40"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-sea-deep">position_in_scale</span>
            <input
              type="number"
              min={1}
              value={draft.position_in_scale}
              onChange={(e) =>
                setDraft({ ...draft, position_in_scale: e.target.value })
              }
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 outline-none focus:border-sea/40"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-sea-deep">subscale</span>
            <input
              value={draft.subscale}
              onChange={(e) => setDraft({ ...draft, subscale: e.target.value })}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 outline-none focus:border-sea/40"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.reverse_scored}
              onChange={(e) =>
                setDraft({ ...draft, reverse_scored: e.target.checked })
              }
              className="size-4 accent-sea"
            />
            <span className="font-medium text-sea-deep">reverse_scored</span>
          </label>
          {draft.item_type !== 'open_text' && draft.item_type !== 'visual_analog' && (
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-sea-deep">
                response_options (JSON)
              </span>
              <textarea
                value={draft.optionsJson}
                onChange={(e) => setDraft({ ...draft, optionsJson: e.target.value })}
                rows={5}
                className="w-full rounded-xl border border-sand bg-white px-3 py-2 font-mono text-xs outline-none focus:border-sea/40"
              />
            </label>
          )}
          {localError && (
            <p role="alert" className="sm:col-span-2 text-sm text-warn">
              {localError}
            </p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-sea px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className="rounded-xl border border-sand bg-white px-4 py-2 text-sm font-semibold text-sea-deep"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="rounded-2xl border border-sand/80 bg-white/60 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 flex-col gap-1 pt-0.5">
          <button
            type="button"
            aria-label="Move up"
            disabled={busy || index === 0}
            onClick={() => onMove(item.id, -1)}
            className="rounded-lg border border-sand bg-white px-2 py-1 text-xs text-sea-deep enabled:hover:border-sea/40 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={busy || index === total - 1}
            onClick={() => onMove(item.id, 1)}
            className="rounded-lg border border-sand bg-white px-2 py-1 text-xs text-sea-deep enabled:hover:border-sea/40 disabled:opacity-30"
          >
            ↓
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-sea-deep">
            <span className="mr-2 text-ink-soft">{item.display_order}.</span>
            {primary}
          </p>
          {secondary && secondary !== primary && (
            <p className="mt-1 text-xs leading-snug text-ink-soft">{secondary}</p>
          )}
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-ink-soft">
            <span>{item.variable_name}</span>
            <span>{item.item_type}</span>
            {(locale === 'ko'
              ? item.scale_name_kr || item.scale_name
              : item.scale_name_en || item.scale_name) && (
              <span>
                {locale === 'ko'
                  ? item.scale_name_kr || item.scale_name
                  : item.scale_name_en || item.scale_name}
              </span>
            )}
            {item.position_in_scale != null && <span>pos {item.position_in_scale}</span>}
            {item.subscale && <span>{item.subscale}</span>}
            {item.reverse_scored && (
              <span className="font-sans font-semibold text-warn">reverse</span>
            )}
            <span className="font-sans">{item.source}</span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={startEdit}
            className="text-xs font-medium text-sea hover:underline"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(item.id)}
            className="text-xs text-ink-soft hover:text-warn"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  )
}

export function parseOptionsJson(raw: string): ResponseOption[] | null {
  if (!raw.trim()) return null
  return JSON.parse(raw) as ResponseOption[]
}
