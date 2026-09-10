import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createStudy, listStudies, resetLocalDemo } from '../../lib/api'
import { useLocale } from '../../context/LocaleContext'
import type { Study } from '../../types/database'

export function StudiesPage() {
  const [studies, setStudies] = useState<Study[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useLocale()

  async function refresh() {
    setLoading(true)
    try {
      setStudies(await listStudies())
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('연구 목록을 불러오지 못했습니다.', 'Failed to load studies'),
      )
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
      setError(
        err instanceof Error
          ? err.message
          : t('연구를 생성하지 못했습니다.', 'Could not create study'),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade">
      <section>
        <h2 className="font-display text-xl font-semibold text-sea-deep">
          {t('연구 목록', 'Your studies')}
        </h2>
        {loading ? (
          <p className="mt-4 text-sm text-ink-soft">{t('불러오는 중…', 'Loading…')}</p>
        ) : studies.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">
            {t('등록된 연구가 없습니다. 아래에서 새로 만들어 보세요.', 'No studies yet. Create one below.')}
          </p>
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

      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-sea-deep">
          {t('새 연구 만들기', 'New study')}
        </h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-sea-deep">
              {t('연구 제목 (Title)', 'Title')}
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 outline-none transition focus:border-sea/40 focus:ring-4 focus:ring-sea/10"
              placeholder={t('예: 일일 스트레스 및 웰빙 다이어리 연구', 'e.g. Campus stress diary')}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-sea-deep">
              {t('연구 설명 (Description)', 'Description')}
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-sand bg-white px-3 py-2.5 outline-none transition focus:border-sea/40 focus:ring-4 focus:ring-sea/10"
              placeholder={t('연구 목적 및 간략한 설명…', 'Brief study aims…')}
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
            {saving ? t('생성 중…', 'Creating…') : t('연구 생성하기', 'Create study')}
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
        {t('내 워크스페이스 데모 데이터 초기화', 'Reset my workspace demo data')}
      </button>
    </div>
  )
}
