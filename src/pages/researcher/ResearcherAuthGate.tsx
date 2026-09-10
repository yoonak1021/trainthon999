import { Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useLocale } from '../../context/LocaleContext'
import { ResearcherLoginPage } from './ResearcherLoginPage'

export function ResearcherAuthGate() {
  const { researcher, loading } = useAuth()
  const { t } = useLocale()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-ink-soft">
        {t('불러오는 중…', 'Loading…')}
      </div>
    )
  }

  if (!researcher) return <ResearcherLoginPage />
  return <Outlet />
}
