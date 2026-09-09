import type { ResponseOption } from '../../types/database'

type LikertControlProps = {
  options: ResponseOption[]
  value: number | null
  onChange: (value: number) => void
  leftAnchor?: string | null
  rightAnchor?: string | null
}

/**
 * Large touch-target Likert / single-choice scale.
 * Options are full-width rows on mobile for reliable thumbs.
 */
export function LikertControl({
  options,
  value,
  onChange,
  leftAnchor,
  rightAnchor,
}: LikertControlProps) {
  return (
    <div className="space-y-3">
      {(leftAnchor || rightAnchor) && (
        <div className="flex justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-soft/80">
          <span>{leftAnchor}</span>
          <span className="text-right">{rightAnchor}</span>
        </div>
      )}

      <div
        role="radiogroup"
        aria-label="Response options"
        className="flex flex-col gap-2.5"
      >
        {options.map((opt, index) => {
          const selected = value === opt.value
          return (
            <button
              key={`${opt.value}-${opt.label}`}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={[
                'group flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
                'active:scale-[0.985]',
                selected
                  ? 'border-sea bg-sea text-white shadow-[0_10px_28px_-14px_rgba(31,111,106,0.9)]'
                  : 'border-sand/90 bg-white/75 text-ink hover:border-sea/35 hover:bg-white',
              ].join(' ')}
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <span
                className={[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition',
                  selected
                    ? 'bg-white/20 text-white'
                    : 'bg-mist text-sea-deep group-hover:bg-sea/10',
                ].join(' ')}
              >
                {opt.value}
              </span>
              <span className="text-[15px] font-medium leading-snug sm:text-base">
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
