import { Link, useLocation } from 'react-router-dom'
import { LanguageSwitcherButton, useLocale } from '../../context/LocaleContext'

type DoneState = {
  occasionLabel?: string | null
  studyTitle?: string
}

export function SurveyCompletePage() {
  const location = useLocation()
  const state = (location.state ?? {}) as DoneState
  const { t } = useLocale()

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-5 pb-10 pt-6 text-center">
      <div className="flex justify-end">
        <LanguageSwitcherButton />
      </div>

      <div className="animate-rise my-auto">
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
        <h1 className="font-display text-3xl font-semibold text-sea-deep">
          {t('설문이 완료되었습니다', 'Thank you')}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          {state.studyTitle ? `${state.studyTitle} - ` : ''}
          <span className="font-medium text-sea-deep">
            {state.occasionLabel ?? t('이번 회차', 'this check-in')}
          </span>
          {t(
            ' 설문 응답이 정상적으로 안전하게 저장되었습니다. 창을 닫으셔도 됩니다.',
            ' responses are saved. You can close this page.',
          )}
        </p>
        <Link
          to="/p"
          className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-sand bg-white/70 px-5 text-sm font-semibold text-sea-deep hover:bg-white transition"
        >
          {t('완료', 'Done')}
        </Link>
      </div>

      <div className="text-xs text-ink-soft/70">
        Wave Survey Platform
      </div>
    </div>
  )
}
