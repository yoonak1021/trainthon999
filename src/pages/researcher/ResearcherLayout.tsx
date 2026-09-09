import { NavLink, Outlet } from 'react-router-dom'
import { isSupabaseConfigured } from '../../lib/api'

export function ResearcherLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-sea">
              Researcher
            </p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-sea-deep sm:text-4xl">
              Wave
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft sm:text-base">
              Build repeated-measures studies, add validated or custom items, and
              review longitudinal responses.
            </p>
          </div>
          <NavLink
            to="/p"
            className="text-sm font-medium text-sea underline-offset-2 hover:underline"
          >
            Participant view
          </NavLink>
        </div>

        <nav className="mt-6 flex gap-1 border-b border-sand/80">
          <NavLink
            to="/researcher"
            end
            className={({ isActive }) =>
              [
                'px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'border-b-2 border-sea text-sea-deep'
                  : 'text-ink-soft hover:text-sea-deep',
              ].join(' ')
            }
          >
            Studies
          </NavLink>
        </nav>

        {!isSupabaseConfigured && (
          <p className="mt-4 rounded-xl border border-warn/20 bg-warn-bg/80 px-3 py-2 text-xs text-warn">
            Running in local demo mode (no Supabase env). Data is stored in this
            browser. Apply <code className="font-mono">supabase/schema.sql</code> and
            set <code className="font-mono">VITE_SUPABASE_*</code> to use Postgres.
          </p>
        )}
      </header>

      <Outlet />
    </div>
  )
}
