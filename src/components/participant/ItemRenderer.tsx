import type { AnswerInput, ContentLocale, SurveyItem } from '../../types/database'
import { localizedItemView } from './BilingualItemText'
import { LikertControl } from './LikertControl'
import { OpenTextControl } from './OpenTextControl'
import { SliderControl } from './SliderControl'

type ItemRendererProps = {
  item: SurveyItem
  answer: AnswerInput | undefined
  onAnswer: (answer: AnswerInput) => void
  locale?: ContentLocale
}

export function ItemRenderer({
  item,
  answer,
  onAnswer,
  locale = 'ko',
}: ItemRendererProps) {
  const view = localizedItemView(item, locale)
  const options = view.options

  switch (item.item_type) {
    case 'likert':
    case 'single_choice':
      return (
        <LikertControl
          options={options}
          value={answer?.numeric_value ?? null}
          onChange={(value) => onAnswer({ numeric_value: value })}
          leftAnchor={view.leftAnchor}
          rightAnchor={view.rightAnchor}
        />
      )

    case 'slider':
      return (
        <SliderControl
          min={item.min_value ?? 0}
          max={item.max_value ?? 10}
          step={item.step_value ?? 1}
          value={answer?.numeric_value ?? null}
          onChange={(value) => onAnswer({ numeric_value: value })}
          leftAnchor={view.leftAnchor}
          rightAnchor={view.rightAnchor}
          discrete
        />
      )

    case 'visual_analog':
      return (
        <SliderControl
          min={item.min_value ?? 0}
          max={item.max_value ?? 100}
          step={item.step_value ?? 1}
          value={answer?.numeric_value ?? null}
          onChange={(value) => onAnswer({ numeric_value: value })}
          leftAnchor={view.leftAnchor}
          rightAnchor={view.rightAnchor}
        />
      )

    case 'multiple_choice': {
      const selected = new Set(answer?.selected_values ?? [])
      return (
        <div className="flex flex-col gap-2.5" role="group" aria-label="Select all that apply">
          {options.map((opt) => {
            const on = selected.has(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const next = new Set(selected)
                  if (on) next.delete(opt.value)
                  else next.add(opt.value)
                  onAnswer({ selected_values: Array.from(next).sort((a, b) => a - b) })
                }}
                className={[
                  'flex min-h-[56px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.985]',
                  on
                    ? 'border-sea bg-sea text-white'
                    : 'border-sand bg-white/75 text-ink hover:border-sea/35',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-6 w-6 items-center justify-center rounded-md border text-xs',
                    on ? 'border-white/40 bg-white/20' : 'border-sand bg-mist',
                  ].join(' ')}
                >
                  {on ? '✓' : ''}
                </span>
                <span className="text-[15px] font-medium">{opt.label}</span>
              </button>
            )
          })}
        </div>
      )
    }

    case 'open_text':
      return (
        <OpenTextControl
          value={answer?.text_value ?? ''}
          onChange={(text_value) => onAnswer({ text_value })}
        />
      )

    default:
      return null
  }
}
