import { useId, useState, type FormEvent, type KeyboardEvent } from 'react'
import { AVAILABLE_SCALE_HINTS } from '../lib/search'

type SearchPanelProps = {
  onBuild: (query: string) => void
  isBuilding?: boolean
}

export function SearchPanel({ onBuild, isBuilding = false }: SearchPanelProps) {
  const inputId = useId()
  const [query, setQuery] = useState('')

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!query.trim() || isBuilding) return
    onBuild(query.trim())
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form
      onSubmit={submit}
      className="animate-fade rounded-2xl border border-sea-deep/10 bg-white/85 p-5 shadow-[0_16px_50px_-28px_rgba(15,61,62,0.5)] backdrop-blur-md sm:p-7"
    >
      <label htmlFor={inputId} className="block">
        <span className="mb-2 block text-sm font-semibold text-ink">
          Scale names or constructs
        </span>
        <textarea
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          placeholder='e.g. “PSS-10, PHQ-9” or “perceived stress and depression”'
          className="w-full resize-y rounded-xl border border-sand bg-paper/70 px-4 py-3 text-base leading-relaxed text-ink placeholder:text-ink-soft/55 outline-none transition focus:border-sea-bright focus:bg-white focus:ring-2 focus:ring-sea-bright/25"
        />
      </label>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_SCALE_HINTS.map((hint) => (
            <button
              key={hint.shortName}
              type="button"
              onClick={() =>
                setQuery((prev) => {
                  const next = prev.trim()
                  if (!next) return hint.shortName
                  if (next.toLowerCase().includes(hint.shortName.toLowerCase()))
                    return next
                  return `${next}, ${hint.shortName}`
                })
              }
              className="rounded-lg border border-sand bg-paper/80 px-3 py-1.5 text-xs font-medium text-sea-deep transition hover:border-sea/30 hover:bg-mist"
            >
              {hint.shortName}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={!query.trim() || isBuilding}
          className="inline-flex items-center justify-center rounded-xl bg-sea-deep px-5 py-3 text-sm font-semibold text-mist shadow-[0_8px_24px_-12px_rgba(15,61,62,0.8)] transition hover:bg-sea enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Build survey
        </button>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-soft">
        Currently available: PSS-10 (perceived stress) and PHQ-9 (depression).
        Enter one or more names, or describe the construct in plain English.
      </p>
    </form>
  )
}
