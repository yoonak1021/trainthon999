import { useState, useMemo } from 'react'
import { useLocale } from '../../context/LocaleContext'
import {
  addPromptOccasion,
  createPromptWithOccasions,
  deletePrompt,
  deletePromptOccasion,
  updatePrompt,
  updatePromptOccasion,
} from '../../lib/api'
import type {
  Participant,
  Prompt,
  PromptCadence,
  PromptOccasion,
  Survey,
} from '../../types/database'

type PromptScheduleManagerProps = {
  studyId: string
  surveys: Survey[]
  participants: Participant[]
  promptInfo: { prompt: Prompt; occasions: PromptOccasion[] }[]
  onRefresh: () => Promise<void>
}

type CadencePreset = {
  id: PromptCadence
  name_kr: string
  name_en: string
  icon: string
  description_kr: string
  description_en: string
  defaultDurationDays: number
  defaultTimesPerDay: number
  defaultTimes: string[]
  defaultWindowMinutes: number
}

const CADENCE_PRESETS: CadencePreset[] = [
  {
    id: 'daily_diary',
    name_kr: '일일 다이어리 (Daily Diary)',
    name_en: 'Daily Diary (1 prompt/day)',
    icon: '🌅',
    description_kr: '매일 지정된 시간(예: 저녁 21:00)에 1회 발송하여 하루를 회고하는 종단 연구',
    description_en: '1 prompt sent daily at a fixed time (e.g. 21:00) for daily reflection studies',
    defaultDurationDays: 14,
    defaultTimesPerDay: 1,
    defaultTimes: ['21:00'],
    defaultWindowMinutes: 1440, // 24 hours
  },
  {
    id: 'ema_momentary',
    name_kr: '경험표집 / EMA (순간 측정)',
    name_en: 'EMA / Experience Sampling (Multiple/day)',
    icon: '📱',
    description_kr: '하루 3~5회 지정/무작위 시간대에 발송하여 일상 속 순간 정서와 행동을 측정',
    description_en: '3-5 prompts per day across morning/afternoon/evening with short expiration windows',
    defaultDurationDays: 7,
    defaultTimesPerDay: 3,
    defaultTimes: ['09:30', '14:30', '20:30'],
    defaultWindowMinutes: 60, // 1 hour
  },
  {
    id: 'weekly_wave',
    name_kr: '주간 / 월간 추적 (Longitudinal Waves)',
    name_en: 'Weekly / Monthly Longitudinal Waves',
    icon: '📅',
    description_kr: '매주 또는 매월 특정 요일에 1회씩 정기적으로 발송 (예: 8주간 매주 월요일)',
    description_en: 'Regular follow-up waves sent once per week or month over extended periods',
    defaultDurationDays: 56, // 8 weeks
    defaultTimesPerDay: 1,
    defaultTimes: ['10:00'],
    defaultWindowMinutes: 2880, // 48 hours
  },
  {
    id: 'pre_post',
    name_kr: '사전-사후-추적 검사 (Pre-Post & Follow-up)',
    name_en: 'Pre-Post & Follow-up (T1, T2, T3)',
    icon: '🎯',
    description_kr: '처치 전 사전(T1), 처치 직후 사후(T2), 장기 추적(T3) 등 시점별 고정 측정',
    description_en: 'Fixed evaluation timepoints (T1 Baseline, T2 Post-test, T3 Follow-up)',
    defaultDurationDays: 30,
    defaultTimesPerDay: 1,
    defaultTimes: ['09:00'],
    defaultWindowMinutes: 4320, // 3 days
  },
  {
    id: 'custom',
    name_kr: '사용자 지정 스케줄 (Custom)',
    name_en: 'Custom Schedule',
    icon: '🛠',
    description_kr: '원하는 날짜, 시간, 회차 라벨을 자유롭게 직접 구성',
    description_en: 'Customize dates, times, and wave labels freely',
    defaultDurationDays: 7,
    defaultTimesPerDay: 1,
    defaultTimes: ['12:00'],
    defaultWindowMinutes: 1440,
  },
]

