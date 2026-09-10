import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from '../../context/LocaleContext'
import {
  OTHER_SCHOOL_ID,
  SCHOOL_GROUPS,
  filterSchools,
  groupSchools,
  schoolById,
  schoolLabel,
  schoolOptionNames,
} from '../../data/universities'

type Props = {
  schoolId: string
  otherSchool: string
  onSchoolIdChange: (id: string) => void
  onOtherSchoolChange: (value: string) => void
}

export function SchoolSelect({
  schoolId,
  otherSchool,
  onSchoolIdChange,
  onOtherSchoolChange,
}: Props) {
  const { locale, t } = useLocale()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = schoolById(schoolId)
  const selectedLabel =
    schoolId && schoolId !== OTHER_SCHOOL_ID && selected
      ? schoolLabel(selected, locale)
      : schoolId === OTHER_SCHOOL_ID
        ? t('목록에 없음 (직접 입력)', 'Not in list (enter manually)')
        : ''

  const matches = useMemo(() => filterSchools(open ? query : ''), [open, query])
  const grouped = useMemo(() => groupSchools(matches), [matches])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function pick(id: string) {
    onSchoolIdChange(id)
    setQuery('')
    setOpen(false)
    if (id !== OTHER_SCHOOL_ID) onOtherSchoolChange('')
  }

  return (
    <div ref={rootRef} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-sea-deep">
          {t('소속 학교', 'School')}
        </span>
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="school-listbox"
          autoComplete="off"
          required={schoolId !== OTHER_SCHOOL_ID}
          value={open ? query : selectedLabel}
          placeholder={t(
            '한글 또는 영문 검색 (예: 서울대, Harvard)',
            'Search in Korean or English (e.g. Seoul, Harvard)',
          )}
          onFocus={() => {
            setOpen(true)
            setQuery('')
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            if (schoolId) onSchoolIdChange('')
          }}
          className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 outline-none transition focus:border-sea/40 focus:ring-4 focus:ring-sea/10"
        />
        <input type="text" tabIndex={-1} className="hidden" value={schoolId} required readOnly />
      </label>

      {open && (
        <ul
          id="school-listbox"
          role="listbox"
          className="max-h-64 overflow-y-auto rounded-xl border border-sand bg-white py-1 shadow-lg"
        >
          {SCHOOL_GROUPS.map((group) => {
            const schools = grouped[group.id]
            if (schools.length === 0) return null
            return (
              <li key={group.id}>
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  {locale === 'ko' ? group.labelKr : group.labelEn}
                </p>
                {schools.map((school) => {
                  const names = schoolOptionNames(school, locale, query)
                  return (
                    <button
                      key={school.id}
                      type="button"
                      role="option"
                      aria-selected={schoolId === school.id}
                      onClick={() => pick(school.id)}
                      className={[
                        'block w-full px-3 py-2 text-left text-sm hover:bg-mist/70',
                        schoolId === school.id ? 'bg-sea/10 font-semibold text-sea-deep' : 'text-ink',
                      ].join(' ')}
                    >
                      <span className="block">{names.primary}</span>
                      {names.secondary && (
                        <span className="mt-0.5 block text-xs font-normal text-ink-soft">
                          {names.secondary}
                        </span>
                      )}
                    </button>
                  )
                })}
              </li>
            )
          })}
          {matches.length === 0 && (
            <li className="px-3 py-2 text-sm text-ink-soft">
              {t('검색 결과가 없습니다.', 'No matching schools.')}
            </li>
          )}
          <li className="border-t border-sand mt-1">
            <button
              type="button"
              onClick={() => pick(OTHER_SCHOOL_ID)}
              className="block w-full px-3 py-2.5 text-left text-sm font-medium text-sea hover:bg-mist/70"
            >
              {t('목록에 없음 — 직접 입력', 'Not in the list — type it')}
            </button>
          </li>
        </ul>
      )}

      {schoolId === OTHER_SCHOOL_ID && (
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-sea-deep">
            {t('소속 학교 / 기관명', 'School / institution name')}
          </span>
          <input
            value={otherSchool}
            onChange={(e) => onOtherSchoolChange(e.target.value)}
            required
            placeholder={t('예: ○○연구소, ○○병원', 'e.g. research institute, hospital')}
            className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 outline-none transition focus:border-sea/40 focus:ring-4 focus:ring-sea/10"
          />
        </label>
      )}
    </div>
  )
}
