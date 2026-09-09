import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ITEM_TYPES,
  SurveyItemRow,
  type ItemEditDraft,
} from '../../components/researcher/SurveyItemRow'
import { CondensedItemRow } from '../../components/researcher/CondensedItemRow'
import {
  type ContinuousScaleConfig,
  type OptionDraft,
  ResponseOptionsEditor,
  draftsToOptions,
  PRESET_OPTIONS,
} from '../../components/researcher/ResponseOptionsEditor'
import { VALIDATED_SCALES } from '../../data/scales'
import {
  addCustomScaleWithItems,
  addValidatedScaleItems,
  deleteItem,
  getSurvey,
  listItems,
  listOccasions,
  listPrompts,
  reorderItems,
  updateItem,
} from '../../lib/api'
import type {
  ContentLocale,
  ItemType,
  ResponseOption,
  Survey,
  SurveyItem,
} from '../../types/database'

type CustomQuestionDraft = {
  id: string
  text_kr: string
  text_en: string
  variable_name: string
  reverse_scored: boolean
}

function createInitialQuestion(varPrefix = 'custom'): CustomQuestionDraft {
  return {
    id: crypto.randomUUID(),
    text_kr: '',
    text_en: '',
    variable_name: `${varPrefix}_1`,
    reverse_scored: false,
  }
}

