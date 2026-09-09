import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createStudy, listStudies, resetLocalDemo } from '../../lib/api'
import type { Study } from '../../types/database'

export function StudiesPage() {
  const [studies, setStudies] = useState<Study[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      setStudies(await listStudies())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load studies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createStudy({ title: title.trim(), description: description.trim() })
      setTitle('')
      setDescription('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create study')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade">
      <section>
        <h2 className="font-display text-xl font-semibold text-sea-deep">Your studies</h2>
        {loading ? (
          <p className="mt-4 text-sm text-ink-soft">Loading…</p>
        ) : studies.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">No studies yet. Create one below.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {studies.map((study) => (
              <li key={study.id}>
                <Link
                  to={`/researcher/studies/${study.id}`}
                  className="block rounded-2xl border border-sand/80 bg-white/60 px-4 py-4 transition hover:border-sea/30 hover:bg-white"
                >
                  <p className="font-semibold text-sea-deep">{study.title}</p>
                  {study.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                      {study.description}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5">
        <h2 className="font-display text-lg font-semibold text-sea-deep">New study</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-sea-deep">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 outline-none focus:border-sea/40 focus:ring-4 focus:ring-sea/10"
              placeholder="e.g. Campus stress diary"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-sea-deep">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 outline-none focus:border-sea/40 focus:ring-4 focus:ring-sea/10"
              placeholder="Brief study aims…"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-warn">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-sea px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sea-bright disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create study'}
          </button>
        </form>
      </section>

      <button
        type="button"
        onClick={() => {
          resetLocalDemo()
          void refresh()
        }}
        className="text-xs text-ink-soft underline-offset-2 hover:underline"
      >
        Reset local demo data
      </button>
    </div>
  )
}
