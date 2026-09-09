import { Link } from 'react-router-dom'

/** Landing — brand-forward entry to participant and researcher sides. */
export function HomePage() {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 pb-12 pt-10">
      <div className="animate-rise">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-sea">
          Longitudinal surveys for psychology
        </p>
        <h1 className="font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-sea-deep sm:text-6xl">
          Wave
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
          Repeated-measures studies where the same participants answer over time —
          built for phones, scored for research.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <Link
            to="/p"
            className="flex min-h-[56px] items-center justify-center rounded-2xl bg-sea text-base font-semibold text-white shadow-[0_14px_36px_-16px_rgba(31,111,106,0.95)] transition hover:bg-sea-bright active:scale-[0.98]"
          >
            Take a survey
          </Link>
          <Link
            to="/researcher"
            className="flex min-h-[56px] items-center justify-center rounded-2xl border border-sand bg-white/70 text-base font-semibold text-sea-deep transition hover:border-sea/30 active:scale-[0.98]"
          >
            Researcher workspace
          </Link>
        </div>
      </div>
    </div>
  )
}
