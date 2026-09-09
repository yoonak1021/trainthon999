import { useState } from 'react'
import type { ItemType, ResponseOption } from '../../types/database'

export type OptionDraft = {
  value: number
  label_kr: string
  label_en: string
}

export type ContinuousScaleConfig = {
  min: number
  max: number
  step: number
  left_anchor_kr: string
  left_anchor_en: string
  right_anchor_kr: string
  right_anchor_en: string
}

export const PRESET_OPTIONS: {
  id: string
  name: string
  description: string
  points: number
  options: OptionDraft[]
}[] = [
  {
    id: 'likert_5_agree',
    name: '5-point Agreement (1–5)',
    description: '전혀 동의하지 않는다 … 매우 동의한다',
    points: 5,
    options: [
      { value: 1, label_kr: '전혀 동의하지 않는다', label_en: 'Strongly disagree' },
      { value: 2, label_kr: '동의하지 않는다', label_en: 'Disagree' },
      { value: 3, label_kr: '보통이다 (중립)', label_en: 'Neither agree nor disagree' },
      { value: 4, label_kr: '동의한다', label_en: 'Agree' },
      { value: 5, label_kr: '매우 동의한다', label_en: 'Strongly agree' },
    ],
  },
  {
    id: 'likert_7_agree',
    name: '7-point Agreement (1–7)',
    description: '전혀 동의하지 않는다 … 매우 동의한다',
    points: 7,
    options: [
      { value: 1, label_kr: '전혀 동의하지 않는다', label_en: 'Strongly disagree' },
      { value: 2, label_kr: '동의하지 않는다', label_en: 'Disagree' },
      { value: 3, label_kr: '약간 동의하지 않는다', label_en: 'Slightly disagree' },
      { value: 4, label_kr: '보통이다 (중립)', label_en: 'Neutral' },
      { value: 5, label_kr: '약간 동의한다', label_en: 'Slightly agree' },
      { value: 6, label_kr: '동의한다', label_en: 'Agree' },
      { value: 7, label_kr: '매우 동의한다', label_en: 'Strongly agree' },
    ],
  },
  {
    id: 'likert_5_freq',
    name: '5-point Frequency (1–5)',
    description: '전혀 없음 … 항상',
    points: 5,
    options: [
      { value: 1, label_kr: '전혀 없음', label_en: 'Never' },
      { value: 2, label_kr: '거의 없음', label_en: 'Rarely' },
      { value: 3, label_kr: '가끔', label_en: 'Sometimes' },
      { value: 4, label_kr: '자주', label_en: 'Often' },
      { value: 5, label_kr: '항상 / 매우 자주', label_en: 'Always / Very often' },
    ],
  },
  {
    id: 'likert_5_intensity',
    name: '5-point Intensity (1–5)',
    description: '전혀 그렇지 않다 … 매우 그렇다',
    points: 5,
    options: [
      { value: 1, label_kr: '전혀 그렇지 않다', label_en: 'Not at all' },
      { value: 2, label_kr: '그렇지 않다', label_en: 'A little' },
      { value: 3, label_kr: '보통이다', label_en: 'Moderately' },
      { value: 4, label_kr: '그렇다', label_en: 'Quite a bit' },
      { value: 5, label_kr: '매우 그렇다', label_en: 'Extremely' },
    ],
  },
  {
    id: 'binary_yes_no',
    name: 'Yes / No (1 / 0)',
    description: '예 (1) / 아니오 (0)',
    points: 2,
    options: [
      { value: 1, label_kr: '예', label_en: 'Yes' },
      { value: 0, label_kr: '아니오', label_en: 'No' },
    ],
  },
]

export function optionsToDrafts(options: ResponseOption[] | null | undefined): OptionDraft[] {
  if (!options || options.length === 0) {
    return PRESET_OPTIONS[0].options.map((o) => ({ ...o }))
  }
  return options.map((opt) => ({
    value: opt.value,
    label_kr: opt.label_kr || opt.label || '',
    label_en: opt.label_en || '',
  }))
}

export function draftsToOptions(drafts: OptionDraft[]): ResponseOption[] {
  return drafts.map((d) => ({
    value: Number(d.value),
    label: d.label_kr.trim() || d.label_en.trim() || `Option ${d.value}`,
    label_kr: d.label_kr.trim() || undefined,
    label_en: d.label_en.trim() || undefined,
  }))
}

