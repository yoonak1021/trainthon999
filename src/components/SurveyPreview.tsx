import type { EditableItem, EditableScale, ResponseOption } from '../types'

type SurveyPreviewProps = {
  scales: EditableScale[]
  onUpdateScale: (instanceId: string, patch: Partial<EditableScale>) => void
  onUpdateItem: (
    instanceId: string,
    itemId: string,
    patch: Partial<EditableItem>,
  ) => void
  onUpdateOption: (
    instanceId: string,
    optionId: string,
    patch: Partial<ResponseOption>,
  ) => void
  onRemoveScale: (instanceId: string) => void
}

export function SurveyPreview({
  scales,
  onUpdateScale,
  onUpdateItem,
  onUpdateOption,
  onRemoveScale,
}: SurveyPreviewProps) {
  return (
    <div className="space-y-6">
      {scales.map((scale, index) => (
        <section
          key={scale.instanceId}
          className="animate-rise overflow-hidden rounded-2xl border border-sea-deep/10 bg-white/80 shadow-[0_12px_40px_-24px_rgba(15,61,62,0.45)] backdrop-blur-sm"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <header className="flex flex-col gap-4 border-b border-sand/80 bg-gradient-to-r from-sea-deep/[0.04] to-transparent px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-sea-deep px-2.5 py-1 text-xs font-semibold tracking-wide text-mist">
                  {scale.shortName}
                </span>
                <span className="text-xs text-ink-soft">
                  {scale.items.length} items · {scale.responseOptions.length} anchors
                </span>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
                  Scale title
                </span>
                <input
                  value={scale.name}
                  onChange={(e) =>
                    onUpdateScale(scale.instanceId, { name: e.target.value })
                  }
                  className="w-full rounded-xl border border-sand bg-paper/60 px-3 py-2.5 text-base font-medium text-ink outline-none transition focus:border-sea-bright focus:bg-white focus:ring-2 focus:ring-sea-bright/25"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
                  Instructions
                </span>
                <textarea
                  value={scale.instructions}
                  onChange={(e) =>
                    onUpdateScale(scale.instanceId, {
                      instructions: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full resize-y rounded-xl border border-sand bg-paper/60 px-3 py-2.5 text-sm leading-relaxed text-ink outline-none transition focus:border-sea-bright focus:bg-white focus:ring-2 focus:ring-sea-bright/25"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => onRemoveScale(scale.instanceId)}
              className="self-start rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-danger-soft hover:text-[#8a3a32]"
            >
              Remove
            </button>
          </header>

          <div className="border-b border-sand/80 px-5 py-5 sm:px-7">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
              Response options
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {scale.responseOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-2 rounded-xl border border-sand bg-paper/50 px-3 py-2"
                >
                  <span className="shrink-0 text-xs font-semibold text-sea">
                    {option.value}
                  </span>
                  <input
                    value={option.label}
                    onChange={(e) =>
                      onUpdateOption(scale.instanceId, option.id, {
                        label: e.target.value,
                      })
                    }
                    className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
                    aria-label={`Response option value ${option.value}`}
                  />
                </label>
              ))}
            </div>
          </div>

          <ol className="divide-y divide-sand/70">
            {scale.items.map((item) => (
              <li key={item.id} className="px-5 py-4 sm:px-7">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-mist text-xs font-semibold text-sea-deep">
                    {item.number}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateItem(scale.instanceId, item.id, {
                        reverseScored: !item.reverseScored,
                      })
                    }
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      item.reverseScored
                        ? 'bg-warn-bg text-warn ring-1 ring-warn/25'
                        : 'bg-mist/70 text-ink-soft hover:bg-mist'
                    }`}
                    aria-pressed={item.reverseScored}
                    title="Toggle reverse-scored"
                  >
                    {item.reverseScored ? 'Reverse-scored' : 'Mark reverse'}
                  </button>
                </div>
                <textarea
                  value={item.text}
                  onChange={(e) =>
                    onUpdateItem(scale.instanceId, item.id, {
                      text: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full resize-y rounded-xl border border-transparent bg-transparent px-0 py-1 text-[0.95rem] leading-relaxed text-ink outline-none transition hover:border-sand hover:bg-paper/40 hover:px-3 focus:border-sea-bright focus:bg-white focus:px-3 focus:ring-2 focus:ring-sea-bright/20"
                  aria-label={`Item ${item.number} text`}
                />
              </li>
            ))}
          </ol>

          <footer className="border-t border-sand/80 bg-paper/40 px-5 py-3 text-xs leading-relaxed text-ink-soft sm:px-7">
            {scale.citation}
          </footer>
        </section>
      ))}
    </div>
  )
}
