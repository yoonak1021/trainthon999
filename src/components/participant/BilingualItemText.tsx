import type { ContentLocale, SurveyItem } from '../../types/database'
import {
  anchorForLocale,
  itemTextForLocale,
  localizeOptions,
} from '../../data/scales'

type BilingualItemTextProps = {
  item: SurveyItem
  locale: ContentLocale
  className?: string
}

/** Primary wording for active locale; secondary language shown muted when present. */
export function BilingualItemText({
  item,
  locale,
  className,
}: BilingualItemTextProps) {
  const primary = itemTextForLocale(item, locale)
  const secondary =
    locale === 'ko'
      ? item.item_text_en
      : item.item_text_kr || item.item_text

  return (
    <div className={className}>
      <p className="font-display text-[1.45rem] font-semibold leading-snug text-sea-deep sm:text-[1.6rem]">
        {primary}
      </p>
      {secondary && secondary !== primary && (
        <p className="mt-2 text-sm leading-snug text-ink-soft">{secondary}</p>
      )}
    </div>
  )
}

export function localizedItemView(item: SurveyItem, locale: ContentLocale) {
  return {
    text: itemTextForLocale(item, locale),
    options: localizeOptions(item.response_options, locale),
    leftAnchor: anchorForLocale(item, 'left', locale),
    rightAnchor: anchorForLocale(item, 'right', locale),
  }
}
