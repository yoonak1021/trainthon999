import { SCHOOL_REGIONS, filterSchools, schoolLabel, type SchoolRegion } from '../../data/universities'
import { useLocale } from '../../context/LocaleContext'

const OTHER_VALUE = 'other'

type Props = {
  region: SchoolRegion | 'all'
  schoolId: string
  query: string
  otherSchool: string
  onRegionChange: (region: SchoolRegion | 'all') => void
  onSchoolIdChange: (id: string) => void
  onQueryChange: (query: string) => void
  onOtherSchoolChange: (value: string) => void
}

export function SchoolSelect({
  region,
  schoolId,
  query,
  otherSchool,
  onRegionChange,
  onSchoolIdChange,
  onQueryChange,
  onOtherSchoolChange,
}: Props) {
  const { locale, t } = useLocale()
  const schools = filterSchools(region, query)

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-sea-deep">
          {t('소속 지역', 'Region')}
        </span>
        <select
          value={region}
          onChange={(e) => {
            const next = e.target.value as SchoolRegion | 'all'
            onRegionChange(next)
            onSchoolIdChange('')
          }}
          className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 outline-none transition focus:border-sea/40 focus:ring-4 focus:ring-sea/10"
        >
          <option value="all">{t('전체 지역', 'All regions')}</option>
          {SCHOOL_REGIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {locale === 'ko' ? item.labelKr : item.labelEn}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-sea-deep">
          {t('학교 검색', 'Search school')}
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t('학교명, 예: 서울대 / Harvard', 'School name, e.g. Seoul National / Harvard')}
          className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 outline-none transition focus:border-sea/40 focus:ring-4 focus:ring-sea/10"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-sea-deep">
          {t('소속 학교', 'Affiliation')}
        </span>
        <select
          value={schoolId}
          onChange={(e) => onSchoolIdChange(e.target.value)}
          required
          className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 outline-none transition focus:border-sea/40 focus:ring-4 focus:ring-sea/10"
        >
          <option value="" disabled>
            {t('학교를 선택하세요', 'Select your school')}
          </option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {schoolLabel(school, locale)}
            </option>
          ))}
          <option value={OTHER_VALUE}>
            {t('기타 / 목록에 없음', 'Other / not in list')}
          </option>
        </select>
        <p className="mt-1 text-xs text-ink-soft">
          {t(
            `${schools.length}개 학교 표시 중 (한국·미국·캐나다·유럽)`,
            `${schools.length} schools shown (Korea, US, Canada, Europe)`,
          )}
        </p>
      </label>

      {schoolId === OTHER_VALUE && (
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-sea-deep">
            {t('소속 기관명 (직접 입력)', 'Institution name')}
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
