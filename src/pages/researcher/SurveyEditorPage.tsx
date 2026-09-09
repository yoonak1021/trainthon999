import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  VALIDATED_SCALES,
  itemTextForLocale,
} from '../../data/scales'
import {
  addCustomItem,
  addValidatedScaleItems,
  deleteItem,
  getSurvey,
  listItems,
  listOccasions,
  listPrompts,
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
  { label: '전혀 동의하지 않는다', label_kr: '전혀 동의하지 않는다', label_en: 'Strongly disagree', value: 1 },
  { label: '동의하지 않는다', label_kr: '동의하지 않는다', label_en: 'Disagree', value: 2 },
  { label: '중립', label_kr: '중립', label_en: 'Neutral', value: 3 },
  { label: '동의한다', label_kr: '동의한다', label_en: 'Agree', value: 4 },
  { label: '매우 동의한다', label_kr: '매우 동의한다', label_en: 'Strongly agree', value: 5 },
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

  // Custom item form
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
        response_options = JSON.parse(optionsJson) as {
          label: string
          label_kr?: string
          label_en?: string
          value: number
        }[]
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
    try {
      await deleteItem(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete item')
    } finally {
      setBusy(false)
    }
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
          {items.length} items · {occasionCount} scheduled occasions
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

      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-sea-deep">
              Choose from validated scales
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              Selecting a scale pre-fills all items (variable names, reverse
              flags, subscales, bilingual text). Mix freely with custom items.
            </p>
          </div>
          <label className="block text-sm">
            <span className="sr-only">Search scales</span>
            <input
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Search 8 scales…"
              className="w-48 rounded-xl border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-sea/40"
            />
          </label>
        </div>

        <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {filteredScales.map((scale) => {
            const reversePositions = scale.items
              .filter((i) => i.reverseScored)
              .map((i) => i.position)
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
                      <span className="font-mono">{scale.id}</span>
                      {' · '}
                      {scale.items.length} items · {scale.responseScale.points}-point
                      {' · '}
                      reverse:{' '}
                      {reversePositions.length > 0
                        ? reversePositions.join(', ')
                        : 'none'}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft/90">{scale.source}</p>
                    {!scale.responseScale.verified && (
                      <p className="mt-1 text-[11px] text-warn">
                        Anchors unverified — confirm lab protocol before data collection.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busy || alreadyAdded}
                    onClick={() => void handleAddScale(scale.id)}
                    className="shrink-0 rounded-xl bg-sea px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-45"
                  >
                    {alreadyAdded ? 'Added' : `Add ${scale.shortName}`}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5">
        <h3 className="font-display text-lg font-semibold text-sea-deep">
          Create a custom item manually
        </h3>
        <form onSubmit={handleAddCustom} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-sea-deep">
              Item text (Korean / default)
            </span>
            <textarea
              value={itemText}
              onChange={(e) => setItemText(e.target.value)}
              required
              rows={2}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2 outline-none focus:border-sea/40"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-sea-deep">
              Item text (English, optional)
            </span>
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
            <span className="mb-1 block font-medium text-sea-deep">scale_name</span>
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
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
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
                response_options (JSON: label / label_kr / label_en + value)
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

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-sea-deep">Items</h3>
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
            No items yet. Choose a validated scale or add a custom item above.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {items.map((item) => {
              const primary = itemTextForLocale(item, locale)
              const secondary =
                locale === 'ko'
                  ? item.item_text_en
                  : item.item_text_kr || item.item_text
              return (
                <li
                  key={item.id}
                  className="rounded-2xl border border-sand/80 bg-white/60 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium leading-snug text-sea-deep">
                        <span className="mr-2 text-ink-soft">{item.display_order}.</span>
                        {primary}
                      </p>
                      {secondary && secondary !== primary && (
                        <p className="mt-1 text-xs leading-snug text-ink-soft">
                          {secondary}
                        </p>
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
                        {item.position_in_scale != null && (
                          <span>pos {item.position_in_scale}</span>
                        )}
                        {item.subscale && <span>{item.subscale}</span>}
                        {item.reverse_scored && (
                          <span className="font-sans font-semibold text-warn">
                            reverse
                          </span>
                        )}
                        <span className="font-sans">{item.source}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete(item.id)}
                      className="shrink-0 text-xs text-ink-soft hover:text-warn"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
