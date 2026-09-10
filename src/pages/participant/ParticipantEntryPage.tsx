import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LanguageSwitcherButton, useLocale } from '../../context/LocaleContext'

/**
 * Participant entry — identify by persistent participant code, then enter
 * the one-item-at-a-time survey session for the current occasion.
 */
export function ParticipantEntryPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLocale()
  const [code, setCode] = useState(params.get('code') ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      setError(
        t(
          '계속하려면 참가자 코드를 입력해 주세요.',
          'Enter your participant code to continue.',
        ),
      )
      return
    }
    setError(null)
    const studyId = params.get('study')
    const occasionId = params.get('occasion')
    const qs = new URLSearchParams()
    if (studyId) qs.set('study', studyId)
    if (occasionId) qs.set('occasion', occasionId)
    const query = qs.toString()
    navigate(`/take/${encodeURIComponent(trimmed.toUpperCase())}${query ? `?${query}` : ''}`)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-5 pb-10 pt-6">
      {/* Top bar with language switcher */}
      <div className="flex justify-end">
        <LanguageSwitcherButton />
      </div>

      <div className="animate-rise flex flex-1 flex-col justify-center my-auto">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-sea">
          {t('설문 세션', 'Your survey session')}
        </p>
        <h1 className="font-display text-[2.15rem] font-semibold leading-[1.15] tracking-tight text-sea-deep">
          Wave
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-soft">
          {t(
            '연구 안내문에 기재된 고유 참가자 코드를 입력하세요. 모든 설문 회차 동안 응답이 이 코드에 안전하게 연동됩니다.',
            'Enter the participant code from your study invitation. Your answers stay linked to this code across every check-in.',
          )}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-sea-deep">
              {t('참가자 코드 (Participant Code)', 'Participant code')}
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              placeholder="e.g. DEMO01"
              className="w-full rounded-2xl border border-sand bg-white/80 px-4 py-4 text-lg font-semibold tracking-wide text-ink outline-none transition placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-soft/45 focus:border-sea/45 focus:ring-4 focus:ring-sea/10"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-warn">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-sea px-5 text-base font-semibold text-white shadow-[0_12px_32px_-14px_rgba(31,111,106,0.9)] transition hover:bg-sea-bright active:scale-[0.98]"
          >
            {t('설문 시작하기', 'Continue')}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-soft">
          {t('체험용 데모 코드', 'Demo code')}:{' '}
          <span className="font-semibold text-sea-deep">DEMO01</span>
        </p>
      </div>

      <p className="pt-8 text-center text-xs text-ink-soft/80">
        {t('연구자이신가요?', 'Researcher?')}{' '}
        <Link to="/researcher" className="font-medium text-sea underline-offset-2 hover:underline">
          {t('연구자 화면 열기', 'Open researcher view')}
        </Link>
      </p>
    </div>
  )
}