export function PromptScheduleManager({
  studyId,
  surveys,
  participants,
  promptInfo,
  onRefresh,
}: PromptScheduleManagerProps) {
  const { t, locale } = useLocale()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [expandedPromptIds, setExpandedPromptIds] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copiedOccasionId, setCopiedOccasionId] = useState<string | null>(null)
  const [selectedParticipantCode, setSelectedParticipantCode] = useState<string>(
    participants[0]?.participant_code || 'DEMO01',
  )

  // Occasion Inline Editing State
  const [editingOccasionId, setEditingOccasionId] = useState<string | null>(null)
  const [editingLabel, setEditingLabel] = useState('')
  const [editingDateStr, setEditingDateStr] = useState('')

  // Creation Form State
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>(
    surveys[0]?.id || '',
  )
  const [selectedCadence, setSelectedCadence] = useState<PromptCadence>('daily_diary')
  const [scheduleLabel, setScheduleLabel] = useState('')
  const [durationDays, setDurationDays] = useState(14)
  const [deliveryTimes, setDeliveryTimes] = useState<string[]>(['21:00'])
  const [responseWindowMinutes, setResponseWindowMinutes] = useState(1440)
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })

  // Pre-Post Custom Waves state
  const [prePostWaves, setPrePostWaves] = useState<
    Array<{ label: string; offsetDays: number; time: string }>
  >([
    { label: 'T1 - 사전 검사 (Baseline)', offsetDays: 0, time: '09:00' },
    { label: 'T2 - 사후 검사 (Post-test)', offsetDays: 14, time: '09:00' },
    { label: 'T3 - 추적 검사 (Follow-up)', offsetDays: 30, time: '09:00' },
  ])

  // Active Preset
  const activePreset = useMemo(
    () => CADENCE_PRESETS.find((p) => p.id === selectedCadence) || CADENCE_PRESETS[0],
    [selectedCadence],
  )

  function handleSelectPreset(preset: CadencePreset) {
    setSelectedCadence(preset.id)
    setDurationDays(preset.defaultDurationDays)
    setDeliveryTimes([...preset.defaultTimes])
    setResponseWindowMinutes(preset.defaultWindowMinutes)

    const targetSurvey = surveys.find((s) => s.id === selectedSurveyId)
    const surveyTitle = targetSurvey?.title || 'Survey'
    const presetName = locale === 'ko' ? preset.name_kr.split(' (')[0] : preset.name_en.split(' (')[0]
    setScheduleLabel(`${surveyTitle} - ${presetName}`)
  }

  // Calculate preview occasions based on current settings
  const previewOccasions = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`)
    if (isNaN(start.getTime())) return []

    if (selectedCadence === 'pre_post') {
      return prePostWaves.map((wave, idx) => {
        const d = new Date(start)
        d.setDate(d.getDate() + wave.offsetDays)
        const [hh, mm] = wave.time.split(':').map(Number)
        d.setHours(hh || 9, mm || 0, 0, 0)
        const close = new Date(d)
        close.setMinutes(close.getMinutes() + responseWindowMinutes)
        return {
          occasion_index: idx + 1,
          label: wave.label,
          scheduled_for: d.toISOString(),
          window_closes_at: close.toISOString(),
        }
      })
    }

    if (selectedCadence === 'weekly_wave') {
      const weeks = Math.max(1, Math.round(durationDays / 7))
      const out = []
      const [hh, mm] = (deliveryTimes[0] || '10:00').split(':').map(Number)
      for (let w = 0; w < weeks; w++) {
        const d = new Date(start)
        d.setDate(d.getDate() + w * 7)
        d.setHours(hh, mm, 0, 0)
        const close = new Date(d)
        close.setMinutes(close.getMinutes() + responseWindowMinutes)
        out.push({
          occasion_index: w + 1,
          label: `Week ${w + 1} (Wave ${w + 1})`,
          scheduled_for: d.toISOString(),
          window_closes_at: close.toISOString(),
        })
      }
      return out
    }

    // Daily or EMA
    const out = []
    let occasionCounter = 1
    for (let day = 0; day < durationDays; day++) {
      for (let tIdx = 0; tIdx < deliveryTimes.length; tIdx++) {
        const timeStr = deliveryTimes[tIdx] || '12:00'
        const [hh, mm] = timeStr.split(':').map(Number)
        const d = new Date(start)
        d.setDate(d.getDate() + day)
        d.setHours(hh || 0, mm || 0, 0, 0)
        const close = new Date(d)
        close.setMinutes(close.getMinutes() + responseWindowMinutes)

        const timeSlotLabel =
          deliveryTimes.length > 1
            ? `Day ${day + 1} (${timeStr})`
            : `Day ${day + 1}`

        out.push({
          occasion_index: occasionCounter++,
          label: timeSlotLabel,
          scheduled_for: d.toISOString(),
          window_closes_at: close.toISOString(),
        })
      }
    }
    return out
  }, [
    startDate,
    selectedCadence,
    durationDays,
    deliveryTimes,
    responseWindowMinutes,
    prePostWaves,
  ])

  function toggleExpandPrompt(id: string) {
    setExpandedPromptIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleTogglePromptActive(prompt: Prompt) {
    setBusy(true)
    setActionError(null)
    try {
      await updatePrompt(prompt.id, { active: !prompt.active })
      await onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update prompt')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeletePrompt(promptId: string) {
    if (!confirm(t('이 발송 스케줄과 모든 생성된 회차를 삭제하시겠습니까?', 'Delete this schedule and all its occasions?'))) {
      return
    }
    setBusy(true)
    setActionError(null)
    try {
      await deletePrompt(promptId)
      await onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete prompt')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSurveyId) {
      setActionError(t('설문지를 선택해 주세요.', 'Please select a survey.'))
      return
    }
    if (previewOccasions.length === 0) {
      setActionError(t('생성할 회차가 없습니다.', 'No occasions to generate.'))
      return
    }

    setBusy(true)
    setActionError(null)
    try {
      const startIso = previewOccasions[0]?.scheduled_for || new Date().toISOString()
      const summary = `${activePreset.name_kr.split(' (')[0]} · ${previewOccasions.length}회차 (${durationDays}일간)`

      await createPromptWithOccasions({
        survey_id: selectedSurveyId,
        label: scheduleLabel.trim() || `${activePreset.name_kr} 스케줄`,
        schedule_summary: summary,
        cadence: selectedCadence,
        duration_days: durationDays,
        times_per_day: deliveryTimes.length,
        delivery_times: deliveryTimes,
        response_window_minutes: responseWindowMinutes,
        starts_at: startIso,
        generated_occasions: previewOccasions,
      })

      setShowCreateModal(false)
      await onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create schedule')
    } finally {
      setBusy(false)
    }
  }

  function copyParticipantOccasionLink(occasionId: string) {
    const code = selectedParticipantCode.trim().toUpperCase() || 'DEMO01'
    const origin = window.location.origin
    const url = `${origin}/p?code=${encodeURIComponent(code)}&study=${studyId}&occasion=${occasionId}`
    navigator.clipboard.writeText(url)
    setCopiedOccasionId(occasionId)
    setTimeout(() => setCopiedOccasionId(null), 2500)
  }

  async function handleAddSingleOccasion(promptId: string) {
    const label = prompt(t('새 회차 명칭을 입력하세요 (예: Day 15, T4 추가):', 'Enter label for new occasion:'), 'Extra Wave')
    if (!label) return
    const now = new Date()
    now.setDate(now.getDate() + 1)
    setBusy(true)
    try {
      await addPromptOccasion(promptId, {
        label: label.trim(),
        scheduled_for: now.toISOString(),
      })
      await onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not add occasion')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteSingleOccasion(occasionId: string) {
    if (!confirm(t('이 회차를 삭제하시겠습니까?', 'Delete this occasion?'))) return
    setBusy(true)
    try {
      await deletePromptOccasion(occasionId)
      await onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete occasion')
    } finally {
      setBusy(false)
    }
  }

  function startEditOccasion(occ: PromptOccasion) {
    setEditingOccasionId(occ.id)
    setEditingLabel(occ.label || '')
    const d = occ.scheduled_for ? new Date(occ.scheduled_for) : new Date()
    setEditingDateStr(d.toISOString().slice(0, 16))
  }

  async function saveEditOccasion(occId: string) {
    setBusy(true)
    try {
      const parsedDate = new Date(editingDateStr)
      await updatePromptOccasion(occId, {
        label: editingLabel.trim(),
        scheduled_for: isNaN(parsedDate.getTime()) ? undefined : parsedDate.toISOString(),
      })
      setEditingOccasionId(null)
      await onRefresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update occasion')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-sand/80 bg-white/60 p-5 shadow-sm animate-fade">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sea text-white text-xs font-bold">
              🗓
            </span>
            <h3 className="font-display text-lg font-semibold text-sea-deep">
              {t('발송 스케줄 & 종단 회차 관리 (Delivery Schedules & Waves)', 'Prompt Schedules & Waves')}
            </h3>
          </div>
          <p className="text-xs text-ink-soft mt-1">
            {t(
              '일일 다이어리(Daily Diary), 경험표집(EMA), 주간/월간 추적, 사전-사후 검사 등 종단 연구에 필요한 발송 주기와 회차별 링크를 관리합니다.',
              'Manage delivery schedules, EMA/ESM intervals, response expiration windows, and wave-specific participant links.',
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (surveys.length === 0) {
              alert(t('먼저 설문지를 생성해 주세요.', 'Please create a survey first.'))
              return
            }
            setSelectedSurveyId(surveys[0].id)
            handleSelectPreset(CADENCE_PRESETS[0])
            setShowCreateModal(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sea px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sea-bright active:scale-[0.98]"
        >
          <span>+</span>
          <span>{t('새 발송 스케줄 만들기', 'New Delivery Schedule')}</span>
        </button>
      </div>

      {actionError && (
        <p role="alert" className="text-xs text-warn bg-warn-bg/80 border border-warn/20 p-2.5 rounded-lg">
          {actionError}
        </p>
      )}

      {/* Participant Selector for direct link generation */}
      {promptInfo.length > 0 && participants.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sand/70 bg-white/80 p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sea-deep">
              {t('회차별 참가자 링크 생성용 코드:', 'Generate link for participant:')}
            </span>
            <select
              value={selectedParticipantCode}
              onChange={(e) => setSelectedParticipantCode(e.target.value)}
              className="rounded-lg border border-sand bg-white px-2.5 py-1 text-xs font-mono font-semibold text-sea-deep outline-none focus:border-sea/40"
            >
              {participants.map((p) => (
                <option key={p.id} value={p.participant_code}>
                  {p.participant_code} {p.condition_label ? `(${p.condition_label})` : ''}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[11px] text-ink-soft">
            {t('선택된 참가자 코드로 각 회차 전용 URL이 생성됩니다.', 'Selected code is embedded into wave direct links.')}
          </span>
        </div>
      )}

      {/* Schedules List */}
      {promptInfo.length === 0 ? (
        <div className="rounded-xl border border-dashed border-sand bg-white/40 p-6 text-center text-xs text-ink-soft">
          <p className="font-medium text-sea-deep">{t('등록된 발송 스케줄이 없습니다.', 'No delivery schedules yet.')}</p>
          <p className="mt-1">{t('위의 "+ 새 발송 스케줄 만들기" 버튼을 눌러 일일 다이어리 또는 EMA 일정을 설정하세요.', 'Click "+ New Delivery Schedule" to configure daily diary or EMA intervals.')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promptInfo.map(({ prompt, occasions }) => {
            const isExpanded = Boolean(expandedPromptIds[prompt.id])
            const targetSurvey = surveys.find((s) => s.id === prompt.survey_id)
            const matchedPreset = CADENCE_PRESETS.find((p) => p.id === prompt.cadence)
            const windowHrs = prompt.response_window_minutes
              ? Math.round((prompt.response_window_minutes / 60) * 10) / 10
              : null

            return (
              <div
                key={prompt.id}
                className="rounded-xl border border-sand/80 bg-white shadow-2xs transition hover:border-sea/40"
              >
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base">{matchedPreset?.icon || '📅'}</span>
                      <h4 className="font-semibold text-sm text-sea-deep">
                        {prompt.label}
                      </h4>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          prompt.active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-sand text-ink-soft'
                        }`}
                      >
                        {prompt.active ? t('활성 (Active)', 'Active') : t('일시정지 (Paused)', 'Paused')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                      <span>
                        {t('설문지:', 'Survey:')} <strong className="text-sea-deep">{targetSurvey?.title || 'Survey'}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        {occasions.length} {t('회차 (Waves)', 'occasions')}
                      </span>
                      {prompt.times_per_day && prompt.times_per_day > 1 && (
                        <>
                          <span>·</span>
                          <span>{t(`하루 ${prompt.times_per_day}회`, `${prompt.times_per_day}x daily`)}</span>
                        </>
                      )}
                      {windowHrs && (
                        <>
                          <span>·</span>
                          <span>{t(`응답 유효시간 ${windowHrs}시간`, `Window: ${windowHrs}h`)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleTogglePromptActive(prompt)}
                      className="rounded-lg border border-sand bg-white px-2.5 py-1.5 text-xs font-semibold text-sea-deep hover:bg-mist/50 transition"
                    >
                      {prompt.active ? t('일시정지', 'Pause') : t('활성화', 'Resume')}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpandPrompt(prompt.id)}
                      className="rounded-lg border border-sand bg-white px-3 py-1.5 text-xs font-semibold text-sea hover:border-sea/40 hover:bg-mist/50 transition"
                    >
                      {isExpanded ? t('▲ 회차 접기', '▲ Hide Waves') : t('▼ 회차 일정표 보기', '▼ View Waves')}
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDeletePrompt(prompt.id)}
                      className="p-1.5 text-xs text-ink-soft/70 hover:text-warn transition"
                      title={t('스케줄 삭제', 'Delete schedule')}
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {/* Expanded Occasions Matrix & Direct Links */}
                {isExpanded && (
                  <div className="border-t border-sand/60 bg-mist/20 p-4 space-y-3 animate-fade">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-sea-deep">
                        {t('회차별 예정 일시 및 참가자 다이렉트 링크:', 'Occasions schedule & direct participation links:')}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleAddSingleOccasion(prompt.id)}
                          className="rounded-md border border-dashed border-sea/50 bg-white px-2.5 py-1 text-[11px] font-semibold text-sea hover:bg-mist transition"
                        >
                          + {t('회차 추가', 'Add Wave')}
                        </button>
                        <span className="text-[11px] text-ink-soft">
                          {t('참가자 코드:', 'Target code:')} <strong className="font-mono text-sea">{selectedParticipantCode}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto rounded-xl border border-sand/70 bg-white">
                      <table className="min-w-full text-left text-xs">
                        <thead className="border-b border-sand/70 bg-mist/50 text-[11px] uppercase tracking-wider text-ink-soft font-semibold sticky top-0">
                          <tr>
                            <th className="py-2 px-3 w-12">#</th>
                            <th className="py-2 px-3">{t('회차 라벨 (Wave Label)', 'Wave Label')}</th>
                            <th className="py-2 px-3">{t('예정 일시 (Scheduled Time)', 'Scheduled Time')}</th>
                            <th className="py-2 px-3">{t('마감 시한 (Expires)', 'Expires')}</th>
                            <th className="py-2 px-3 text-right">{t('참가 링크 및 관리', 'Actions & Direct Link')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sand/50">
                          {occasions.map((occ) => {
                            const schedDate = occ.scheduled_for ? new Date(occ.scheduled_for) : null
                            const closeDate = occ.window_closes_at ? new Date(occ.window_closes_at) : null
                            const isCopied = copiedOccasionId === occ.id
                            const isEditing = editingOccasionId === occ.id

                            if (isEditing) {
                              return (
                                <tr key={occ.id} className="bg-sea/5">
                                  <td className="py-2 px-3 font-mono font-bold text-sea-deep">
                                    #{occ.occasion_index}
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="text"
                                      value={editingLabel}
                                      onChange={(e) => setEditingLabel(e.target.value)}
                                      className="border border-sand rounded px-2 py-1 text-xs w-full bg-white"
                                    />
                                  </td>
                                  <td className="py-2 px-3" colSpan={2}>
                                    <input
                                      type="datetime-local"
                                      value={editingDateStr}
                                      onChange={(e) => setEditingDateStr(e.target.value)}
                                      className="border border-sand rounded px-2 py-1 text-xs w-full bg-white font-mono"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <div className="flex justify-end gap-1">
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => saveEditOccasion(occ.id)}
                                        className="bg-sea text-white rounded px-2 py-1 text-[11px] font-semibold"
                                      >
                                        {t('저장', 'Save')}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingOccasionId(null)}
                                        className="border border-sand bg-white rounded px-2 py-1 text-[11px]"
                                      >
                                        {t('취소', 'Cancel')}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            }

                            return (
                              <tr key={occ.id} className="hover:bg-mist/30 transition">
                                <td className="py-2 px-3 font-mono font-bold text-sea-deep">
                                  #{occ.occasion_index}
                                </td>
                                <td className="py-2 px-3 font-medium text-sea-deep">
                                  {occ.label || `Wave ${occ.occasion_index}`}
                                </td>
                                <td className="py-2 px-3 text-ink-soft">
                                  {schedDate ? schedDate.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', {
                                    month: 'numeric',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    weekday: 'short',
                                  }) : '—'}
                                </td>
                                <td className="py-2 px-3 text-ink-soft text-[11px]">
                                  {closeDate ? closeDate.toLocaleTimeString(locale === 'ko' ? 'ko-KR' : 'en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }) : '—'}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => copyParticipantOccasionLink(occ.id)}
                                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                                        isCopied
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'border border-sand bg-white text-sea hover:border-sea/40 hover:bg-mist/60'
                                      }`}
                                    >
                                      {isCopied ? t('✓ 복사됨!', '✓ Copied!') : t('🔗 링크 복사', '🔗 Copy Link')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => startEditOccasion(occ)}
                                      className="text-[11px] text-ink-soft hover:text-sea p-1"
                                      title={t('수정', 'Edit')}
                                    >
                                      ✏️
                                    </button>
                                    {occasions.length > 1 && (
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => handleDeleteSingleOccasion(occ.id)}
                                        className="text-[11px] text-ink-soft/70 hover:text-warn p-1"
                                        title={t('삭제', 'Delete')}
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CREATE SCHEDULE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-fade">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-sand bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-sand/70 pb-3">
              <div>
                <h3 className="font-display text-lg font-semibold text-sea-deep">
                  {t('새 발송 스케줄 생성 (New Delivery Schedule)', 'Create New Delivery Schedule')}
                </h3>
                <p className="text-xs text-ink-soft">
                  {t('연구 목적에 맞는 발송 방식 프리셋을 선택하고 회차 일정을 생성하세요.', 'Choose a cadence preset and configure waves.')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-ink-soft hover:text-sea-deep font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-5">
              {/* 1. Target Survey */}
              <div>
                <label className="block text-xs font-semibold text-sea-deep mb-1">
                  {t('1. 대상 설문지 선택 (Target Survey) *', '1. Select Target Survey *')}
                </label>
                <select
                  value={selectedSurveyId}
                  onChange={(e) => {
                    setSelectedSurveyId(e.target.value)
                    const s = surveys.find((sv) => sv.id === e.target.value)
                    if (s) setScheduleLabel(`${s.title} - ${activePreset.name_kr.split(' (')[0]}`)
                  }}
                  className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-xs outline-none focus:border-sea/50"
                  required
                >
                  {surveys.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Cadence Presets */}
              <div>
                <label className="block text-xs font-semibold text-sea-deep mb-2">
                  {t('2. 발송 방식 프리셋 선택 (Cadence Preset) *', '2. Choose Cadence Preset *')}
                </label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {CADENCE_PRESETS.map((preset) => {
                    const isSelected = selectedCadence === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? 'border-sea bg-sea/5 shadow-xs ring-2 ring-sea/20'
                            : 'border-sand/80 bg-white hover:border-sea/30 hover:bg-mist/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{preset.icon}</span>
                          <span className="font-semibold text-xs text-sea-deep">
                            {locale === 'ko' ? preset.name_kr : preset.name_en}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-ink-soft leading-snug">
                          {locale === 'ko' ? preset.description_kr : preset.description_en}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 3. Schedule Parameters */}
              <div className="rounded-xl border border-sand/80 bg-mist/20 p-4 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-sea-deep">
                  {t('3. 세부 발송 설정 (Schedule Parameters)', '3. Schedule Parameters')}
                </h4>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs">
                    <span className="mb-1 block font-medium text-ink-soft">
                      {t('스케줄 명칭 (Schedule Name)', 'Schedule Name')}
                    </span>
                    <input
                      type="text"
                      value={scheduleLabel}
                      onChange={(e) => setScheduleLabel(e.target.value)}
                      placeholder="e.g. Daily Stress Diary"
                      className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none focus:border-sea/40"
                      required
                    />
                  </label>

                  <label className="block text-xs">
                    <span className="mb-1 block font-medium text-ink-soft">
                      {t('시작일 (Start Date)', 'Start Date')}
                    </span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none focus:border-sea/40"
                      required
                    />
                  </label>

                  {selectedCadence !== 'pre_post' && (
                    <label className="block text-xs">
                      <span className="mb-1 block font-medium text-ink-soft">
                        {t('총 진행 기간 (일수, Duration in Days)', 'Duration (Days)')}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={durationDays}
                        onChange={(e) => setDurationDays(Math.max(1, Number(e.target.value)))}
                        className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none focus:border-sea/40"
                      />
                    </label>
                  )}

                  <label className="block text-xs">
                    <span className="mb-1 block font-medium text-ink-soft">
                      {t('응답 유효 시간 (마감 시간, Response Window)', 'Response Expiration Window')}
                    </span>
                    <select
                      value={responseWindowMinutes}
                      onChange={(e) => setResponseWindowMinutes(Number(e.target.value))}
                      className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-xs outline-none focus:border-sea/40"
                    >
                      <option value={30}>{t('30분 (EMA 타이트)', '30 minutes (Tight EMA)')}</option>
                      <option value={60}>{t('1시간 (60분)', '1 hour')}</option>
                      <option value={180}>{t('3시간 (180분)', '3 hours')}</option>
                      <option value={360}>{t('6시간', '6 hours')}</option>
                      <option value={720}>{t('12시간', '12 hours')}</option>
                      <option value={1440}>{t('24시간 (1일)', '24 hours (1 day)')}</option>
                      <option value={2880}>{t('48시간 (2일)', '48 hours (2 days)')}</option>
                      <option value={4320}>{t('72시간 (3일)', '72 hours (3 days)')}</option>
                    </select>
                  </label>
                </div>

                {/* Delivery Times list for EMA or Daily */}
                {selectedCadence !== 'pre_post' && (
                  <div className="space-y-2 pt-1 border-t border-sand/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-sea-deep">
                        {t('하루 발송 시간대 (Daily Notification Times):', 'Notification Times per Day:')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDeliveryTimes([...deliveryTimes, '18:00'])}
                        className="text-xs font-semibold text-sea hover:underline"
                      >
                        + {t('시간대 추가', 'Add Time')}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {deliveryTimes.map((time, idx) => (
                        <div key={idx} className="flex items-center gap-1 bg-white border border-sand rounded-lg px-2 py-1">
                          <input
                            type="time"
                            value={time}
                            onChange={(e) => {
                              const next = [...deliveryTimes]
                              next[idx] = e.target.value
                              setDeliveryTimes(next)
                            }}
                            className="text-xs outline-none font-mono"
                          />
                          {deliveryTimes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setDeliveryTimes(deliveryTimes.filter((_, i) => i !== idx))}
                              className="text-ink-soft/70 hover:text-warn text-xs"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pre-Post Specific Waves Config */}
                {selectedCadence === 'pre_post' && (
                  <div className="space-y-2 pt-1 border-t border-sand/50">
                    <span className="text-xs font-medium text-sea-deep block">
                      {t('사전-사후-추적 시점 설정 (Timepoints):', 'Evaluation Timepoints:')}
                    </span>
                    {prePostWaves.map((wave, idx) => (
                      <div key={idx} className="grid grid-cols-3 gap-2 bg-white p-2 rounded-lg border border-sand">
                        <input
                          type="text"
                          value={wave.label}
                          onChange={(e) => {
                            const next = [...prePostWaves]
                            next[idx].label = e.target.value
                            setPrePostWaves(next)
                          }}
                          className="text-xs border border-sand rounded px-2 py-1"
                          placeholder="Wave label"
                        />
                        <div className="flex items-center gap-1 text-xs">
                          <span>+</span>
                          <input
                            type="number"
                            min={0}
                            value={wave.offsetDays}
                            onChange={(e) => {
                              const next = [...prePostWaves]
                              next[idx].offsetDays = Number(e.target.value)
                              setPrePostWaves(next)
                            }}
                            className="w-14 border border-sand rounded px-1.5 py-1"
                          />
                          <span>{t('일 후', 'days')}</span>
                        </div>
                        <input
                          type="time"
                          value={wave.time}
                          onChange={(e) => {
                            const next = [...prePostWaves]
                            next[idx].time = e.target.value
                            setPrePostWaves(next)
                          }}
                          className="text-xs border border-sand rounded px-2 py-1 font-mono"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Generated Occasions Preview */}
              <div className="rounded-xl border border-sand bg-white p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-sea-deep">
                    {t('회차 생성 프리뷰 (Preview)', 'Occasions Preview')}
                  </span>
                  <span className="font-bold text-sea">
                    {previewOccasions.length} {t('개 회차 자동 생성 예정', 'waves will be created')}
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto text-[11px] text-ink-soft divide-y divide-sand/40 border border-sand/60 rounded-lg">
                  {previewOccasions.slice(0, 10).map((occ) => (
                    <div key={occ.occasion_index} className="flex justify-between px-2.5 py-1">
                      <span className="font-semibold text-sea-deep font-mono">#{occ.occasion_index} {occ.label}</span>
                      <span>{new Date(occ.scheduled_for).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                  {previewOccasions.length > 10 && (
                    <div className="px-2.5 py-1 text-center text-ink-soft/70 bg-mist/30">
                      … (+{previewOccasions.length - 10} {t('개 추가 회차', 'more occasions')})
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-sand/60">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-sand bg-white px-4 py-2.5 text-xs font-semibold text-sea-deep hover:bg-mist/40 transition"
                >
                  {t('취소', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={busy || previewOccasions.length === 0}
                  className="rounded-xl bg-sea px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-sea-bright active:scale-[0.98] disabled:opacity-50"
                >
                  {busy ? t('생성 중…', 'Creating…') : t(`스케줄 및 ${previewOccasions.length}개 회차 생성`, `Create Schedule (${previewOccasions.length} Waves)`)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