export function SurveyEditorPage() {
  const { surveyId = '' } = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [items, setItems] = useState<SurveyItem[]>([])
  const [occasionCount, setOccasionCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [locale, setLocale] = useState<ContentLocale>('ko')
  const [viewMode, setViewMode] = useState<'detailed' | 'condensed'>('detailed')
  const [pickerQuery, setPickerQuery] = useState('')

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Custom scale & items form state
  const [scaleName, setScaleName] = useState('')
  const [subscale, setSubscale] = useState('')
  const [itemType, setItemType] = useState<ItemType>('likert')
  const [options, setOptions] = useState<OptionDraft[]>(() =>
    PRESET_OPTIONS[0].options.map((o) => ({ ...o })),
  )
  const [continuousConfig, setContinuousConfig] = useState<ContinuousScaleConfig>({
    min: 1,
    max: 7,
    step: 1,
    left_anchor_kr: '전혀 그렇지 않다',
    left_anchor_en: 'Not at all',
    right_anchor_kr: '매우 그렇다',
    right_anchor_en: 'Extremely',
  })
  const [questions, setQuestions] = useState<CustomQuestionDraft[]>([createInitialQuestion()])

  // Editing state when triggered from condensed view
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

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

  function addQuestionRow() {
    const slug = scaleName.trim()
      ? scaleName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 12)
      : 'item'
    const nextNum = questions.length + 1
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        text_kr: '',
        text_en: '',
        variable_name: `${slug}_${nextNum}`,
        reverse_scored: false,
      },
    ])
  }

  function updateQuestionRow(index: number, patch: Partial<CustomQuestionDraft>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    )
  }

  function removeQuestionRow(index: number) {
    if (questions.length <= 1) return
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleAddCustomScale(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      // Validate at least one question has text
      const validQuestions = questions.filter((q) => q.text_kr.trim().length > 0)
      if (validQuestions.length === 0) {
        throw new Error('Please enter at least one question text (한국어 문항 내용).')
      }

      let response_options: ResponseOption[] | null = null
      let left_anchor: string | null = null
      let right_anchor: string | null = null
      let left_anchor_kr: string | null = null
      let left_anchor_en: string | null = null
      let right_anchor_kr: string | null = null
      let right_anchor_en: string | null = null
      let min_value: number | null = null
      let max_value: number | null = null
      let step_value: number | null = null

      if (itemType === 'slider' || itemType === 'visual_analog') {
        min_value = continuousConfig.min
        max_value = continuousConfig.max
        step_value = continuousConfig.step
        left_anchor_kr = continuousConfig.left_anchor_kr.trim() || null
        left_anchor_en = continuousConfig.left_anchor_en.trim() || null
        right_anchor_kr = continuousConfig.right_anchor_kr.trim() || null
        right_anchor_en = continuousConfig.right_anchor_en.trim() || null
        left_anchor = left_anchor_kr || left_anchor_en
        right_anchor = right_anchor_kr || right_anchor_en
      } else if (itemType !== 'open_text') {
        response_options = draftsToOptions(options)
        if (response_options.length > 0) {
          min_value = response_options[0].value
          max_value = response_options[response_options.length - 1].value
          left_anchor = response_options[0].label
          right_anchor = response_options[response_options.length - 1].label
          left_anchor_kr = response_options[0].label_kr ?? response_options[0].label
          left_anchor_en = response_options[0].label_en ?? null
          right_anchor_kr =
            response_options[response_options.length - 1].label_kr ??
            response_options[response_options.length - 1].label
          right_anchor_en =
            response_options[response_options.length - 1].label_en ?? null
        }
      }

      await addCustomScaleWithItems({
        survey_id: surveyId,
        scale_name: scaleName.trim() || null,
        subscale: subscale.trim() || null,
        item_type: itemType,
        response_options,
        left_anchor,
        right_anchor,
        left_anchor_kr,
        left_anchor_en,
        right_anchor_kr,
        right_anchor_en,
        min_value,
        max_value,
        step_value,
        items: validQuestions.map((q) => ({
          item_text_kr: q.text_kr.trim(),
          item_text_en: q.text_en.trim() || null,
          variable_name: q.variable_name.trim(),
          reverse_scored: q.reverse_scored,
        })),
      })

      // Reset form
      setScaleName('')
      setSubscale('')
      setQuestions([createInitialQuestion()])
      setOptions(PRESET_OPTIONS[0].options.map((o) => ({ ...o })))
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add custom scale/items')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    setBusy(true)
    setError(null)
    try {
      await deleteItem(id)
      if (editingItemId === id) setEditingItemId(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete item')
    } finally {
      setBusy(false)
    }
  }

  // Drag and Drop handlers
  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    // set drag image / data
    e.dataTransfer.setData('text/plain', String(index))
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) {
      setDragOverIndex(index)
    }
  }

  function handleDragEnd() {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  async function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const reordered = [...items]
    const [moved] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, moved)

    // Update display order locally for zero-latency UI
    const updated = reordered.map((it, idx) => ({ ...it, display_order: idx + 1 }))
    setItems(updated)
    setDraggedIndex(null)
    setDragOverIndex(null)

    // Persist reordered array
    setBusy(true)
    try {
      const persisted = await reorderItems(surveyId, updated.map((i) => i.id))
      setItems(persisted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reorder items')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveEdit(id: string, draft: ItemEditDraft) {
    let response_options: ResponseOption[] | null = null
    let left_anchor: string | null = null
    let right_anchor: string | null = null
    let left_anchor_kr: string | null = null
    let left_anchor_en: string | null = null
    let right_anchor_kr: string | null = null
    let right_anchor_en: string | null = null
    let min_value: number | null = null
    let max_value: number | null = null
    let step_value: number | null = null

    if (draft.item_type === 'slider' || draft.item_type === 'visual_analog') {
      min_value = draft.continuousConfig.min
      max_value = draft.continuousConfig.max
      step_value = draft.continuousConfig.step
      left_anchor_kr = draft.continuousConfig.left_anchor_kr.trim() || null
      left_anchor_en = draft.continuousConfig.left_anchor_en.trim() || null
      right_anchor_kr = draft.continuousConfig.right_anchor_kr.trim() || null
      right_anchor_en = draft.continuousConfig.right_anchor_en.trim() || null
      left_anchor = left_anchor_kr || left_anchor_en
      right_anchor = right_anchor_kr || right_anchor_en
    } else if (draft.item_type !== 'open_text') {
      response_options = draftsToOptions(draft.options)
      if (response_options.length > 0) {
        min_value = response_options[0].value
        max_value = response_options[response_options.length - 1].value
        left_anchor = response_options[0].label
        right_anchor = response_options[response_options.length - 1].label
        left_anchor_kr = response_options[0].label_kr ?? response_options[0].label
        left_anchor_en = response_options[0].label_en ?? null
        right_anchor_kr =
          response_options[response_options.length - 1].label_kr ??
          response_options[response_options.length - 1].label
        right_anchor_en =
          response_options[response_options.length - 1].label_en ?? null
      }
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
      subscale: draft.subscale.trim() || null,
      reverse_scored: draft.reverse_scored,
      response_options,
      left_anchor,
      right_anchor,
      left_anchor_kr,
      left_anchor_en,
      right_anchor_kr,
      right_anchor_en,
      min_value,
      max_value,
      step_value,
    })
    setEditingItemId(null)
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
    <div className="space-y-8 animate-fade pb-16">
      {/* Header */}
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
          {items.length} items · {occasionCount} scheduled occasions · local demo compatible
        </p>
        {survey.instructions && (
          <p className="mt-3 whitespace-pre-wrap rounded-xl border border-sand/70 bg-white/50 px-3.5 py-2.5 text-sm text-ink-soft">
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
      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-sea-deep">
              Add validated scale (검증된 심리학 척도 추가)
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              Pick one of the 8 instruments. All items are added with variable names,
              subscales, reverse-scoring flags, response options, and bilingual text pre-filled.
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
                className="rounded-xl border border-sand/70 bg-white/70 p-4 transition hover:border-sea/30"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-sea-deep">{scale.name_kr}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">{scale.name_en}</p>
                    <p className="mt-2 text-xs text-ink-soft">
                      {scale.items.length} items · {scale.responseScale.points}-point scale
                    </p>
                    <p className="mt-1 text-xs text-ink-soft/90">
                      Source: {scale.source}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy || alreadyAdded}
                    onClick={() => void handleAddScale(scale.id)}
                    className="shrink-0 rounded-xl bg-sea px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sea-bright disabled:opacity-45"
                  >
                    {alreadyAdded ? 'Already added' : 'Add scale'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* (2) Custom Scale & Items Builder */}
      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5 shadow-sm">
        <div>
          <h3 className="font-display text-lg font-semibold text-sea-deep">
            Add custom scale & items (직접 척도 및 문항 추가)
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            Define a custom scale and response options once, then add one or multiple question items below. Response options will be shared across all items in this scale.
          </p>
        </div>

        <form onSubmit={handleAddCustomScale} className="mt-5 space-y-6">
          {/* STEP 1: Scale Metadata FIRST */}
          <div className="rounded-xl border border-sand/80 bg-white/75 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sea text-white text-[11px] font-bold">
                1
              </span>
              <h4 className="text-sm font-semibold text-sea-deep">
                Scale & Metadata (소속 척도 정보 설정)
              </h4>
            </div>
            <p className="text-xs text-ink-soft pl-7">
              Group these questions under a custom scale name (e.g. Daily Wellbeing, Stress Tracker).
            </p>

            <div className="grid gap-3 sm:grid-cols-2 pt-1 pl-7">
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-sea-deep">
                  Scale Name (소속 척도명 / 설문 영역명)
                </span>
                <input
                  value={scaleName}
                  onChange={(e) => setScaleName(e.target.value)}
                  placeholder="예: Daily Wellbeing, 일일 웰빙 척도"
                  className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none transition focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
                />
              </label>

              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-sea-deep">
                  Subscale / Factor (하위척도, Optional)
                </span>
                <input
                  value={subscale}
                  onChange={(e) => setSubscale(e.target.value)}
                  placeholder="예: positive_affect, mood"
                  className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none transition focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
                />
              </label>
            </div>
          </div>

          {/* STEP 2: Shared Response Format & Options */}
          <div className="rounded-xl border border-sand/80 bg-white/75 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sea text-white text-[11px] font-bold">
                2
              </span>
              <h4 className="text-sm font-semibold text-sea-deep">
                Shared Response Format (공통 응답 유형 및 선택지 설정)
              </h4>
            </div>
            <p className="text-xs text-ink-soft pl-7">
              All question items created in this section will share this response scale and options.
            </p>

            <div className="pl-7 space-y-4">
              <label className="block text-xs max-w-sm">
                <span className="mb-1 block font-semibold text-sea-deep">
                  Question Type (응답 유형) <span className="text-warn">*</span>
                </span>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as ItemType)}
                  className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none transition focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
                >
                  {ITEM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <ResponseOptionsEditor
                itemType={itemType}
                options={options}
                onOptionsChange={setOptions}
                continuousConfig={continuousConfig}
                onContinuousConfigChange={setContinuousConfig}
              />
            </div>
          </div>

          {/* STEP 3: Questions in this Scale */}
          <div className="rounded-xl border border-sand/80 bg-white/75 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sea text-white text-[11px] font-bold">
                  3
                </span>
                <h4 className="text-sm font-semibold text-sea-deep">
                  Questions in this Scale (척도에 포함될 문항 목록)
                </h4>
              </div>
              <span className="text-xs text-ink-soft font-medium">
                {questions.length} question{questions.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-ink-soft pl-7">
              Add one or more questions. Each question gets its own variable name for CSV data exports.
            </p>

            <div className="pl-7 space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-sand/70 bg-mist/20 p-3.5 space-y-2.5 transition hover:border-sea/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-sea">
                      Question #{idx + 1}
                    </span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestionRow(idx)}
                        className="text-xs text-ink-soft hover:text-warn transition"
                      >
                        Remove question
                      </button>
                    )}
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <label className="block text-xs sm:col-span-2">
                      <span className="mb-1 block font-medium text-sea-deep">
                        Question Text (Korean / 한국어 문항) <span className="text-warn">*</span>
                      </span>
                      <input
                        type="text"
                        value={q.text_kr}
                        onChange={(e) => updateQuestionRow(idx, { text_kr: e.target.value })}
                        required
                        placeholder="예: 오늘 하루 나는 즐겁고 행복했다."
                        className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none focus:border-sea/40"
                      />
                    </label>

                    <label className="block text-xs">
                      <span className="mb-1 block font-medium text-sea-deep">
                        Question Text (English / 영어 번역, Optional)
                      </span>
                      <input
                        type="text"
                        value={q.text_en}
                        onChange={(e) => updateQuestionRow(idx, { text_en: e.target.value })}
                        placeholder="e.g. I felt happy and joyful today."
                        className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none focus:border-sea/40"
                      />
                    </label>

                    <label className="block text-xs">
                      <span className="mb-1 block font-medium text-sea-deep">
                        Variable Name (변수명 / CSV 열 이름) <span className="text-warn">*</span>
                      </span>
                      <input
                        type="text"
                        value={q.variable_name}
                        onChange={(e) => updateQuestionRow(idx, { variable_name: e.target.value })}
                        required
                        placeholder="e.g. mood_1"
                        className="w-full rounded-lg border border-sand bg-white px-3 py-2 font-mono text-xs outline-none focus:border-sea/40"
                      />
                    </label>

                    <div className="sm:col-span-2 pt-0.5">
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-sea-deep cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.reverse_scored}
                          onChange={(e) =>
                            updateQuestionRow(idx, { reverse_scored: e.target.checked })
                          }
                          className="size-3.5 accent-sea rounded"
                        />
                        <span>Reverse scored (역코딩 문항)</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addQuestionRow}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-sea/50 bg-white/70 px-4 py-2 text-xs font-semibold text-sea transition hover:bg-mist/70 active:scale-[0.98]"
              >
                <span>+</span> Add another question to this scale (문항 추가)
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-sea px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sea-bright active:scale-[0.98] disabled:opacity-50"
            >
              Add {questions.length} Question{questions.length === 1 ? '' : 's'} to Survey
            </button>
          </div>
        </form>
      </section>

      {/* (3) Editable & Reorderable Survey Items List with Detailed & Condensed View Modes */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand/70 pb-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-sea-deep">
              Survey items ({items.length})
            </h3>
            <p className="text-xs text-ink-soft">
              Drag items (⠿) to rearrange question order. Click Edit to adjust wording or options.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div
              className="inline-flex rounded-xl border border-sand bg-white/80 p-0.5 text-xs font-semibold"
              role="group"
              aria-label="View format"
            >
              <button
                type="button"
                onClick={() => setViewMode('detailed')}
                className={[
                  'rounded-lg px-3 py-1.5 transition flex items-center gap-1.5',
                  viewMode === 'detailed' ? 'bg-sea text-white' : 'text-ink-soft hover:text-sea-deep',
                ].join(' ')}
              >
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('condensed')}
                className={[
                  'rounded-lg px-3 py-1.5 transition flex items-center gap-1.5',
                  viewMode === 'condensed' ? 'bg-sea text-white' : 'text-ink-soft hover:text-sea-deep',
                ].join(' ')}
                title="Condensed table view for bigger picture overview"
              >
                <span>Condensed View (한눈에 보기)</span>
              </button>
            </div>

            {/* Language Toggle */}
            <div
              className="inline-flex rounded-xl border border-sand bg-white/80 p-0.5 text-xs font-semibold"
              role="group"
              aria-label="Item language"
            >
              <button
                type="button"
                onClick={() => setLocale('ko')}
                className={[
                  'rounded-lg px-2.5 py-1.5 transition',
                  locale === 'ko' ? 'bg-sea text-white' : 'text-ink-soft hover:text-sea-deep',
                ].join(' ')}
              >
                한국어
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={[
                  'rounded-lg px-2.5 py-1.5 transition',
                  locale === 'en' ? 'bg-sea text-white' : 'text-ink-soft hover:text-sea-deep',
                ].join(' ')}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand bg-white/40 p-8 text-center">
            <p className="text-sm font-medium text-sea-deep">No questions in this survey yet.</p>
            <p className="mt-1 text-xs text-ink-soft">
              Choose a validated scale from above or create custom questions using the form.
            </p>
          </div>
        ) : viewMode === 'condensed' ? (
          /* Condensed Table View */
          <div className="overflow-x-auto rounded-2xl border border-sand/80 bg-white/70 shadow-sm">
            <table className="min-w-full text-left">
              <thead className="border-b border-sand/80 bg-mist/50 text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
                <tr>
                  <th className="py-2.5 pl-3 pr-1 w-16">#</th>
                  <th className="py-2.5 px-2 w-36">Variable / Scale</th>
                  <th className="py-2.5 px-2">Question Text ({locale === 'ko' ? '한국어' : 'English'})</th>
                  <th className="py-2.5 px-2 w-28">Type</th>
                  <th className="py-2.5 pl-2 pr-3 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <CondensedItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    locale={locale}
                    busy={busy}
                    isDragging={draggedIndex === index}
                    isDragOver={dragOverIndex === index}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    onEdit={(it) => {
                      setViewMode('detailed')
                      setEditingItemId(it.id)
                    }}
                    onDelete={(id) => void handleDelete(id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Detailed Card View */
          <ol className="space-y-2.5">
            {items.map((item, index) => (
              <SurveyItemRow
                key={item.id}
                item={item}
                index={index}
                total={items.length}
                locale={locale}
                busy={busy}
                isEditing={editingItemId === item.id}
                onStartEdit={() => setEditingItemId(item.id)}
                onCancelEdit={() => setEditingItemId(null)}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
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
