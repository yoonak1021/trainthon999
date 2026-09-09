import { Link } from 'react-router-dom'
import { LanguageSwitcherButton, useLocale } from '../context/LocaleContext'

/** Landing — brand-forward entry to participant and researcher sides. */
export function HomePage() {
  const { t } = useLocale()

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-between px-5 pb-12 pt-8">
      {/* Top bar with language switcher */}
      <div className="flex justify-end">
        <LanguageSwitcherButton />
      </div>

      <div className="animate-rise my-auto">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-sea">
          {t('심리학 연구를 위한 종단 설문 플랫폼', 'Longitudinal surveys for psychology')}
        </p>
        <h1 className="font-display text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-sea-deep sm:text-6xl">
          Wave
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
          {t(
            '동일한 참가자가 시간의 흐름에 따라 응답하는 반복 측정(Repeated-measures) 종단 연구 — 모바일 최적화 및 연구용 자동 채점 지원.',
            'Repeated-measures studies where the same participants answer over time — built for phones, scored for research.',
          )}
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <Link
            to="/p"
            className="flex min-h-[56px] items-center justify-center rounded-2xl bg-sea text-base font-semibold text-white shadow-[0_14px_36px_-16px_rgba(31,111,106,0.95)] transition hover:bg-sea-bright active:scale-[0.98]"
          >
            {t('설문 참여하기 (참가자용)', 'Take a survey (Participant)')}
          </Link>
          <Link
            to="/researcher"
            className="flex min-h-[56px] items-center justify-center rounded-2xl border border-sand bg-white/70 text-base font-semibold text-sea-deep transition hover:border-sea/30 active:scale-[0.98]"
          >
            {t('연구자 워크스페이스', 'Researcher workspace')}
          </Link>
        </div>
      </div>

      <footer className="text-center text-xs text-ink-soft/70">
        Wave Survey Platform · {t('한국어 및 English 지원', 'Bilingual Korean & English Support')}
      </footer>
    </div>
  )
}
