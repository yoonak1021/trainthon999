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
import { useLocale } from '../../context/LocaleContext'
import type { Participant, Prompt, PromptOccasion, Study, Survey } from '../../types/database'

export function StudyDetailPage() {
  const { studyId = '' } = useParams()
  const { t } = useLocale()
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
      setError(
        err instanceof Error
          ? err.message
          : t('연구 정보를 불러오지 못했습니다.', 'Failed to load study'),
      )
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
        label: t('14일 일일 설문 (Daily 14 days)', 'Daily for 14 days'),
        schedule_summary: 'daily for 14 days',
        cadence: 'daily',
        duration_days: 14,
      })
      setSurveyTitle('')
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('설문을 생성하지 못했습니다.', 'Could not create survey'),
      )
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
      setError(
        err instanceof Error
          ? err.message
          : t('참가자를 추가하지 못했습니다.', 'Could not add participant'),
      )
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-soft">{t('연구를 불러오는 중…', 'Loading study…')}</p>
  }

  if (!study) {
    return (
      <div>
        <p className="text-ink-soft">{t('연구를 찾을 수 없습니다.', 'Study not found.')}</p>
        <Link to="/researcher" className="mt-3 inline-block text-sm text-sea">
          {t('← 연구 목록으로 돌아가기', 'Back to studies')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade">
      <div>
        <Link to="/researcher" className="text-sm text-sea hover:underline">
          {t('← 연구 목록', '← Studies')}
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
            className="rounded-xl border border-sand bg-white/70 px-3.5 py-2 text-sm font-semibold text-sea-deep hover:border-sea/30 hover:bg-white transition shadow-2xs"
          >
            {t('수집된 데이터 및 채점 확인 (View responses)', 'View responses & scoring')}
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5 shadow-sm">
        <h3 className="font-display text-lg font-semibold text-sea-deep">
          {t('설문지 목록 (Surveys)', 'Surveys')}
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          {t(
            '설문지를 생성한 후, 설문지를 열어 검증된 심리학 척도나 커스텀 문항을 추가할 수 있습니다.',
            'Create a survey, then open it to add validated scales or custom items.',
          )}
        </p>
        <ul className="mt-3 space-y-2">
          {surveys.map((survey) => (
            <li key={survey.id}>
              <Link
                to={`/researcher/surveys/${survey.id}`}
                className="block rounded-2xl border border-sand/80 bg-white/75 px-4 py-3.5 transition hover:border-sea/40 hover:bg-white shadow-2xs"
              >
                <p className="font-semibold text-sea-deep">{survey.title}</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {t(
                    '문항 편집 · 척도 추가 · 순서 변경 열기 →',
                    'Open to add validated scales · custom items · reorder →',
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <form onSubmit={handleCreateSurvey} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={surveyTitle}
            onChange={(e) => setSurveyTitle(e.target.value)}
            placeholder={t('새 설문지 제목 입력 (예: 일일 스트레스 체크)', 'New survey title')}
            className="flex-1 rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-sea/40 focus:ring-4 focus:ring-sea/10"
            required
          />
          <button
            type="submit"
            className="rounded-xl bg-sea px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sea-bright"
          >
            {t('설문지 만들기', 'Create survey')}
          </button>
        </form>
        <p className="mt-2 text-xs text-ink-soft">
          {t('새로 생성된 설문지에는 14일 일일 발송 스케줄이 기본 생성됩니다.', 'New surveys get a 14-day daily prompt schedule by default.')}
        </p>
      </section>

      <section className="rounded-2xl border border-sand/80 bg-white/55 p-5 shadow-sm">
        <h3 className="font-display text-lg font-semibold text-sea-deep">
          {t('참가자 관리 (Participants)', 'Participants')}
        </h3>
        <p className="mt-1 text-xs text-ink-soft">
          {t('참가자 코드는 익명 고유 식별자입니다 (이메일/이름 등 개인식별정보 미저장).', 'Codes are anonymous IDs — no names or emails stored here.')}
        </p>
        <ul className="mt-3 divide-y divide-sand/70 rounded-2xl border border-sand/80 bg-white/75">
          {participants.length === 0 ? (
            <li className="px-4 py-3 text-sm text-ink-soft">
              {t('등록된 참가자가 없습니다.', 'No participants yet.')}
            </li>
          ) : (
            participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="font-semibold tracking-wide text-sea-deep font-mono">
                  {p.participant_code}
                </span>
                <Link
                  to={`/p?code=${encodeURIComponent(p.participant_code)}&study=${studyId}`}
                  className="text-xs font-semibold text-sea hover:underline"
                >
                  {t('참가자 링크 열기 →', 'Open link →')}
                </Link>
              </li>
            ))
          )}
        </ul>
        <form onSubmit={handleAddParticipant} className="mt-3 flex gap-2">
          <input
            value={participantCode}
            onChange={(e) => setParticipantCode(e.target.value)}
            placeholder={t('새 참가자 코드 (예: P001)', 'New code (e.g. P012)')}
            className="flex-1 rounded-xl border border-sand bg-white px-3.5 py-2.5 text-sm uppercase outline-none font-mono focus:border-sea/40"
            required
          />
          <button
            type="submit"
            className="rounded-xl border border-sand bg-white px-4 py-2.5 text-sm font-semibold text-sea-deep hover:bg-mist/50 transition"
          >
            {t('참가자 추가', 'Add')}
          </button>
        </form>
      </section>

      {promptInfo.length > 0 && (
        <section className="rounded-2xl border border-sand/80 bg-white/55 p-5 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-sea-deep">
            {t('발송 스케줄 (Prompt schedules)', 'Prompt schedules')}
          </h3>
          <ul className="mt-3 space-y-3">
            {promptInfo.map(({ prompt, occasions }) => (
              <li
                key={prompt.id}
                className="rounded-2xl border border-sand/80 bg-white/75 px-4 py-3 text-sm"
              >
                <p className="font-medium text-sea-deep">{prompt.label}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {prompt.schedule_summary ?? prompt.cadence} · {occasions.length} {t('회차', 'occasions')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
