import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getStudy, listStudyResponses } from '../../lib/api'
import type { ResponseExportRow, Study } from '../../types/database'

export function ResponsesPage() {
  const { studyId = '' } = useParams()
  const [study, setStudy] = useState<Study | null>(null)
  const [rows, setRows] = useState<ResponseExportRow[]>([])
  const [error, setError] = useState<string | null>(null)

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

  const summary = useMemo(() => {
    const participants = new Set(rows.map((r) => r.participant_code))
    const occasions = new Set(rows.map((r) => r.occasion_index))
    return {
      nResponses: rows.length,
      nParticipants: participants.size,
      nOccasions: occasions.size,
    }
  }, [rows])

  function downloadCsv() {
    const header = [
      'participant_code',
      'occasion_index',
      'occasion_label',
      'variable_name',
      'scale_name',
      'position_in_scale',
      'reverse_scored',
      'numeric_value',
      'text_value',
      'answered_at',
    ]
    const lines = [
      header.join(','),
      ...rows.map((r) =>
        [
          r.participant_code,
          r.occasion_index,
          csv(r.occasion_label),
          r.variable_name,
          csv(r.scale_name),
          r.position_in_scale ?? '',
          r.reverse_scored,
          r.numeric_value ?? '',
          csv(r.text_value),
          r.answered_at,
        ].join(','),
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${study?.title ?? 'study'}-responses.csv`.replace(/\s+/g, '-').toLowerCase()
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 animate-fade">
      <div>
        <Link
          to={`/researcher/studies/${studyId}`}
          className="text-sm text-sea hover:underline"
        >
          ← Study
        </Link>
        <h2 className="mt-2 font-display text-2xl font-semibold text-sea-deep">
          Responses
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

      <div className="flex gap-3">
        <button
          type="button"
          disabled={rows.length === 0}
          onClick={downloadCsv}
          className="rounded-xl bg-sea px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Download CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No responses yet. Open a participant link and complete a session.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-sand/80 bg-white/60">
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
      )}
    </div>
  )
}

function csv(value: string | null | undefined): string {
  if (value == null) return ''
  const escaped = String(value).replace(/"/g, '""')
  return `"${escaped}"`
}