type ResponseOptionsEditorProps = {
  itemType: ItemType
  options: OptionDraft[]
  onOptionsChange: (options: OptionDraft[]) => void
  continuousConfig: ContinuousScaleConfig
  onContinuousConfigChange: (config: ContinuousScaleConfig) => void
}

export function ResponseOptionsEditor({
  itemType,
  options,
  onOptionsChange,
  continuousConfig,
  onContinuousConfigChange,
}: ResponseOptionsEditorProps) {
  const [showJsonMode, setShowJsonMode] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  if (itemType === 'open_text') {
    return (
      <div className="rounded-xl border border-sand/80 bg-mist/40 p-4 text-sm text-ink-soft">
        <p className="font-semibold text-sea-deep">Open Text Response (주관식 서술형)</p>
        <p className="mt-1 text-xs leading-relaxed">
          Participants answer in a freeform multi-line text box. No preset response choices are needed.
        </p>
      </div>
    )
  }

  if (itemType === 'slider' || itemType === 'visual_analog') {
    const isVas = itemType === 'visual_analog'
    return (
      <div className="space-y-4 rounded-xl border border-sand/80 bg-white/70 p-4">
        <div>
          <p className="font-semibold text-sea-deep">
            {isVas ? 'Visual Analog Scale (VAS) Settings' : 'Continuous Slider Settings'}
          </p>
          <p className="text-xs text-ink-soft">
            Configure the scale range, step increments, and descriptive anchor labels shown at both ends.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs">
            <span className="mb-1 block font-semibold text-ink-soft">Min Value (최솟값)</span>
            <input
              type="number"
              value={continuousConfig.min}
              onChange={(e) =>
                onContinuousConfigChange({ ...continuousConfig, min: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-sea/40"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-semibold text-ink-soft">Max Value (최댓값)</span>
            <input
              type="number"
              value={continuousConfig.max}
              onChange={(e) =>
                onContinuousConfigChange({ ...continuousConfig, max: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-sea/40"
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-semibold text-ink-soft">Step Increment (증감 단위)</span>
            <input
              type="number"
              value={continuousConfig.step}
              min={0.1}
              step={0.1}
              onChange={(e) =>
                onContinuousConfigChange({ ...continuousConfig, step: Number(e.target.value) })
              }
              className="w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-sea/40"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-sand/60 bg-mist/30 p-3">
            <span className="block text-xs font-semibold text-sea-deep">
              Left End Anchor (좌측 끝 앵커 레이블)
            </span>
            <input
              type="text"
              value={continuousConfig.left_anchor_kr}
              onChange={(e) =>
                onContinuousConfigChange({ ...continuousConfig, left_anchor_kr: e.target.value })
              }
              placeholder="예: 전혀 그렇지 않다"
              className="w-full rounded-lg border border-sand bg-white px-3 py-1.5 text-xs outline-none focus:border-sea/40"
            />
            <input
              type="text"
              value={continuousConfig.left_anchor_en}
              onChange={(e) =>
                onContinuousConfigChange({ ...continuousConfig, left_anchor_en: e.target.value })
              }
              placeholder="English (e.g. Not at all)"
              className="w-full rounded-lg border border-sand bg-white px-3 py-1.5 text-xs outline-none focus:border-sea/40"
            />
          </div>

          <div className="space-y-2 rounded-lg border border-sand/60 bg-mist/30 p-3">
            <span className="block text-xs font-semibold text-sea-deep">
              Right End Anchor (우측 끝 앵커 레이블)
            </span>
            <input
              type="text"
              value={continuousConfig.right_anchor_kr}
              onChange={(e) =>
                onContinuousConfigChange({ ...continuousConfig, right_anchor_kr: e.target.value })
              }
              placeholder="예: 매우 그렇다"
              className="w-full rounded-lg border border-sand bg-white px-3 py-1.5 text-xs outline-none focus:border-sea/40"
            />
            <input
              type="text"
              value={continuousConfig.right_anchor_en}
              onChange={(e) =>
                onContinuousConfigChange({ ...continuousConfig, right_anchor_en: e.target.value })
              }
              placeholder="English (e.g. Extremely)"
              className="w-full rounded-lg border border-sand bg-white px-3 py-1.5 text-xs outline-none focus:border-sea/40"
            />
          </div>
        </div>
      </div>
    )
  }

  // Likert, single_choice, multiple_choice
  function applyPreset(presetId: string) {
    const p = PRESET_OPTIONS.find((preset) => preset.id === presetId)
    if (p) {
      onOptionsChange(p.options.map((o) => ({ ...o })))
      setJsonError(null)
    }
  }

  function addOptionRow() {
    const nextVal = options.length > 0 ? Math.max(...options.map((o) => o.value)) + 1 : 1
    onOptionsChange([
      ...options,
      { value: nextVal, label_kr: '', label_en: '' },
    ])
  }

  function updateOptionRow(index: number, patch: Partial<OptionDraft>) {
    const next = options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt))
    onOptionsChange(next)
  }

  function removeOptionRow(index: number) {
    if (options.length <= 1) return
    onOptionsChange(options.filter((_, i) => i !== index))
  }

  function toggleJsonView() {
    if (!showJsonMode) {
      setJsonText(JSON.stringify(draftsToOptions(options), null, 2))
      setJsonError(null)
      setShowJsonMode(true)
    } else {
      try {
        const parsed = JSON.parse(jsonText) as ResponseOption[]
        if (Array.isArray(parsed)) {
          onOptionsChange(optionsToDrafts(parsed))
          setShowJsonMode(false)
          setJsonError(null)
        } else {
          setJsonError('JSON must be an array of option objects.')
        }
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'Invalid JSON format')
      }
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-sand/80 bg-white/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-sm font-semibold text-sea-deep">
            Response Options & Anchors (응답 선택지)
          </span>
          <p className="text-xs text-ink-soft">
            Choose a standard template or customize the option labels and coded numeric values below.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleJsonView}
          className="text-xs text-sea underline-offset-2 hover:underline"
        >
          {showJsonMode ? 'Back to visual editor' : 'Edit as raw JSON'}
        </button>
      </div>

      {/* Preset template chips */}
      {!showJsonMode && (
        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-soft/80">
            Quick Templates (자주 쓰는 척도 템플릿)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_OPTIONS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className="rounded-lg border border-sand/90 bg-white px-2.5 py-1.5 text-xs font-medium text-sea-deep transition hover:border-sea/40 hover:bg-mist/50 active:scale-[0.98]"
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {showJsonMode ? (
        <div>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-sand bg-white p-3 font-mono text-xs outline-none focus:border-sea/40"
          />
          {jsonError && (
            <p role="alert" className="mt-1 text-xs text-warn">
              {jsonError}
            </p>
          )}
        </div>
      ) : (
        /* Visual Option List */
        <div className="space-y-2">
          <div className="hidden items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft sm:flex">
            <span className="w-16 text-center">Value</span>
            <span className="flex-1">Korean Label (한국어 레이블)</span>
            <span className="flex-1">English Label (영어 레이블, Optional)</span>
            <span className="w-8"></span>
          </div>

          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-2 rounded-lg border border-sand/60 bg-white p-2.5 sm:flex-row sm:items-center sm:gap-2 sm:p-1.5"
              >
                <div className="flex items-center gap-2 sm:w-16">
                  <span className="text-xs text-ink-soft sm:hidden">Value:</span>
                  <input
                    type="number"
                    value={opt.value}
                    onChange={(e) => updateOptionRow(idx, { value: Number(e.target.value) })}
                    className="w-16 rounded-md border border-sand bg-mist/30 px-2 py-1 text-center font-mono text-xs font-semibold text-sea-deep outline-none focus:border-sea/40"
                    placeholder="Val"
                    title="Coded numeric value for data export"
                  />
                </div>

                <div className="flex-1">
                  <input
                    type="text"
                    value={opt.label_kr}
                    onChange={(e) => updateOptionRow(idx, { label_kr: e.target.value })}
                    placeholder="예: 동의한다"
                    className="w-full rounded-md border border-sand bg-white px-2.5 py-1 text-xs outline-none focus:border-sea/40"
                  />
                </div>

                <div className="flex-1">
                  <input
                    type="text"
                    value={opt.label_en}
                    onChange={(e) => updateOptionRow(idx, { label_en: e.target.value })}
                    placeholder="e.g. Agree (optional)"
                    className="w-full rounded-md border border-sand bg-white px-2.5 py-1 text-xs outline-none focus:border-sea/40"
                  />
                </div>

                <div className="flex justify-end sm:w-8">
                  <button
                    type="button"
                    onClick={() => removeOptionRow(idx)}
                    disabled={options.length <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-sm text-ink-soft hover:bg-danger-soft hover:text-warn disabled:opacity-20"
                    title="Remove option"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addOptionRow}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-sea/40 bg-mist/30 px-3 py-1.5 text-xs font-semibold text-sea transition hover:bg-mist/70"
          >
            <span>+</span> Add Option Row
          </button>
        </div>
      )}
    </div>
  )
}
