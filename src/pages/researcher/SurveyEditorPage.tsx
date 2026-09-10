import { useEffect, useMemo, useState, type FormEvent } from 'react'
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
import { useLocale } from '../../context/LocaleContext'
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

function createInitialQuestion(varPrefix = 'item'): CustomQuestionDraft {
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
  const { t, locale, setLocale } = useLocale()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [items, setItems] = useState<SurveyItem[]>([])
  const [occasionCount, setOccasionCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [viewMode, setViewMode] = useState<'detailed' | 'condensed'>('detailed')
  const [pickerQuery, setPickerQuery] = useState('')

  // State to track expanded APA citation dropdowns per scale ID
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({})

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
      setError(
        err instanceof Error
          ? err.message
          : t('설문지 정보를 불러오지 못했습니다.', 'Failed to load survey'),
      )
    }
  }

  useEffect(() => {
    void refresh()
  }, [surveyId])

  function toggleCitation(scaleId: string) {
    setExpandedCitations((prev) => ({
      ...prev,
      [scaleId]: !prev[scaleId],
    }))
  }

  async function handleAddScale(scaleId: string) {
    setBusy(true)
    setError(null)
    try {
      await addValidatedScaleItems(surveyId, scaleId)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('척도를 추가하지 못했습니다.', 'Could not add scale'),
      )
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
      const validQuestions = questions.filter((q) => q.text_kr.trim().length > 0)
      if (validQuestions.length === 0) {
        throw new Error(
          t(
            '최소 한 개 이상의 문항 내용을 입력해 주세요 (한국어 문항 내용).',
            'Please enter at least one question text (Korean question text).',
          ),
        )
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
      setError(
        err instanceof Error
          ? err.message
          : t('커스텀 척도 및 문항을 추가하지 못했습니다.', 'Could not add custom scale/items'),
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
      if (editingItemId === id) setEditingItemId(null)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('문항을 삭제하지 못했습니다.', 'Could not delete item'),
      )
    } finally {
      setBusy(false)
    }
  }

  // Drag and Drop handlers
  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
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

    const updated = reordered.map((it, idx) => ({ ...it, display_order: idx + 1 }))
    setItems(updated)
    setDraggedIndex(null)
    setDragOverIndex(null)

    setBusy(true)
    try {
      const persisted = await reorderItems(surveyId, updated.map((i) => i.id))
      setItems(persisted)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('문항 순서를 변경하지 못했습니다.', 'Could not reorder items'),
      )
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

  // Enhanced search filter across author, scale name, and keywords
  const filteredScales = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    if (!q) return VALIDATED_SCALES
    return VALIDATED_SCALES.filter((scale) => {
      const matchId = scale.id.toLowerCase().includes(q)
      const matchShort = scale.shortName.toLowerCase().includes(q)
      const matchNameEn = scale.name_en.toLowerCase().includes(q)
      const matchNameKr = scale.name_kr.toLowerCase().includes(q)
      const matchSource = scale.source.toLowerCase().includes(q)
      const matchCitation = scale.citation.toLowerCase().includes(q)
      const matchKeywords = scale.keywords?.some((k) => k.toLowerCase().includes(q))
      return (
        matchId ||
        matchShort ||
        matchNameEn ||
        matchNameKr ||
        matchSource ||
        matchCitation ||
        matchKeywords
      )
    })
  }, [pickerQuery])

  // Compute scale overview summary for this survey
  const scaleOverview = useMemo(() => {
    const map = new Map<
      string,
      {
        scaleKey: string
        displayName: string
        itemCount: number
        itemType: string
        subscales: Set<string>
        variableNames: string[]
        hasReverse: boolean
        isCustom: boolean
      }
    >()

    items.forEach((item) => {
      const scaleKey = item.scale_name || item.source_scale_id || (locale === 'ko' ? '기타 문항' : 'Custom Items')
      const isCustom = item.source !== 'validated_scale'

      let entry = map.get(scaleKey)
      if (!entry) {
        let displayName = scaleKey
        if (item.source_scale_id) {
          const matched = VALIDATED_SCALES.find((s) => s.id === item.source_scale_id)
          if (matched) {
            displayName = locale === 'ko' ? matched.name_kr : matched.name_en
          }
        }
        entry = {
          scaleKey,
          displayName,
          itemCount: 0,
          itemType: item.item_type,
          subscales: new Set(),
          variableNames: [],
          hasReverse: false,
          isCustom,
        }
        map.set(scaleKey, entry)
      }

      entry.itemCount += 1
      if (item.subscale) entry.subscales.add(item.subscale)
      entry.variableNames.push(item.variable_name)
      if (item.reverse_scored) entry.hasReverse = true
    })

    return Array.from(map.values())
  }, [items, locale])

  if (!survey) {
    return <p className="text-sm text-ink-soft">{t('설문지를 불러오는 중…', 'Loading survey…')}</p>
  }

  return (
    <div className="space-y-8 animate-fade pb-16">
      {/* Header */}
      <div>
        <Link
          to={`/researcher/studies/${survey.study_id}`}
          className="text-sm text-sea hover:underline"
        >
          {t('← 연구 화면으로', '← Study')}
        </Link>
        <h2 className="mt-2 font-display text-2xl font-semibold text-sea-deep">
          {survey.title}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {items.length} {t('개 문항', 'items')} · {occasionCount} {t('회차 발송 스케줄', 'scheduled occasions')} · {t('로컬 데모 모드 호환', 'local demo compatible')}
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

      {/* NEW: Overview of Scales Added to the Survey */}
      {items.length > 0 && (
        <section className="rounded-2xl border border-sand/80 bg-white/60 p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sea/20 text-sea font-bold text-xs">
                ✓
              </span>
              <h3 className="font-display text-base font-semibold text-sea-deep">
                {t('설문에 포함된 척도 개요 (Scales in this survey)', 'Overview of Scales in this Survey')}
              </h3>
            </div>
            <span className="text-xs font-semibold text-ink-soft">
              {scaleOverview.length} {t('개 척도 영역', 'scale domain(s)')} · {items.length} {t('문항 총계', 'total questions')}
            </span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 pt-1">
            {scaleOverview.map((scale, i) => (
              <div
                key={i}
                className="rounded-xl border border-sand/70 bg-white p-3.5 shadow-2xs space-y-1.5 transition hover:border-sea/40"
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="font-semibold text-xs text-sea-deep line-clamp-1">
                    {scale.displayName}
                  </p>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      scale.isCustom
                        ? 'bg-mist text-sea-deep'
                        : 'bg-sea/10 text-sea'
                    }`}
                  >
                    {scale.isCustom ? t('커스텀', 'Custom') : t('검증 척도', 'Validated')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-soft">
                  <span className="font-medium text-sea-deep">
                    {scale.itemCount} {t('문항', 'items')}
                  </span>
                  <span>·</span>
                  <span className="capitalize">{scale.itemType.replace('_', ' ')}</span>
                  {scale.hasReverse && (
                    <>
                      <span>·</span>
                      <span className="text-warn font-semibold">{t('역코딩 포함', 'Reverse scored')}</span>
                    </>
                  )}
                </div>

                {scale.subscales.size > 0 && (
                  <p className="text-[10px] text-ink-soft/80 truncate">
                    {t('하위요인', 'Subscales')}: {Array.from(scale.subscales).join(', ')}
                  </p>
                )}

                <p className="font-mono text-[10px] text-ink-soft/70 truncate pt-0.5">
                  {scale.variableNames.slice(0, 3).join(', ')}
                  {scale.variableNames.length > 3 ? ` … (+${scale.variableNames.length - 3})` : ''}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* (1) Add validated scale */}
      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-sea-deep">
              {t('검증된 심리학 척도 추가 (Add validated scale)', 'Add validated scale')}
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              {t(
                '심리학 검증 척도 8종 중 선택. 척도명, 연구 저자(Author), 관련 키워드로 검색할 수 있습니다.',
                'Choose from 8 validated instruments. Search by scale name, author, or construct keywords.',
              )}
            </p>
          </div>
          <label className="block text-sm">
            <span className="sr-only">{t('척도 검색', 'Search scales')}</span>
            <input
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder={t('척도명, 저자, 키워드 검색…', 'Search author, scale, keyword…')}
              className="w-64 rounded-xl border border-sand bg-white px-3.5 py-2 text-xs outline-none transition focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
            />
          </label>
        </div>

        <ul className="max-h-[30rem] space-y-3 overflow-y-auto pr-1">
          {filteredScales.length === 0 ? (
            <li className="p-8 text-center rounded-xl border border-dashed border-sand bg-white/60 text-xs text-ink-soft">
              {t('검색 조건과 일치하는 척도가 없습니다.', 'No matching validated scales found.')}
            </li>
          ) : (
            filteredScales.map((scale) => {
              const alreadyAdded = items.some((i) => i.source_scale_id === scale.id)
              const isCitationOpen = Boolean(expandedCitations[scale.id])

              return (
                <li
                  key={scale.id}
                  className="rounded-xl border border-sand/70 bg-white/80 p-4 transition hover:border-sea/40 shadow-2xs space-y-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-sea-deep">
                        {scale.name_kr}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {scale.name_en}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                        <span className="rounded bg-mist px-2 py-0.5 font-semibold text-sea-deep text-[11px]">
                          {scale.items.length} {t('문항', 'items')} · {scale.responseScale.points}{t('점 척도', '-point scale')}
                        </span>
                        <span className="text-xs text-ink-soft/90">
                          {t('출처/저자', 'Source')}: <span className="font-medium text-sea-deep">{scale.source}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        disabled={busy || alreadyAdded}
                        onClick={() => void handleAddScale(scale.id)}
                        className="rounded-xl bg-sea px-4 py-2 text-xs font-semibold text-white transition hover:bg-sea-bright disabled:opacity-45 shadow-xs"
                      >
                        {alreadyAdded ? t('추가됨', 'Already added') : t('척도 추가', 'Add scale')}
                      </button>
                    </div>
                  </div>

                  {/* APA Citation Toggle Dropdown */}
                  <div className="border-t border-sand/50 pt-2">
                    <button
                      type="button"
                      onClick={() => toggleCitation(scale.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sea hover:text-sea-bright transition underline-offset-2 hover:underline"
                    >
                      <span>{isCitationOpen ? '▲' : '▼'}</span>
                      <span>show apa citation</span>
                    </button>

                    {isCitationOpen && (
                      <div className="mt-2 rounded-lg border border-sand/60 bg-mist/30 p-3 text-xs text-ink-soft animate-fade leading-relaxed">
                        <p className="font-semibold text-sea-deep text-[11px] uppercase tracking-wider mb-1">
                          APA 7th Edition Citation
                        </p>
                        <p className="font-sans italic select-all">
                          {scale.citation}
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </section>

      {/* (2) Custom Scale & Items Builder: Questions in this Scale is STEP 2 */}
      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5 shadow-sm">
        <div>
          <h3 className="font-display text-lg font-semibold text-sea-deep">
            {t('직접 척도 및 문항 추가 (Add custom scale & items)', 'Add custom scale & items')}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            {t(
              '커스텀 척도명을 지정하고, 척도에 속할 여러 문항을 한 번에 작성한 뒤 공통 응답 선택지를 적용할 수 있습니다.',
              'Define a custom scale and name it first, then add multiple questions under it with shared response options.',
            )}
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
                {t('소속 척도 정보 설정 (Scale & Metadata)', 'Scale & Metadata')}
              </h4>
            </div>
            <p className="text-xs text-ink-soft pl-7">
              {t(
                '문항들을 묶을 척도명 또는 설문 영역명을 입력하세요 (예: Daily Wellbeing, 일일 웰빙 척도).',
                'Group these questions under a custom scale name (e.g. Daily Wellbeing, Stress Tracker).',
              )}
            </p>

            <div className="grid gap-3 sm:grid-cols-2 pt-1 pl-7">
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-sea-deep">
                  {t('척도명 (Scale Name)', 'Scale Name')}
                </span>
                <input
                  value={scaleName}
                  onChange={(e) => setScaleName(e.target.value)}
                  placeholder={t('예: 일일 웰빙 척도 / Daily Wellbeing', 'e.g. Daily Wellbeing')}
                  className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none transition focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
                />
              </label>

              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-sea-deep">
                  {t('하위척도 (Subscale / Factor, Optional)', 'Subscale / Factor (Optional)')}
                </span>
                <input
                  value={subscale}
                  onChange={(e) => setSubscale(e.target.value)}
                  placeholder={t('예: positive_affect, mood', 'e.g. positive_affect')}
                  className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none transition focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
                />
              </label>
            </div>
          </div>

          {/* STEP 2: Questions in this Scale (NOW STEP 2!) */}
          <div className="rounded-xl border border-sand/80 bg-white/75 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sea text-white text-[11px] font-bold">
                  2
                </span>
                <h4 className="text-sm font-semibold text-sea-deep">
                  {t('척도에 포함될 문항 목록 (Questions in this scale)', 'Questions in this scale')}
                </h4>
              </div>
              <span className="text-xs text-ink-soft font-medium">
                {questions.length} {t('개 문항 작성 중', 'question(s)')}
              </span>
            </div>
            <p className="text-xs text-ink-soft pl-7">
              {t(
                '이 척도에 포함될 문항을 한 개 이상 입력하세요. 각 문항마다 고유 변수명(CSV 열 이름)이 자동 생성됩니다.',
                'Add one or more questions under this scale. Each question gets its own variable name for CSV exports.',
              )}
            </p>

            <div className="pl-7 space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-sand/70 bg-mist/20 p-3.5 space-y-2.5 transition hover:border-sea/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-sea">
                      {t('문항', 'Question')} #{idx + 1}
                    </span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestionRow(idx)}
                        className="text-xs text-ink-soft hover:text-warn transition"
                      >
                        {t('문항 삭제', 'Remove question')}
                      </button>
                    )}
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <label className="block text-xs sm:col-span-2">
                      <span className="mb-1 block font-medium text-sea-deep">
                        {t('한국어 문항 내용 (Korean Text)', 'Question Text (Korean)')} <span className="text-warn">*</span>
                      </span>
                      <input
                        type="text"
                        value={q.text_kr}
                        onChange={(e) => updateQuestionRow(idx, { text_kr: e.target.value })}
                        required
                        placeholder={t('예: 오늘 하루 나는 즐겁고 행복했다.', 'e.g. I felt happy today.')}
                        className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none focus:border-sea/40"
                      />
                    </label>

                    <label className="block text-xs">
                      <span className="mb-1 block font-medium text-sea-deep">
                        {t('영어 번역 문항 (English Translation, Optional)', 'Question Text (English, Optional)')}
                      </span>
                      <input
                        type="text"
                        value={q.text_en}
                        onChange={(e) => updateQuestionRow(idx, { text_en: e.target.value })}
                        placeholder="e.g. I felt joyful and happy today."
                        className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none focus:border-sea/40"
                      />
                    </label>

                    <label className="block text-xs">
                      <span className="mb-1 block font-medium text-sea-deep">
                        {t('변수명 (Variable Name / CSV Column)', 'Variable Name')} <span className="text-warn">*</span>
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
                        <span>{t('역코딩 문항 (Reverse scored item)', 'Reverse scored item')}</span>
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
                <span>+</span> {t('이 척도에 문항 추가 (Add another question)', 'Add another question to this scale')}
              </button>
            </div>
          </div>

          {/* STEP 3: Shared Response Format & Options (NOW STEP 3!) */}
          <div className="rounded-xl border border-sand/80 bg-white/75 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sea text-white text-[11px] font-bold">
                3
              </span>
              <h4 className="text-sm font-semibold text-sea-deep">
                {t('공통 응답 유형 및 선택지 설정 (Shared Response Format & Options)', 'Shared Response Format & Options')}
              </h4>
            </div>
            <p className="text-xs text-ink-soft pl-7">
              {t(
                '위에서 작성한 모든 문항에 동일하게 적용되는 공통 응답 선택지 및 척도 유형입니다.',
                'All question items above will share this response scale and options.',
              )}
            </p>

            <div className="pl-7 space-y-4">
              <label className="block text-xs max-w-sm">
                <span className="mb-1 block font-semibold text-sea-deep">
                  {t('응답 유형 (Question Type)', 'Question Type')} <span className="text-warn">*</span>
                </span>
                <select
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as ItemType)}
                  className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none transition focus:border-sea/50 focus:ring-4 focus:ring-sea/10"
                >
                  {ITEM_TYPES.map((tItem) => (
                    <option key={tItem.value} value={tItem.value}>
                      {tItem.label}
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

          <div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-sea px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sea-bright active:scale-[0.98] disabled:opacity-50"
            >
              {t(`설문에 ${questions.length}개 문항 일괄 추가하기`, `Add ${questions.length} Question${questions.length === 1 ? '' : 's'} to Survey`)}
            </button>
          </div>
        </form>
      </section>

      {/* (3) Editable & Reorderable Survey Items List with Detailed & Condensed View Modes */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand/70 pb-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-sea-deep">
              {t(`설문 문항 목록 (${items.length}개)`, `Survey items (${items.length})`)}
            </h3>
            <p className="text-xs text-ink-soft">
              {t(
                '⠿ 아이콘을 드래그하여 문항 순서를 재배치할 수 있습니다. Edit 버튼으로 문항과 선택지를 수정하세요.',
                'Drag items (⠿) to rearrange question order. Click Edit to adjust wording or options.',
              )}
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
                  viewMode === 'detailed' ? 'bg-sea text-white shadow-xs' : 'text-ink-soft hover:text-sea-deep',
                ].join(' ')}
              >
                <span>{t('카드 뷰', 'Cards')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('condensed')}
                className={[
                  'rounded-lg px-3 py-1.5 transition flex items-center gap-1.5',
                  viewMode === 'condensed' ? 'bg-sea text-white shadow-xs' : 'text-ink-soft hover:text-sea-deep',
                ].join(' ')}
                title={t('전체 문항을 컴팩트한 표 형태로 한눈에 조망', 'Condensed table view for bigger picture overview')}
              >
                <span>{t('한눈에 보기 (Condensed)', 'Condensed View')}</span>
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
                  locale === 'ko' ? 'bg-sea text-white shadow-xs' : 'text-ink-soft hover:text-sea-deep',
                ].join(' ')}
              >
                한국어
              </button>
              <button
                type="button"
                onClick={() => setLocale('en')}
                className={[
                  'rounded-lg px-2.5 py-1.5 transition',
                  locale === 'en' ? 'bg-sea text-white shadow-xs' : 'text-ink-soft hover:text-sea-deep',
                ].join(' ')}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand bg-white/40 p-8 text-center">
            <p className="text-sm font-medium text-sea-deep">
              {t('아직 설문에 등록된 문항이 없습니다.', 'No questions in this survey yet.')}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {t(
                '위의 검증된 척도를 추가하거나 직접 문항을 작성해 보세요.',
                'Choose a validated scale from above or create custom questions using the form.',
              )}
            </p>
          </div>
        ) : viewMode === 'condensed' ? (
          /* Condensed Table View */
          <div className="overflow-x-auto rounded-2xl border border-sand/80 bg-white/70 shadow-sm">
            <table className="min-w-full text-left">
              <thead className="border-b border-sand/80 bg-mist/50 text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
                <tr>
                  <th className="py-2.5 pl-3 pr-1 w-16">#</th>
                  <th className="py-2.5 px-2 w-36">{t('변수명 / 척도', 'Variable / Scale')}</th>
                  <th className="py-2.5 px-2">{t('문항 내용', 'Question Text')} ({locale === 'ko' ? '한국어' : 'English'})</th>
                  <th className="py-2.5 px-2 w-28">{t('응답 유형', 'Type')}</th>
                  <th className="py-2.5 pl-2 pr-3 text-right w-24">{t('관리', 'Actions')}</th>
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
