import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ITEM_TYPES,
  SurveyItemRow,
  type ItemEditDraft,
} from '../../components/researcher/SurveyItemRow'
import {
  type ContinuousScaleConfig,
  type OptionDraft,
  ResponseOptionsEditor,
  draftsToOptions,
  PRESET_OPTIONS,
} from '../../components/researcher/ResponseOptionsEditor'
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
  ResponseOption,
  Survey,
  SurveyItem,
} from '../../types/database'

export function SurveyEditorPage() {
  const { surveyId = '' } = useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [items, setItems] = useState<SurveyItem[]>([])
  const [occasionCount, setOccasionCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [locale, setLocale] = useState<ContentLocale>('ko')
  const [pickerQuery, setPickerQuery] = useState('')

  // Custom item form state
  const [itemText, setItemText] = useState('')
  const [itemTextEn, setItemTextEn] = useState('')
  const [variableName, setVariableName] = useState('')
  const [itemType, setItemType] = useState<ItemType>('likert')
  const [scaleName, setScaleName] = useState('')
  const [positionInScale, setPositionInScale] = useState('')
  const [subscale, setSubscale] = useState('')
  const [reverseScored, setReverseScored] = useState(false)
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
  const [showAdvancedMeta, setShowAdvancedMeta] = useState(false)

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

      setItemText('')
      setItemTextEn('')
      setVariableName('')
      setScaleName('')
      setPositionInScale('')
      setSubscale('')
      setReverseScored(false)
      setShowAdvancedMeta(false)
      setOptions(PRESET_OPTIONS[0].options.map((o) => ({ ...o })))
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add custom item')
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
      position_in_scale: draft.position_in_scale
        ? Number(draft.position_in_scale)
        : null,
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
      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5">
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

      {/* (2) Add custom item */}
      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5">
        <div>
          <h3 className="font-display text-lg font-semibold text-sea-deep">
            Add custom item (직접 문항 추가)
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            Create custom single-choice, Likert, slider, or open-ended items with full export fields and response anchors.
          </p>
        </div>

        <form onSubmit={handleAddCustom} className="mt-5 space-y-4">
          {/* 1. Question Text */}
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-sea-deep">
                Question Text (Korean / 한국어 문항 내용) <span className="text-warn">*</span>
              </span>
              <textarea
                value={itemText}
                onChange={(e) => setItemText(e.target.value)}
                required
                rows={2}
                placeholder="예: 오늘 하루 전반적인 기분이 어떠셨나요?"
                className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-sea-deep">
                Question Text (English / 영어 번역, Optional)
              </span>
              <textarea
                value={itemTextEn}
                onChange={(e) => setItemTextEn(e.target.value)}
                rows={2}
                placeholder="e.g. How was your overall mood today?"
                className="w-full rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
              />
            </label>
          </div>

          {/* 2. Type & Variable Name */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-sea-deep">
                Question Type (응답 유형) <span className="text-warn">*</span>
              </span>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as ItemType)}
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
                value={variableName}
                onChange={(e) => setVariableName(e.target.value)}
                required
                placeholder="e.g. mood_daily, stress_level"
                className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 font-mono text-sm outline-none transition focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
              />
            </label>
          </div>

          {/* 3. Response Options Editor */}
          <ResponseOptionsEditor
            itemType={itemType}
            options={options}
            onOptionsChange={setOptions}
            continuousConfig={continuousConfig}
            onContinuousConfigChange={setContinuousConfig}
          />

          {/* 4. Research Metadata Collapsible */}
          <div className="rounded-xl border border-sand/70 bg-mist/20 p-3.5">
            <button
              type="button"
              onClick={() => setShowAdvancedMeta(!showAdvancedMeta)}
              className="flex w-full items-center justify-between text-xs font-semibold text-sea-deep"
            >
              <span>Research & Scoring Metadata (연구용 척도 메타데이터 — 선택사항)</span>
              <span>{showAdvancedMeta ? '▲ 접기' : '▼ 펼치기'}</span>
            </button>

            {showAdvancedMeta && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-ink-soft">
                    Scale Name (척도명)
                  </span>
                  <input
                    value={scaleName}
                    onChange={(e) => setScaleName(e.target.value)}
                    placeholder="e.g. Daily Affect"
                    className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none focus:border-sea/40"
                  />
                </label>

                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-ink-soft">
                    Subscale / Factor (하위척도)
                  </span>
                  <input
                    value={subscale}
                    onChange={(e) => setSubscale(e.target.value)}
                    placeholder="e.g. positive_mood"
                    className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none focus:border-sea/40"
                  />
                </label>

                <label className="block text-xs">
                  <span className="mb-1 block font-medium text-ink-soft">
                    Position in Scale (문항 번호)
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={positionInScale}
                    onChange={(e) => setPositionInScale(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none focus:border-sea/40"
                  />
                </label>

                <div className="sm:col-span-3 flex items-center gap-2 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-sea-deep cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reverseScored}
                      onChange={(e) => setReverseScored(e.target.checked)}
                      className="size-4 accent-sea rounded"
                    />
                    <span>Reverse scored item (역코딩 문항 — 채점 시 점수가 반전됨)</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-sea px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sea-bright disabled:opacity-50"
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
              Survey items ({items.length})
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
          <ol className="mt-3 space-y-2.5">
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
