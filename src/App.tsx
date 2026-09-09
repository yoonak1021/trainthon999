import { useState } from 'react'
import { SearchPanel } from './components/SearchPanel'
import { SurveyPreview } from './components/SurveyPreview'
import { downloadQualtricsTxt } from './lib/qualtricsExport'
import { buildSurvey } from './lib/search'
import type { EditableItem, EditableScale, ResponseOption } from './types'

export default function App() {
  const [scales, setScales] = useState<EditableScale[]>([])
  const [unmatched, setUnmatched] = useState<string[]>([])
  const [hasBuilt, setHasBuilt] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  function handleBuild(query: string) {
    const result = buildSurvey(query)
    setScales(result.scales)
    setUnmatched(result.unmatched)
    setHasBuilt(true)

    if (result.scales.length === 0) {
      setStatusMessage(
        'No matching validated scales found. Try “PSS-10”, “PHQ-9”, “stress”, or “depression”.',
      )
    } else {
      const names = result.scales.map((s) => s.shortName).join(', ')
      setStatusMessage(`Built ${result.scales.length} scale${result.scales.length === 1 ? '' : 's'}: ${names}.`)
    }
  }

  function updateScale(instanceId: string, patch: Partial<EditableScale>) {
    setScales((prev) =>
      prev.map((s) => (s.instanceId === instanceId ? { ...s, ...patch } : s)),
    )
  }

  function updateItem(
    instanceId: string,
    itemId: string,
    patch: Partial<EditableItem>,
  ) {
    setScales((prev) =>
      prev.map((s) =>
        s.instanceId !== instanceId
          ? s
          : {
              ...s,
              items: s.items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item,
              ),
            },
      ),
    )
  }

  function updateOption(
    instanceId: string,
    optionId: string,
    patch: Partial<ResponseOption>,
  ) {
    setScales((prev) =>
      prev.map((s) =>
        s.instanceId !== instanceId
          ? s
          : {
              ...s,
              responseOptions: s.responseOptions.map((opt) =>
                opt.id === optionId ? { ...opt, ...patch } : opt,
              ),
            },
      ),
    )
  }

  function removeScale(instanceId: string) {
    setScales((prev) => prev.filter((s) => s.instanceId !== instanceId))
  }

  function handleExport() {
    if (scales.length === 0) return
    downloadQualtricsTxt(scales)
    setStatusMessage('Downloaded Qualtrics Advanced Format (.txt) file.')
  }

  const itemCount = scales.reduce((n, s) => n + s.items.length, 0)

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="mb-8 animate-fade sm:mb-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-sea">
          Research survey tools
        </p>
        <h1 className="font-display text-[2rem] font-semibold leading-[1.15] tracking-tight text-sea-deep sm:text-5xl">
          Survey Scale Builder
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
          Turn validated psychological scales into an editable survey preview,
          then export a Qualtrics-ready Advanced Format file.
        </p>
      </header>

      <SearchPanel onBuild={handleBuild} />

      {statusMessage && (
        <div
          role="status"
          className="animate-fade mt-4 rounded-xl border border-sea/15 bg-mist/70 px-4 py-3 text-sm text-sea-deep"
        >
          {statusMessage}
          {unmatched.length > 0 && (
            <span className="mt-1 block text-warn">
              Could not match: {unmatched.join(', ')}
            </span>
          )}
        </div>
      )}

      {hasBuilt && scales.length > 0 && (
        <div className="mt-8 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-sea-deep">
                Survey preview
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Edit item wording or anchors before export · {scales.length}{' '}
                scale{scales.length === 1 ? '' : 's'} · {itemCount} items
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-center rounded-xl bg-sea px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-12px_rgba(31,111,106,0.85)] transition hover:bg-sea-bright active:scale-[0.98]"
            >
              Export for Qualtrics
            </button>
          </div>

          <SurveyPreview
            scales={scales}
            onUpdateScale={updateScale}
            onUpdateItem={updateItem}
            onUpdateOption={updateOption}
            onRemoveScale={removeScale}
          />
        </div>
      )}

      {hasBuilt && scales.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-sand bg-white/50 px-6 py-10 text-center">
          <p className="font-display text-xl text-sea-deep">No scales yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Search for PSS-10 or PHQ-9 to generate a preview.
          </p>
        </div>
      )}

      <footer className="mt-auto pt-12 text-center text-xs text-ink-soft/80">
        Client-side only · Qualtrics Advanced Format (Simple TXT) export
      </footer>
    </div>
  )
}
