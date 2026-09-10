import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LanguageSwitcherButton, useLocale } from '../../context/LocaleContext'
import { isSupabaseConfigured } from '../../lib/supabase'

export function ResearcherLoginPage() {
  const { signIn, signUp } = useAuth()
  const { t } = useLocale()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'signup') {
        await signUp(email, password)
        if (isSupabaseConfigured) {
          setInfo(
            t(
              '계정이 생성되었습니다. 이메일 확인이 켜져 있으면 받은편지함을 확인한 뒤 로그인하세요.',
              'Account created. If email confirmation is on, check your inbox before signing in.',
            ),
          )
        }
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('로그인에 실패했습니다.', 'Could not sign in'),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-6">
      <div className="flex justify-end">
        <LanguageSwitcherButton />
      </div>

      <div className="my-auto animate-rise">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-sea">
          {t('연구자 전용', 'Researchers only')}
        </p>
        <h1 className="font-display text-[2.15rem] font-semibold leading-[1.15] tracking-tight text-sea-deep">
          {mode === 'signup'
            ? t('연구자 계정 만들기', 'Create researcher account')
            : t('연구자 로그인', 'Researcher sign in')}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {t(
            '연구자만 자신의 연구·설문·응답에 접근합니다. 참가자는 로그인 없이 초대 코드로 응답합니다.',
            'Only you can open your studies, surveys, and data. Participants never log in — they use an invitation code.',
          )}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-sea-deep">
              {t('이메일', 'Email')}
            </span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 outline-none transition focus:border-sea/40 focus:ring-4 focus:ring-sea/10"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-sea-deep">
              {t('비밀번호 (8자 이상)', 'Password (8+ characters)')}
            </span>
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 outline-none transition focus:border-sea/40 focus:ring-4 focus:ring-sea/10"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-warn">
              {error}
            </p>
          )}
          {info && <p className="text-sm text-sea">{info}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-sea text-sm font-semibold text-white transition hover:bg-sea-bright disabled:opacity-50"
          >
            {saving
              ? t('처리 중…', 'Please wait…')
              : mode === 'signup'
                ? t('계정 만들기', 'Create account')
                : t('로그인', 'Sign in')}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signup' ? 'signin' : 'signup')
            setError(null)
            setInfo(null)
          }}
          className="mt-4 w-full text-center text-sm font-medium text-sea underline-offset-2 hover:underline"
        >
          {mode === 'signup'
            ? t('이미 계정이 있나요? 로그인', 'Already have an account? Sign in')
            : t('처음이신가요? 연구자 계정 만들기', 'New here? Create a researcher account')}
        </button>
      </div>

      <p className="pt-8 text-center text-xs text-ink-soft/80">
        {t('참가자이신가요?', 'Participant?')}{' '}
        <Link to="/p" className="font-medium text-sea underline-offset-2 hover:underline">
          {t('코드로 설문 참여', 'Enter with a code')}
        </Link>
      </p>
    </div>
  )
}
