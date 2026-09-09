import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  SurveyItemRow,
  parseOptionsJson,
  type ItemEditDraft,
} from '../../components/researcher/SurveyItemRow'
import { VALIDATED_SCALES } from '../../data/scales'
import {
  addCustomItem,
  addValidatedScaleItems,
  deleteItem,
  getSurvey,
  listItems,
  listOccasions,
  listPrompts,
  moveItem,
  updateItem,
} from '../../lib/api'
import type {
  ContentLocale,
  ItemType,
  Survey,
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

const defaultLikertOptions = [
  {
    label: '전혀 동의하지 않는다',
    label_kr: '전혀 동의하지 않는다',
    label_en: 'Strongly disagree',
    value: 1,
  },
  {
    label: '동의하지 않는다',
    label_kr: '동의하지 않는다',
    label_en: 'Disagree',
    value: 2,
  },
  { label: '중립', label_kr: '중립', label_en: 'Neutral', value: 3 },
  { label: '동의한다', label_kr: '동의한다', label_en: 'Agree', value: 4 },
  {
    label: '매우 동의한다',
    label_kr: '매우 동의한다',
    label_en: 'Strongly agree',
    value: 5,
  },
]

export function SurveyEditorPage() {
  const { surveyId = '' } = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [items, setItems] = useState<SurveyItem[]>([])
  const [occasionCount, setOccasionCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [locale, setLocale] = useState<ContentLocale>('ko')
  const [pickerQuery, setPickerQuery] = useState('')

  const [itemText, setItemText] = useState('')
  const [itemTextEn, setItemTextEn] = useState('')
  const [variableName, setVariableName] = useState('')
  const [itemType, setItemType] = useState<ItemType>('likert')
  const [scaleName, setScaleName] = useState('')
  const [positionInScale, setPositionInScale] = useState('')
  const [subscale, setSubscale] = useState('')
  const [reverseScored, setReverseScored] = useState(false)
  const [optionsJson, setOptionsJson] = useState(
    JSON.stringify(defaultLikertOptions, null, 2),
  )

  async function refresh() {
    try {
      const s = await getSurvey(surveyId)
      setSurvey(s)
      setItems(await listItems(surveyId))
      const prompts = await listPrompts(surveyId)
      let count = 0
      for (const p of prompts) {
        count += (await listOccasions(p.id)).length
      }
      setOccasionCount(count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load survey')
    }
  }

  useEffect(() => {
    void refresh()
  }, [surveyId])

  async function handleAddScale(scaleId: string) {
    setBusy(true)
    setError(null)
    try {
      await addValidatedScaleItems(surveyId, scaleId)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add scale')
    } finally {
      setBusy(false)
    }
  }

  async function handleAddCustom(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      let response_options = null
      if (itemType !== 'open_text' && itemType !== 'visual_analog') {
        response_options = parseOptionsJson(optionsJson)
      }

      await addCustomItem({
        survey_id: surveyId,
        item_type: itemType,
        item_text: itemText.trim(),
        item_text_kr: itemText.trim(),
        item_text_en: itemTextEn.trim() || null,
        variable_name: variableName.trim(),
        response_options,
        scale_name: scaleName.trim() || null,
        position_in_scale: positionInScale ? Number(positionInScale) : null,
        reverse_scored: reverseScored,
        subscale: subscale.trim() || null,
        left_anchor: response_options?.[0]?.label ?? null,
        right_anchor: response_options?.at(-1)?.label ?? null,
        min_value:
          itemType === 'visual_analog'
            ? 0
            : (response_options?.[0]?.value ?? null),
        max_value:
          itemType === 'visual_analog'
            ? 100
            : (response_options?.at(-1)?.value ?? null),
        step_value: 1,
      })

      setItemText('')
      setItemTextEn('')
      setVariableName('')
      setScaleName('')
      setPositionInScale('')
      setSubscale('')
      setReverseScored(false)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not add item (check options JSON)',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    setBusy(true)
    setError(null)
    try {
      await deleteItem(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete item')
    } finally {
      setBusy(false)
    }
  }

  async function handleMove(id: string, direction: -1 | 1) {
    setBusy(true)
    setError(null)
    try {
      setItems(await moveItem(id, direction))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reorder item')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveEdit(id: string, draft: ItemEditDraft) {
    let response_options = null
    if (draft.item_type !== 'open_text' && draft.item_type !== 'visual_analog') {
      response_options = parseOptionsJson(draft.optionsJson)
    }
    await updateItem(id, {
      item_type: draft.item_type,
      item_text_kr: draft.item_text_kr.trim(),
      item_text_en: draft.item_text_en.trim() || null,
      item_text: draft.item_text_kr.trim(),
      variable_name: draft.variable_name.trim(),
      scale_name: draft.scale_name.trim() || null,
      scale_name_kr: draft.scale_name.trim() || null,
      scale_name_en: draft.scale_name.trim() || null,
      position_in_scale: draft.position_in_scale
        ? Number(draft.position_in_scale)
        : null,
      subscale: draft.subscale.trim() || null,
      reverse_scored: draft.reverse_scored,
      response_options,
      left_anchor: response_options?.[0]?.label ?? null,
      right_anchor: response_options?.at(-1)?.label ?? null,
      left_anchor_kr: response_options?.[0]?.label_kr ?? response_options?.[0]?.label ?? null,
      left_anchor_en: response_options?.[0]?.label_en ?? null,
      right_anchor_kr:
        response_options?.at(-1)?.label_kr ?? response_options?.at(-1)?.label ?? null,
      right_anchor_en: response_options?.at(-1)?.label_en ?? null,
      min_value: response_options?.[0]?.value ?? null,
      max_value: response_options?.at(-1)?.value ?? null,
    })
    await refresh()
  }

  const filteredScales = VALIDATED_SCALES.filter((scale) => {
    const q = pickerQuery.trim().toLowerCase()
    if (!q) return true
    return (
      scale.id.toLowerCase().includes(q) ||
      scale.shortName.toLowerCase().includes(q) ||
      scale.name_en.toLowerCase().includes(q) ||
      scale.name_kr.includes(pickerQuery.trim()) ||
      scale.source.toLowerCase().includes(q)
    )
  })

  if (!survey) {
    return <p className="text-sm text-ink-soft">Loading survey…</p>
  }

  return (
    <div className="space-y-8 animate-fade">
      <div>
        <Link
          to={`/researcher/studies/${survey.study_id}`}
          className="text-sm text-sea hover:underline"
        >
          ← Study
        </Link>
        <h2 className="mt-2 font-display text-2xl font-semibold text-sea-deep">
          {survey.title}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {items.length} items · {occasionCount} scheduled occasions · local demo
          compatible
        </p>
        {survey.instructions && (
          <p className="mt-3 whitespace-pre-wrap rounded-xl border border-sand/70 bg-white/50 px-3 py-2 text-sm text-ink-soft">
            {survey.instructions}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}

      {/* (1) Add validated scale */}
      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-sea-deep">
              Add validated scale
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              Pick one of the 8 instruments. All items are added with{' '}
              <code className="font-mono text-xs">variable_name</code>, scale,
              subscale, position, reverse flag, response options, and bilingual
              text pre-filled.
            </p>
          </div>
          <label className="block text-sm">
            <span className="sr-only">Search scales</span>
            <input
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Search scales…"
              className="w-48 rounded-xl border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-sea/40"
            />
          </label>
        </div>

        <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {filteredScales.map((scale) => {
            const alreadyAdded = items.some((i) => i.source_scale_id === scale.id)
            return (
              <li
                key={scale.id}
                className="rounded-xl border border-sand/70 bg-white/70 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-sea-deep">{scale.name_kr}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">{scale.name_en}</p>
                    <p className="mt-2 text-xs text-ink-soft">
                      {scale.items.length} items · {scale.responseScale.points}-point
                    </p>
                    <p className="mt-1 text-xs text-ink-soft/90">
                      Source: {scale.source}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy || alreadyAdded}
                    onClick={() => void handleAddScale(scale.id)}
                    className="shrink-0 rounded-xl bg-sea px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-45"
                  >
                    {alreadyAdded ? 'Already added' : 'Add scale'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* (2) Add custom item */}
      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5">
        <h3 className="font-display text-lg font-semibold text-sea-deep">
          Add custom item
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          Manually create a single item with the same export fields — for
          variables that have no validated scale.
        </p>
        <form onSubmit={handleAddCustom} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-sea-deep">text_kr</span>
            <textarea
              value={itemText}
              onChange={(e) => setItemText(e.target.value)}
              required
              rows={2}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 outline-none focus:border-sea/40"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-sea-deep">text_en</span>
            <textarea
              value={itemTextEn}
              onChange={(e) => setItemTextEn(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 outline-none focus:border-sea/40"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-sea-deep">variable_name</span>
            <input
              value={variableName}
              onChange={(e) => setVariableName(e.target.value)}
              required
              placeholder="e.g. mood_1"
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 font-mono text-sm outline-none focus:border-sea/40"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-sea-deep">item_type</span>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value as ItemType)}
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
              value={scaleName}
              onChange={(e) => setScaleName(e.target.value)}
              placeholder="optional"
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 outline-none focus:border-sea/40"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-sea-deep">position_in_scale</span>
            <input
              value={positionInScale}
              onChange={(e) => setPositionInScale(e.target.value)}
              type="number"
              min={1}
              placeholder="optional"
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 outline-none focus:border-sea/40"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-sea-deep">subscale</span>
            <input
              value={subscale}
              onChange={(e) => setSubscale(e.target.value)}
              placeholder="optional"
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 outline-none focus:border-sea/40"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reverseScored}
              onChange={(e) => setReverseScored(e.target.checked)}
              className="size-4 accent-sea"
            />
            <span className="font-medium text-sea-deep">reverse_scored</span>
          </label>
          {itemType !== 'open_text' && itemType !== 'visual_analog' && (
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-sea-deep">
                response_options (JSON)
              </span>
              <textarea
                value={optionsJson}
                onChange={(e) => setOptionsJson(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-sand bg-white px-3 py-2 font-mono text-xs outline-none focus:border-sea/40"
              />
            </label>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-sea px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Add custom item
            </button>
          </div>
        </form>
      </section>

      {/* Editable / reorderable item list */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-sea-deep">
              Survey items
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              Bilingual list — reorder with ↑↓, edit fields, or remove.
            </p>
          </div>
          <div
            className="inline-flex rounded-xl border border-sand bg-white/70 p-0.5 text-xs font-semibold"
            role="group"
            aria-label="Item language"
          >
            <button
              type="button"
              onClick={() => setLocale('ko')}
              className={[
                'rounded-[10px] px-3 py-1.5 transition',
                locale === 'ko' ? 'bg-sea text-white' : 'text-ink-soft',
              ].join(' ')}
            >
              한국어
            </button>
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={[
                'rounded-[10px] px-3 py-1.5 transition',
                locale === 'en' ? 'bg-sea text-white' : 'text-ink-soft',
              ].join(' ')}
            >
              English
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            No items yet. Add a validated scale or a custom item above.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {items.map((item, index) => (
              <SurveyItemRow
                key={item.id}
                item={item}
                index={index}
                total={items.length}
                locale={locale}
                busy={busy}
                onMove={(id, dir) => void handleMove(id, dir)}
                onDelete={(id) => void handleDelete(id)}
                onSave={handleSaveEdit}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
