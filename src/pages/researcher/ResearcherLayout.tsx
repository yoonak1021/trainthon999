import { NavLink, Outlet } from 'react-router-dom'
import { isSupabaseConfigured } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { LanguageSwitcherButton, useLocale } from '../../context/LocaleContext'

export function ResearcherLayout() {
  const { t } = useLocale()
  const { researcher, signOut } = useAuth()

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sea">
              {t('연구자 워크스페이스', 'Researcher Workspace')}
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-sea-deep sm:text-4xl">
              Wave
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
              {t(
                '반복 측정 종단 연구 설계, 검증된 심리학 척도 및 커스텀 문항 구성, 종단 데이터 채점 및 관리.',
                'Build repeated-measures studies, add validated or custom items, and review longitudinal responses.',
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <LanguageSwitcherButton />
            {researcher && (
              <div className="flex items-center gap-2 text-xs text-ink-soft">
                <span className="max-w-[180px] truncate font-medium text-sea-deep">
                  {researcher.email}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="font-semibold text-sea underline-offset-2 hover:underline"
                >
                  {t('로그아웃', 'Sign out')}
                </button>
              </div>
            )}
            <NavLink
              to="/p"
              className="text-xs font-semibold text-sea underline-offset-2 hover:underline"
            >
              {t('참가자 화면으로 이동 →', 'Participant view →')}
            </NavLink>
          </div>
        </div>

        <nav className="mt-6 flex gap-1 border-b border-sand/80">
          <NavLink
            to="/researcher"
            end
            className={({ isActive }) =>
              [
                'px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'border-b-2 border-sea text-sea-deep font-semibold'
                  : 'text-ink-soft hover:text-sea-deep',
              ].join(' ')
            }
          >
            {t('연구 목록 (Studies)', 'Studies')}
          </NavLink>
        </nav>

        {!isSupabaseConfigured && (
          <p className="mt-4 rounded-xl border border-warn/20 bg-warn-bg/80 px-3 py-2 text-xs text-warn">
            {t(
              '로컬 데모 모드입니다. 이 브라우저에서 연구자 계정별로 데이터가 분리됩니다. 서버 보안(RLS)을 쓰려면 Supabase를 연결하세요.',
              'Local demo mode. Each researcher account is isolated in this browser. Connect Supabase for server-enforced RLS.',
            )}
          </p>
        )}
      </header>

      <Outlet />
    </div>
  )
}
