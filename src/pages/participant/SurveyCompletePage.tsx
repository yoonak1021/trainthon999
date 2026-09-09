import { Link, useLocation } from 'react-router-dom'

type DoneState = {
  occasionLabel?: string | null
  studyTitle?: string
}

export function SurveyCompletePage() {
  const location = useLocation()
  const state = (location.state ?? {}) as DoneState

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 text-center">
      <div className="animate-rise">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sea/10 text-sea">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12.5 9.5 17 19 7.5"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-semibold text-sea-deep">Thank you</h1>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          Your responses for{' '}
          <span className="font-medium text-sea-deep">
            {state.occasionLabel ?? 'this check-in'}
          </span>
          {state.studyTitle ? ` in ${state.studyTitle}` : ''} are saved. You can close this
          page.
        </p>
        <Link
          to="/p"
          className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-sand bg-white/70 px-5 text-sm font-semibold text-sea-deep"
        >
          Done
        </Link>
      </div>
    </div>
  )
}
