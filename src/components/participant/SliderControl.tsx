type SliderControlProps = {
  min: number
  max: number
  step: number
  value: number | null
  onChange: (value: number) => void
  leftAnchor?: string | null
  rightAnchor?: string | null
  discrete?: boolean
}

/**
 * Touch-friendly slider with large thumb and live value readout.
 * Works for discrete Likert-as-slider and continuous VAS-style ranges.
 */
export function SliderControl({
  min,
  max,
  step,
  value,
  onChange,
  leftAnchor,
  rightAnchor,
  discrete = false,
}: SliderControlProps) {
  const current = value ?? Math.round((min + max) / 2)
  const ticks =
    discrete && max - min <= 10
      ? Array.from({ length: max - min + 1 }, (_, i) => min + i)
      : null

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-soft">
          Your answer
        </span>
        <span className="font-display text-4xl font-semibold tabular-nums text-sea-deep">
          {value === null ? '—' : current}
        </span>
      </div>

      <div className="rounded-2xl border border-sand/80 bg-white/70 px-4 py-6">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={current}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={current}
          aria-label="Response slider"
          onChange={(e) => onChange(Number(e.target.value))}
          className="likert-slider w-full"
        />

        {ticks && (
          <div className="mt-3 flex justify-between px-0.5">
            {ticks.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange(t)}
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition',
                  value === t
                    ? 'bg-sea text-white'
                    : 'text-ink-soft hover:bg-mist',
                ].join(' ')}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-between gap-3 text-xs text-ink-soft">
          <span className="max-w-[45%]">{leftAnchor}</span>
          <span className="max-w-[45%] text-right">{rightAnchor}</span>
        </div>
      </div>
    </div>
  )
}
