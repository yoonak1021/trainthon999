import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createParticipant,
  createPromptWithOccasions,
  createSurvey,
  listOccasions,
  listParticipants,
  listPrompts,
  listSurveys,
  getStudy,
} from '../../lib/api'
import type { Participant, Prompt, PromptOccasion, Study, Survey } from '../../types/database'

export function StudyDetailPage() {
  const { studyId = '' } = useParams()
  const [study, setStudy] = useState<Study | null>(null)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [promptInfo, setPromptInfo] = useState<
    { prompt: Prompt; occasions: PromptOccasion[] }[]
  >([])
  const [surveyTitle, setSurveyTitle] = useState('')
  const [participantCode, setParticipantCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const s = await getStudy(studyId)
      setStudy(s)
      const surveyList = await listSurveys(studyId)
      setSurveys(surveyList)
      setParticipants(await listParticipants(studyId))

      const info: { prompt: Prompt; occasions: PromptOccasion[] }[] = []
      for (const survey of surveyList) {
        const prompts = await listPrompts(survey.id)
        for (const prompt of prompts) {
          info.push({ prompt, occasions: await listOccasions(prompt.id) })
        }
      }
      setPromptInfo(info)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load study')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [studyId])

  async function handleCreateSurvey(e: FormEvent) {
    e.preventDefault()
    if (!surveyTitle.trim()) return
    try {
      const survey = await createSurvey({
        study_id: studyId,
        title: surveyTitle.trim(),
      })
      await createPromptWithOccasions({
        survey_id: survey.id,
        label: 'Daily for 14 days',
        schedule_summary: 'daily for 14 days',
        cadence: 'daily',
        duration_days: 14,
      })
      setSurveyTitle('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create survey')
    }
  }

  async function handleAddParticipant(e: FormEvent) {
    e.preventDefault()
    if (!participantCode.trim()) return
    try {
      await createParticipant({
        study_id: studyId,
        participant_code: participantCode.trim(),
      })
      setParticipantCode('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add participant')
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-soft">Loading study…</p>
  }

  if (!study) {
    return (
      <div>
        <p className="text-ink-soft">Study not found.</p>
        <Link to="/researcher" className="mt-3 inline-block text-sm text-sea">
          Back to studies
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade">
      <div>
        <Link to="/researcher" className="text-sm text-sea hover:underline">
          ← Studies
        </Link>
        <h2 className="mt-2 font-display text-2xl font-semibold text-sea-deep">
          {study.title}
        </h2>
        {study.description && (
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{study.description}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to={`/researcher/studies/${studyId}/responses`}
            className="rounded-xl border border-sand bg-white/70 px-3 py-2 text-sm font-medium text-sea-deep hover:border-sea/30"
          >
            View responses
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}

      <section>
        <h3 className="font-display text-lg font-semibold text-sea-deep">Surveys</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Create a survey, then open it to add validated scales or custom items.
        </p>
        <ul className="mt-3 space-y-2">
          {surveys.map((survey) => (
            <li key={survey.id}>
              <Link
                to={`/researcher/surveys/${survey.id}`}
                className="block rounded-2xl border border-sand/80 bg-white/60 px-4 py-3.5 transition hover:border-sea/30"
              >
                <p className="font-semibold text-sea-deep">{survey.title}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Open to add validated scales · custom items · reorder
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <form onSubmit={handleCreateSurvey} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={surveyTitle}
            onChange={(e) => setSurveyTitle(e.target.value)}
            placeholder="New survey title"
            className="flex-1 rounded-xl border border-sand bg-white px-3 py-2.5 text-sm outline-none focus:border-sea/40"
            required
          />
          <button
            type="submit"
            className="rounded-xl bg-sea px-4 py-2.5 text-sm font-semibold text-white"
          >
            Create survey
          </button>
        </form>
        <p className="mt-2 text-xs text-ink-soft">
          New surveys get a 14-day daily prompt schedule by default.
        </p>
      </section>

      <section>
        <h3 className="font-display text-lg font-semibold text-sea-deep">Participants</h3>
        <p className="mt-1 text-xs text-ink-soft">
          Codes are anonymous IDs — no names or emails stored here.
        </p>
        <ul className="mt-3 divide-y divide-sand/70 rounded-2xl border border-sand/80 bg-white/55">
          {participants.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-soft">No participants yet.</li>
          ) : (
            participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="font-semibold tracking-wide text-sea-deep">
                  {p.participant_code}
                </span>
                <Link
                  to={`/p?code=${encodeURIComponent(p.participant_code)}&study=${studyId}`}
                  className="text-xs font-medium text-sea hover:underline"
                >
                  Open link
                </Link>
              </li>
            ))
          )}
        </ul>
        <form onSubmit={handleAddParticipant} className="mt-3 flex gap-2">
          <input
            value={participantCode}
            onChange={(e) => setParticipantCode(e.target.value)}
            placeholder="New code (e.g. P012)"
            className="flex-1 rounded-xl border border-sand bg-white px-3 py-2.5 text-sm uppercase outline-none focus:border-sea/40"
            required
          />
          <button
            type="submit"
            className="rounded-xl border border-sand bg-white px-4 py-2.5 text-sm font-semibold text-sea-deep"
          >
            Add
          </button>
        </form>
      </section>

      {promptInfo.length > 0 && (
        <section>
          <h3 className="font-display text-lg font-semibold text-sea-deep">
            Prompt schedules
          </h3>
          <ul className="mt-3 space-y-3">
            {promptInfo.map(({ prompt, occasions }) => (
              <li
                key={prompt.id}
                className="rounded-2xl border border-sand/80 bg-white/55 px-4 py-3 text-sm"
              >
                <p className="font-medium text-sea-deep">{prompt.label}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {prompt.schedule_summary ?? prompt.cadence} · {occasions.length} occasions
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
