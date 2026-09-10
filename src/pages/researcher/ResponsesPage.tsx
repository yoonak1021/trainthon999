import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getStudy, listStudyResponses } from '../../lib/api'
import { useLocale } from '../../context/LocaleContext'
import {
  buildWideRows,
  collectRawItemColumns,
  collectScaleIdsFromRows,
  downloadTextFile,
  scoredColumnNames,
  toCsv,
} from '../../lib/dataExport'
import {
  AGGREGATION_OPTIONS,
  MISSING_RULE_OPTIONS,
  buildCodebook,
  getInstrumentMeta,
  type AggregationMethod,
  type MissingDataRule,
  type ScaleScoringSettings,
} from '../../lib/scoringProtocol'
import {
  loadScoringSettings,
  resetScoringSettings,
  saveScoringSettings,
} from '../../lib/scoringSettings'
import type { ResponseExportRow, Study } from '../../types/database'

export function ResponsesPage() {
  const { studyId = '' } = useParams()
  const { t, locale } = useLocale()
  const [study, setStudy] = useState<Study | null>(null)
  const [rows, setRows] = useState<ResponseExportRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<Record<string, ScaleScoringSettings>>(() =>
    loadScoringSettings(),
  )
  const [settingsOpen, setSettingsOpen] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const s = await getStudy(studyId)
        const data = await listStudyResponses(studyId)
        if (cancelled) return
        setStudy(s)
        setRows(data)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t('응답 데이터를 불러오지 못했습니다.', 'Failed to load responses'),
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [studyId, t])

  const scaleIds = useMemo(() => collectScaleIdsFromRows(rows), [rows])
  const rawColumns = useMemo(() => collectRawItemColumns(rows), [rows])
  const scoredColumns = useMemo(() => scoredColumnNames(scaleIds), [scaleIds])
  const wide = useMemo(() => buildWideRows(rows, settings), [rows, settings])

  const summary = useMemo(() => {
    const participants = new Set(rows.map((r) => r.participant_code))
    const occasions = new Set(rows.map((r) => r.occasion_index))
    return {
      nResponses: rows.length,
      nParticipants: participants.size,
      nOccasions: occasions.size,
    }
  }, [rows])

  const settingsForStudy = useMemo(() => {
    const ids = scaleIds.length > 0 ? scaleIds : Object.keys(settings)
    return ids
      .map((id) => settings[id])
      .filter(Boolean) as ScaleScoringSettings[]
  }, [scaleIds, settings])

  function patchSetting(
    scaleId: string,
    patch: Partial<Omit<ScaleScoringSettings, 'scaleId'>>,
  ) {
    setSettings((prev) => {
      const next = {
        ...prev,
        [scaleId]: { ...prev[scaleId], ...patch, scaleId },
      }
      saveScoringSettings(next)
      return next
    })
  }

  function slug() {
    return (study?.title ?? 'study').replace(/\s+/g, '-').toLowerCase()
  }

  function exportRawCsv() {
    const headers = [
      'participant_code',
      'occasion_index',
      'occasion_label',
      ...rawColumns,
    ]
    const body = wide.map((w) => [
      w.participant_code,
      w.occasion_index,
      w.occasion_label,
      ...rawColumns.map((col) => w.raw[col] ?? ''),
    ])
    downloadTextFile(`${slug()}-raw-data.csv`, toCsv(headers, body))
  }

  function exportScoredCsv() {
    const headers = [
      'participant_code',
      'occasion_index',
      'occasion_label',
      ...scoredColumns,
    ]
    const body = wide.map((w) => [
      w.participant_code,
      w.occasion_index,
      w.occasion_label,
      ...scoredColumns.map((col) => {
        const v = w.scored[col]
        return v == null ? '' : Number(v.toFixed(6))
      }),
    ])
    downloadTextFile(`${slug()}-scored-data.csv`, toCsv(headers, body))
  }

  function exportCodebook() {
    const codebook = buildCodebook(settings, {
      scaleIds: scaleIds.length > 0 ? scaleIds : undefined,
    })
    const headers = [
      'variable_name',
      'kind',
      'scale_id',
      'scale_name_en',
      'scale_name_kr',
      'position_in_scale',
      'subscale',
      'reverse_scored',
      'text_en',
      'text_kr',
      'scored_from_items',
      'aggregation',
      'response_min',
      'response_max',
      'missing_rule',
      'notes',
    ] as const
    const body = codebook.map((row) =>
      headers.map((h) => {
        const v = row[h]
        if (typeof v === 'boolean') return v ? 'true' : 'false'
        return v
      }),
    )
    downloadTextFile(`${slug()}-codebook.csv`, toCsv([...headers], body))
  }

  return (
    <div className="space-y-8 animate-fade">
      <div>
        <Link
          to={`/researcher/studies/${studyId}`}
          className="text-sm text-sea hover:underline"
        >
          {t('← 연구 화면', '← Study')}
        </Link>
        <h2 className="mt-2 font-display text-2xl font-semibold text-sea-deep">
          {t('수집된 데이터 및 채점', 'Collected data & scoring')}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {study?.title ?? '…'} · {summary.nResponses} {t('개 응답', 'answers')} ·{' '}
          {summary.nParticipants} {t('명 참가자', 'participants')} · {summary.nOccasions}{' '}
          {t('회차', 'occasions')}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}

      {/* ---- Protocol settings (surface clearly) ---- */}
      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-sea-deep">
              {t('채점 프로토콜 설정 (Scoring protocol settings)', 'Scoring protocol settings')}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft">
              {t(
                '응답 최솟값/최댓값(역코딩용), 집계 방식(합산/평균), 결측치 처리 규칙은 연구자의 프로토콜 결정 사항입니다. 여기서 수정한 설정은 아래 채점 표에 즉시 반영됩니다.',
                'Response min/max (for reverse-scoring), aggregation method, and missing-data rule are protocol decisions. Edit them here — they are not hidden in code. Changes recompute the scored table below.',
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className="rounded-xl border border-sand bg-white px-3 py-2 text-xs font-semibold text-sea-deep hover:bg-mist/50 transition"
            >
              {settingsOpen ? t('접기', 'Hide') : t('펼치기', 'Show')}
            </button>
            <button
              type="button"
              onClick={() => setSettings(resetScoringSettings())}
              className="rounded-xl border border-sand bg-white px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-mist/50 transition"
            >
              {t('기본값으로 재설정', 'Reset defaults')}
            </button>
          </div>
        </div>

        {settingsOpen && (
          <div className="mt-4 space-y-3">
            {(settingsForStudy.length > 0
              ? settingsForStudy
              : Object.values(settings).slice(0, 8)
            ).map((s) => {
              const meta = getInstrumentMeta(s.scaleId)
              return (
                <div
                  key={s.scaleId}
                  className="rounded-xl border border-sand/70 bg-white/80 p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sea-deep">
                        {locale === 'ko' ? meta?.name_kr || s.scaleId : meta?.name_en || s.scaleId}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {locale === 'ko' ? meta?.name_en : meta?.name_kr} ·{' '}
                        <span className="font-mono">{s.scaleId}</span>
                      </p>
                    </div>
                    {meta && (
                      <p className="max-w-md text-[11px] leading-snug text-ink-soft/90">
                        {meta.scoring_note}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold uppercase tracking-wide text-ink-soft">
                        {t('최솟값 (Response min)', 'Response min')}
                      </span>
                      <input
                        type="number"
                        value={s.min}
                        onChange={(e) =>
                          patchSetting(s.scaleId, { min: Number(e.target.value) })
                        }
                        className="w-full rounded-lg border border-sand bg-white px-2.5 py-2 text-sm outline-none focus:border-sea/40"
                      />
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold uppercase tracking-wide text-ink-soft">
                        {t('최댓값 (Response max)', 'Response max')}
                      </span>
                      <input
                        type="number"
                        value={s.max}
                        onChange={(e) =>
                          patchSetting(s.scaleId, { max: Number(e.target.value) })
                        }
                        className="w-full rounded-lg border border-sand bg-white px-2.5 py-2 text-sm outline-none focus:border-sea/40"
                      />
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold uppercase tracking-wide text-ink-soft">
                        {t('집계 방식 (Aggregation)', 'Aggregation')}
                      </span>
                      <select
                        value={s.aggregation}
                        onChange={(e) =>
                          patchSetting(s.scaleId, {
                            aggregation: e.target.value as AggregationMethod,
                          })
                        }
                        className="w-full rounded-lg border border-sand bg-white px-2.5 py-2 text-sm outline-none focus:border-sea/40"
                      >
                        {AGGREGATION_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value} title={o.help}>
                            {o.label} ({o.value === 'sum' ? t('합산', 'Sum') : t('평균', 'Mean')})
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-[11px] text-ink-soft">
                        {
                          AGGREGATION_OPTIONS.find((o) => o.value === s.aggregation)
                            ?.help
                        }
                      </span>
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1 block font-semibold uppercase tracking-wide text-ink-soft">
                        {t('결측치 규칙 (Missing-data rule)', 'Missing-data rule')}
                      </span>
                      <select
                        value={s.missingRule}
                        onChange={(e) =>
                          patchSetting(s.scaleId, {
                            missingRule: e.target.value as MissingDataRule,
                          })
                        }
                        className="w-full rounded-lg border border-sand bg-white px-2.5 py-2 text-sm outline-none focus:border-sea/40"
                      >
                        {MISSING_RULE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value} title={o.help}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-[11px] text-ink-soft">
                        {
                          MISSING_RULE_OPTIONS.find((o) => o.value === s.missingRule)
                            ?.help
                        }
                      </span>
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ---- Exports ---- */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={wide.length === 0}
          onClick={exportRawCsv}
          className="rounded-xl bg-sea px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sea-bright disabled:opacity-40"
        >
          {t('원자료 다운로드 (Raw data CSV)', 'Raw data (CSV)')}
        </button>
        <button
          type="button"
          disabled={wide.length === 0 || scoredColumns.length === 0}
          onClick={exportScoredCsv}
          className="rounded-xl bg-sea px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sea-bright disabled:opacity-40"
        >
          {t('채점 데이터 다운로드 (Scored data CSV)', 'Scored data (CSV)')}
        </button>
        <button
          type="button"
          onClick={exportCodebook}
          className="rounded-xl border border-sand bg-white/80 px-4 py-2.5 text-sm font-semibold text-sea-deep hover:bg-white transition"
        >
          {t('코드북 다운로드 (Download codebook)', 'Download codebook')}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">
          {t('아직 수집된 응답이 없습니다. 참가자 링크를 열어 설문을 완료해 보세요.', 'No responses yet. Open a participant link and complete a session.')}
        </p>
      ) : (
        <>
          {/* ---- Scored table: participants × scored variables ---- */}
          <section className="space-y-2">
            <h3 className="font-display text-lg font-semibold text-sea-deep">
              {t('채점된 척도 변수 (Scored variables)', 'Scored variables')}
            </h3>
            <p className="text-xs text-ink-soft">
              {t(
                '참가자 × 회차별 1행. 위 채점 프로토콜 설정에 따라 scoreAll() 함수로 실시간 자동 계산됩니다.',
                'One row per participant × occasion. Values from scoreAll() using the protocol settings above.',
              )}
            </p>

            {scoredColumns.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">
                {t('이 설문에 채점 가능한 척도 변수가 없습니다.', 'No scored variables for the scales in this study.')}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-sand/80 bg-white/70 shadow-sm">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-sand/80 bg-mist/50 text-[11px] uppercase tracking-wide text-ink-soft font-semibold">
                    <tr>
                      <th className="sticky left-0 bg-mist/90 px-3 py-2.5">
                        {t('코드 (Code)', 'Code')}
                      </th>
                      <th className="px-3 py-2.5">{t('회차 (Occasion)', 'Occasion')}</th>
                      {scoredColumns.map((col) => (
                        <th key={col} className="px-3 py-2.5 font-mono normal-case">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wide.map((w) => (
                      <tr
                        key={`${w.participant_code}-${w.occasion_index}`}
                        className="border-b border-sand/50 last:border-0 hover:bg-mist/30"
                      >
                        <td className="sticky left-0 bg-white/95 px-3 py-2.5 font-semibold text-sea-deep font-mono">
                          {w.participant_code}
                        </td>
                        <td className="px-3 py-2.5 text-ink-soft">
                          {w.occasion_label ?? w.occasion_index}
                        </td>
                        {scoredColumns.map((col) => {
                          const v = w.scored[col]
                          return (
                            <td
                              key={col}
                              className="px-3 py-2.5 tabular-nums font-semibold text-sea-deep font-mono"
                            >
                              {v == null ? '—' : roundDisplay(v)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ---- Long raw log (secondary) ---- */}
          <section className="space-y-2">
            <h3 className="font-display text-lg font-semibold text-sea-deep">
              {t('원자료 상세 로그 (Raw item log)', 'Raw item log')}
            </h3>
            <p className="text-xs text-ink-soft">
              {t(
                '개별 문항별 Long 포맷 응답 기록입니다. 와이드 매트릭스는 "원자료 다운로드 (CSV)"를 이용하세요.',
                'Long format (one row per item response). Prefer “Raw data (CSV)” for a wide participant × item matrix.',
              )}
            </p>
            <div className="overflow-x-auto rounded-2xl border border-sand/80 bg-white/70 shadow-sm">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-sand/80 bg-mist/50 text-[11px] uppercase tracking-wide text-ink-soft font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">{t('코드', 'Code')}</th>
                    <th className="px-3 py-2.5">{t('회차', 'Occasion')}</th>
                    <th className="px-3 py-2.5">{t('변수명', 'Variable')}</th>
                    <th className="px-3 py-2.5">{t('응답값', 'Value')}</th>
                    <th className="px-3 py-2.5">{t('응답 일시', 'Answered')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-sand/50 last:border-0 hover:bg-mist/30">
                      <td className="px-3 py-2.5 font-semibold text-sea-deep font-mono">
                        {r.participant_code}
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft">
                        {r.occasion_label ?? r.occasion_index}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-ink">
                        {r.variable_name}
                        {r.reverse_scored && (
                          <span className="ml-1 rounded bg-warn-bg px-1 py-0.5 text-[10px] font-sans font-bold text-warn">
                            R
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-ink font-semibold">
                        {r.numeric_value ?? r.text_value ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft text-[11px]">
                        {new Date(r.answered_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function roundDisplay(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(3).replace(/\.?0+$/, '')
}
