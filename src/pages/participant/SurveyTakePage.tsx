import { useEffect, useState, useTransition } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ItemRenderer } from '../../components/participant/ItemRenderer'
import { isAnswerComplete } from '../../components/participant/answerUtils'
import { ProgressBar } from '../../components/participant/ProgressBar'
import {
  listResponsesForOccasion,
  resolveParticipationSession,
  saveResponse,
} from '../../lib/api'
import type {
  AnswerInput,
  Participant,
  PromptOccasion,
  Survey,
  SurveyItem,
} from '../../types/database'

type Session = {
  participant: Participant
  survey: Survey
  items: SurveyItem[]
  occasion: PromptOccasion
  studyTitle: string
}

type Phase = 'loading' | 'intro' | 'items' | 'error'

export function SurveyTakePage() {
  const { code = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [phase, setPhase] = useState<Phase>('loading')
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerInput>>({})
  const [saving, setSaving] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [animKey, setAnimKey] = useState(0)
  const [, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const resolved = await resolveParticipationSession({
          studyId: params.get('study') ?? undefined,
          participantCode: code,
          occasionId: params.get('occasion') ?? undefined,
        })
        if (cancelled) return
        if (!resolved || resolved.items.length === 0) {
          setError(
            'We couldn’t find an active survey for that code. Check with your researcher.',
          )
          setPhase('error')
          return
        }

        const existing = await listResponsesForOccasion(
          resolved.participant.id,
          resolved.occasion.id,
        )
        const mapped: Record<string, AnswerInput> = {}
        for (const r of existing) {
          mapped[r.survey_item_id] = {
            numeric_value: r.numeric_value,
            text_value: r.text_value,
            selected_values: r.selected_values,
          }
        }

        setAnswers(mapped)
        setSession({
          participant: resolved.participant,
          survey: resolved.survey,
          items: resolved.items,
          occasion: resolved.occasion,
          studyTitle: resolved.study.title,
        })
        setPhase('intro')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Something went wrong.')
        setPhase('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [code, params])

  const item = session?.items[index]
  const total = session?.items.length ?? 0
  const currentAnswer = item ? answers[item.id] : undefined
  const canContinue = item ? isAnswerComplete(item, currentAnswer) : false

  function setAnswer(itemId: string, answer: AnswerInput) {
    setAnswers((prev) => ({ ...prev, [itemId]: answer }))
  }

  async function persistAndGo(nextIndex: number) {
    if (!session || !item) return
    const answer = answers[item.id]
    if (!answer || !isAnswerComplete(item, answer)) return

    setSaving(true)
    try {
      await saveResponse({
        participant_id: session.participant.id,
        survey_item_id: item.id,
        prompt_occasion_id: session.occasion.id,
        answer,
      })

      if (nextIndex >= session.items.length) {
        navigate(`/take/${encodeURIComponent(code)}/done`, {
          state: {
            occasionLabel: session.occasion.label,
            studyTitle: session.studyTitle,
          },
        })
        return
      }

      setDirection(nextIndex > index ? 'forward' : 'back')
      startTransition(() => {
        setIndex(nextIndex)
        setAnimKey((k) => k + 1)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save response.')
    } finally {
      setSaving(false)
    }
  }

  if (phase === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5">
        <p className="animate-fade text-sm text-ink-soft">Loading your survey…</p>
      </div>
    )
  }

  if (phase === 'error' || !session) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
        <h1 className="font-display text-2xl font-semibold text-sea-deep">Unable to start</h1>
        <p className="mt-3 text-ink-soft">{error}</p>
        <Link
          to="/p"
          className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-sea px-5 font-semibold text-white"
        >
          Try another code
        </Link>
      </div>
    )
  }

  if (phase === 'intro') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-10">
        <div className="animate-rise flex flex-1 flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sea">
            {session.occasion.label ?? `Occasion ${session.occasion.occasion_index}`}
          </p>
          <h1 className="mt-2 font-display text-[2rem] font-semibold leading-tight text-sea-deep">
            {session.survey.title}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {session.studyTitle} · Code{' '}
            <span className="font-semibold text-sea-deep">
              {session.participant.participant_code}
            </span>
          </p>
          {session.survey.instructions && (
            <p className="mt-6 rounded-2xl border border-sand/80 bg-white/60 px-4 py-4 text-[15px] leading-relaxed text-ink-soft">
              {session.survey.instructions}
            </p>
          )}
          <p className="mt-4 text-sm text-ink-soft">
            {total} question{total === 1 ? '' : 's'} · one at a time · answers save as you go
          </p>
          <button
            type="button"
            onClick={() => setPhase('items')}
            className="mt-8 flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-sea text-base font-semibold text-white shadow-[0_12px_32px_-14px_rgba(31,111,106,0.9)] transition hover:bg-sea-bright active:scale-[0.98]"
          >
            Begin
          </button>
        </div>
      </div>
    )
  }

  if (!item) return null

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-5">
      <header className="animate-fade shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs font-medium text-ink-soft">
            {session.occasion.label ?? `Wave ${session.occasion.occasion_index}`}
          </p>
          <p className="text-xs font-semibold tracking-wide text-sea-deep">
            {session.participant.participant_code}
          </p>
        </div>
        <ProgressBar current={index + 1} total={total} />
      </header>

      <main
        key={animKey}
        className={[
          'flex flex-1 flex-col pt-8',
          direction === 'forward' ? 'animate-slide-next' : 'animate-slide-prev',
        ].join(' ')}
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-sea/80">
          Question {index + 1}
        </p>
        <h2 className="font-display text-[1.45rem] font-semibold leading-snug text-sea-deep sm:text-[1.6rem]">
          {item.item_text}
        </h2>

        <div className="mt-8">
          <ItemRenderer
            item={item}
            answer={currentAnswer}
            onAnswer={(a) => setAnswer(item.id, a)}
          />
        </div>
      </main>

      <footer className="mt-8 flex shrink-0 gap-3">
        <button
          type="button"
          disabled={index === 0 || saving}
          onClick={() => {
            setDirection('back')
            setIndex((i) => i - 1)
            setAnimKey((k) => k + 1)
          }}
          className="min-h-[56px] min-w-[96px] rounded-2xl border border-sand bg-white/70 px-4 text-sm font-semibold text-sea-deep transition enabled:active:scale-[0.98] disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!canContinue || saving}
          onClick={() => void persistAndGo(index + 1)}
          className="flex min-h-[56px] flex-1 items-center justify-center rounded-2xl bg-sea text-base font-semibold text-white shadow-[0_12px_32px_-14px_rgba(31,111,106,0.85)] transition enabled:hover:bg-sea-bright enabled:active:scale-[0.98] disabled:opacity-45"
        >
          {saving ? 'Saving…' : index === total - 1 ? 'Finish' : 'Next'}
        </button>
      </footer>

      {error && (
        <p role="alert" className="mt-3 text-center text-sm text-warn">
          {error}
        </p>
      )}
    </div>
  )
}
