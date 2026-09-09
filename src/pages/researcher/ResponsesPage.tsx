import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getStudy, listStudyResponses } from '../../lib/api'
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
} from '../../lib/scoring'
import {
  loadScoringSettings,
  resetScoringSettings,
  saveScoringSettings,
} from '../../lib/scoringSettings'
import type { ResponseExportRow, Study } from '../../types/database'

export function ResponsesPage() {
  const { studyId = '' } = useParams()
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
          setError(err instanceof Error ? err.message : 'Failed to load responses')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [studyId])

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
        const v = w.scored.scores[col]
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
          ← Study
        </Link>
        <h2 className="mt-2 font-display text-2xl font-semibold text-sea-deep">
          Collected data
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {study?.title ?? '…'} · {summary.nResponses} answers ·{' '}
          {summary.nParticipants} participants · {summary.nOccasions} occasions
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}

      {/* ---- Protocol settings (surface clearly) ---- */}
      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-sea-deep">
              Scoring protocol settings
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft">
              Response min/max (for reverse-scoring), aggregation method, and
              missing-data rule are protocol decisions. Edit them here — they
              are not hidden in code. Changes recompute the scored table below.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className="rounded-xl border border-sand bg-white px-3 py-2 text-xs font-semibold text-sea-deep"
            >
              {settingsOpen ? 'Hide' : 'Show'}
            </button>
            <button
              type="button"
              onClick={() => setSettings(resetScoringSettings())}
              className="rounded-xl border border-sand bg-white px-3 py-2 text-xs font-semibold text-ink-soft"
            >
              Reset defaults
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
                        {meta?.name_kr ?? s.scaleId}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {meta?.name_en} · <span className="font-mono">{s.scaleId}</span>
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
                        Response min
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
                        Response max
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
                        Aggregation
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
                            {o.label}
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
                        Missing-data rule
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
          className="rounded-xl bg-sea px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Raw data (CSV)
        </button>
        <button
          type="button"
          disabled={wide.length === 0 || scoredColumns.length === 0}
          onClick={exportScoredCsv}
          className="rounded-xl bg-sea px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Scored data (CSV)
        </button>
        <button
          type="button"
          onClick={exportCodebook}
          className="rounded-xl border border-sand bg-white/80 px-4 py-2.5 text-sm font-semibold text-sea-deep"
        >
          Download codebook
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No responses yet. Open a participant link and complete a session.
        </p>
      ) : (
        <>
          {/* ---- Scored table: participants × scored variables ---- */}
          <section>
            <h3 className="font-display text-lg font-semibold text-sea-deep">
              Scored variables
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              One row per participant × occasion. Values from{' '}
              <code className="font-mono text-xs">scoreAll()</code> using the
              protocol settings above.
            </p>

            {scoredColumns.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">
                No scored variables for the scales in this study.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-sand/80 bg-white/60">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-sand/80 bg-mist/50 text-[11px] uppercase tracking-wide text-ink-soft">
                    <tr>
                      <th className="sticky left-0 bg-mist/80 px-3 py-2.5 font-semibold">
                        Code
                      </th>
                      <th className="px-3 py-2.5 font-semibold">Occasion</th>
                      {scoredColumns.map((col) => (
                        <th key={col} className="px-3 py-2.5 font-semibold font-mono normal-case">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wide.map((w) => (
                      <tr
                        key={`${w.participant_code}-${w.occasion_index}`}
                        className="border-b border-sand/50 last:border-0"
                      >
                        <td className="sticky left-0 bg-white/90 px-3 py-2.5 font-semibold text-sea-deep">
                          {w.participant_code}
                        </td>
                        <td className="px-3 py-2.5 text-ink-soft">
                          {w.occasion_label ?? w.occasion_index}
                        </td>
                        {scoredColumns.map((col) => {
                          const v = w.scored.scores[col]
                          const note = w.scored.notes[col]
                          return (
                            <td
                              key={col}
                              className="px-3 py-2.5 tabular-nums text-ink"
                              title={note}
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
          <section>
            <h3 className="font-display text-lg font-semibold text-sea-deep">
              Raw item log
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              Long format (one row per item response). Prefer “Raw data (CSV)” for
              a wide participant × item matrix.
            </p>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-sand/80 bg-white/60">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-sand/80 bg-mist/50 text-[11px] uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Code</th>
                    <th className="px-3 py-2.5 font-semibold">Occasion</th>
                    <th className="px-3 py-2.5 font-semibold">Variable</th>
                    <th className="px-3 py-2.5 font-semibold">Value</th>
                    <th className="px-3 py-2.5 font-semibold">Answered</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-sand/50 last:border-0">
                      <td className="px-3 py-2.5 font-semibold text-sea-deep">
                        {r.participant_code}
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft">
                        {r.occasion_label ?? r.occasion_index}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-ink">
                        {r.variable_name}
                        {r.reverse_scored && (
                          <span className="ml-1 font-sans text-warn">R</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-ink">
                        {r.numeric_value ?? r.text_value ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-ink-soft">
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
