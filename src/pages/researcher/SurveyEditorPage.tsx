import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { VALIDATED_SCALES } from '../../data/scales'
import {
  addCustomItem,
  addValidatedScaleItems,
  deleteItem,
  getSurvey,
  listItems,
  listOccasions,
  listPrompts,
} from '../../lib/api'
import type { ItemType, Survey, SurveyItem } from '../../types/database'

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: 'likert', label: 'Likert' },
  { value: 'single_choice', label: 'Single choice' },
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'slider', label: 'Slider' },
  { value: 'visual_analog', label: 'Visual analog' },
  { value: 'open_text', label: 'Open text' },
]

const defaultLikertOptions = [
  { label: 'Strongly disagree', value: 1 },
  { label: 'Disagree', value: 2 },
  { label: 'Neutral', value: 3 },
  { label: 'Agree', value: 4 },
  { label: 'Strongly agree', value: 5 },
]

export function SurveyEditorPage() {
  const { surveyId = '' } = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [items, setItems] = useState<SurveyItem[]>([])
  const [occasionCount, setOccasionCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Custom item form
  const [itemText, setItemText] = useState('')
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
          value: number
        }[]
      }

      await addCustomItem({
        survey_id: surveyId,
        item_type: itemType,
        item_text: itemText.trim(),
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
          <p className="mt-3 rounded-xl border border-sand/70 bg-white/50 px-3 py-2 text-sm text-ink-soft">
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
        <h3 className="font-display text-lg font-semibold text-sea-deep">
          Add validated scale
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          Pre-fills items with variable names, anchors, and reverse-scoring flags.
        </p>
        <ul className="mt-4 space-y-3">
          {VALIDATED_SCALES.map((scale) => (
            <li
              key={scale.id}
              className="flex flex-col gap-3 rounded-xl border border-sand/70 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-sea-deep">
                  {scale.shortName}{' '}
                  <span className="font-normal text-ink-soft">— {scale.fullName}</span>
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  {scale.items.length} items · reverse-scored:{' '}
                  {scale.items
                    .filter((i) => i.reverseScored)
                    .map((i) => i.position)
                    .join(', ') || 'none'}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleAddScale(scale.id)}
                className="rounded-xl bg-sea px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Add {scale.shortName}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5">
        <h3 className="font-display text-lg font-semibold text-sea-deep">
          Add custom item
        </h3>
        <form onSubmit={handleAddCustom} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-sea-deep">Item text</span>
            <textarea
              value={itemText}
              onChange={(e) => setItemText(e.target.value)}
              required
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
                response_options (JSON: label + numeric value)
              </span>
              <textarea
                value={optionsJson}
                onChange={(e) => setOptionsJson(e.target.value)}
                rows={6}
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
        <h3 className="font-display text-lg font-semibold text-sea-deep">Items</h3>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            No items yet. Add PSS-10 or a custom item above.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-sand/80 bg-white/60 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium leading-snug text-sea-deep">
                      <span className="mr-2 text-ink-soft">{item.display_order}.</span>
                      {item.item_text}
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-ink-soft">
                      <span>{item.variable_name}</span>
                      <span>{item.item_type}</span>
                      {item.scale_name && <span>{item.scale_name}</span>}
                      {item.position_in_scale != null && (
                        <span>pos {item.position_in_scale}</span>
                      )}
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
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
