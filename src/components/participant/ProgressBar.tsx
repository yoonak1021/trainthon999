type ProgressBarProps = {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((current / total) * 100)

  return (
    <div className="w-full" aria-hidden="true">
      <div className="mb-1.5 flex items-baseline justify-between text-xs text-ink-soft">
        <span>
          {current} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-sand/80">
        <div
          className="h-full rounded-full bg-sea transition-[width] duration-400 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
