import type { ContentLocale, SurveyItem } from '../../types/database'
import { itemTextForLocale } from '../../data/scales'

type CondensedItemRowProps = {
  item: SurveyItem
  index: number
  locale: ContentLocale
  busy: boolean
  isDragging: boolean
  isDragOver: boolean
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDragEnd: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, index: number) => void
  onEdit: (item: SurveyItem) => void
  onDelete: (id: string) => void
}

export function CondensedItemRow({
  item,
  index,
  locale,
  busy,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onEdit,
  onDelete,
}: CondensedItemRowProps) {
  const primary = itemTextForLocale(item, locale)
  const secondary =
    locale === 'ko' ? item.item_text_en : item.item_text_kr || item.item_text

  return (
    <tr
      draggable={!busy}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      className={[
        'group border-b border-sand/60 transition select-none',
        isDragging ? 'opacity-30 bg-mist/60' : 'bg-white/80 hover:bg-mist/30',
        isDragOver ? 'border-t-2 border-t-sea bg-sea/5' : '',
      ].join(' ')}
    >
      {/* Drag Handle & Order */}
      <td className="w-16 py-2.5 pl-3 pr-1 text-xs text-ink-soft">
        <div className="flex items-center gap-1.5">
          <span
            className="cursor-grab active:cursor-grabbing p-1 text-ink-soft/40 group-hover:text-sea hover:bg-mist rounded transition"
            title="Drag to reorder"
          >
            <svg width="12" height="14" viewBox="0 0 12 16" fill="currentColor">
              <circle cx="4" cy="3" r="1.5" />
              <circle cx="8" cy="3" r="1.5" />
              <circle cx="4" cy="8" r="1.5" />
              <circle cx="8" cy="8" r="1.5" />
              <circle cx="4" cy="13" r="1.5" />
              <circle cx="8" cy="13" r="1.5" />
            </svg>
          </span>
          <span className="font-semibold text-sea-deep text-[11px] tabular-nums">
            #{item.display_order}
          </span>
        </div>
      </td>

      {/* Variable Name & Scale */}
      <td className="w-36 py-2.5 px-2 text-xs">
        <span className="inline-block rounded bg-mist px-1.5 py-0.5 font-mono text-[11px] font-semibold text-sea-deep">
          {item.variable_name}
        </span>
        {(item.scale_name || item.subscale) && (
          <span className="mt-0.5 block truncate text-[10px] text-ink-soft">
            {item.scale_name}
            {item.subscale ? ` · ${item.subscale}` : ''}
          </span>
        )}
      </td>

      {/* Question Text (Bilingual Snippet) */}
      <td className="py-2.5 px-2 text-xs">
        <p className="line-clamp-1 font-medium text-sea-deep leading-snug">
          {primary}
        </p>
        {secondary && secondary !== primary && (
          <p className="line-clamp-1 text-[11px] text-ink-soft leading-snug">
            {secondary}
          </p>
        )}
      </td>

      {/* Item Type & Flags */}
      <td className="w-28 py-2.5 px-2 text-xs">
        <div className="flex flex-wrap items-center gap-1">
          <span className="rounded bg-sand/50 px-1.5 py-0.5 text-[10px] text-ink-soft capitalize">
            {item.item_type.replace('_', ' ')}
          </span>
          {item.reverse_scored && (
            <span
              className="rounded bg-warn-bg px-1.5 py-0.5 text-[10px] font-bold text-warn"
              title="Reverse scored item"
            >
              [R]
            </span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="w-24 py-2.5 pl-2 pr-3 text-right text-xs">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit(item)}
            className="rounded border border-sand/80 bg-white px-2 py-0.5 text-[11px] font-semibold text-sea transition hover:border-sea/40 hover:bg-mist"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(item.id)}
            className="p-1 text-xs text-ink-soft/70 hover:text-warn transition"
            title="Remove item"
          >
            ×
          </button>
        </div>
      </td>
    </tr>
  )
}
