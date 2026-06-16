import { useMemo, useState } from 'react'
import LikertInput from '../LikertInput'
import SliderInput from '../SliderInput'
import Logo from '../Logo'
import Spinner from '../Spinner'
import { LIKERT_LABELS } from '../../config/surveyQuestions'
import { formatDateRange } from '../../utils/format'

/**
 * Generic multi-step survey runner (spec Sections 8.1 + 10). Mobile-first,
 * one section per screen, progress bar, validated Next, inline submit errors.
 */
export default function SurveyFlow({ survey, context, onSubmit }) {
  const isOrg = survey.type === 'org'
  const isCustom = survey.type === 'custom'

  const steps = useMemo(() => {
    const s = [{ kind: 'identification', title: 'Your details' }]
    ;(survey.likertSections || []).forEach((section) => s.push({ kind: 'likert', title: section.title, section }))
    const hasOverall = survey.overall && ((survey.overall.sliders || []).length || (survey.overall.radios || []).length)
    if (hasOverall) s.push({ kind: 'overall', title: survey.overall.title, overall: survey.overall })
    const hasFeedback = survey.feedback && (survey.feedback.fields || []).length
    if (hasFeedback) s.push({ kind: 'feedback', title: survey.feedback.title, feedback: survey.feedback })
    return s
  }, [survey])

  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState(() =>
    isOrg ? { supervisor_name: '', supervisor_title: '' } : {},
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const step = steps[stepIndex]
  const total = steps.length
  const isLast = stepIndex === total - 1

  function set(key, value) {
    setAnswers((a) => ({ ...a, [key]: value }))
  }

  const stepValid = useMemo(() => {
    if (step.kind === 'identification') {
      if (!isOrg) return true
      return Boolean(answers.supervisor_name?.trim() && answers.supervisor_title?.trim())
    }
    if (step.kind === 'likert') {
      return step.section.questions.every((q) => answers[q.key] != null)
    }
    if (step.kind === 'overall') {
      const slidersOk = step.overall.sliders.every((sl) => answers[sl.key] != null)
      const radiosOk = step.overall.radios.every((r) => Boolean(answers[r.key]))
      return slidersOk && radiosOk
    }
    return true // feedback optional
  }, [step, answers, isOrg])

  async function handleSubmit() {
    setError('')
    setSubmitting(true)
    try {
      await onSubmit(answers)
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  function next() {
    if (isLast) return handleSubmit()
    setStepIndex((i) => Math.min(i + 1, total - 1))
    window.scrollTo({ top: 0 })
  }
  function prev() {
    setStepIndex((i) => Math.max(i - 1, 0))
    window.scrollTo({ top: 0 })
  }

  const progress = ((stepIndex + 1) / total) * 100

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-afri-purple/5 via-afri-lavender/30 to-afri-blue/5">
      {/* Branded header */}
      <header className="border-b border-afri-purple/10 bg-afri-purple px-5 py-5 shadow-sm sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Logo variant="white" className="h-9" />
          <div className="text-right">
            <p className="font-heading text-xs font-semibold text-afri-white/80">Monitoring & Evaluation</p>
            <p className="font-body text-xs text-afri-white/60">Afrivate Volunteer Programme</p>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="border-b border-afri-lavender bg-afri-white px-5 py-4 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 flex items-center justify-between font-body text-xs font-semibold text-afri-purple">
            <span>
              Question {stepIndex + 1} of {total}
            </span>
            <span className="text-afri-black/60">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-afri-lavender">
            <div
              className="h-full rounded-full bg-gradient-to-r from-afri-purple via-afri-blue to-afri-purple transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 font-body text-xs text-afri-black/50">{step.title}</p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="afri-card border-t-4 border-t-afri-purple p-6 shadow-lg sm:p-8">
            {step.kind === 'identification' && (
              <Identification context={context} isOrg={isOrg} isCustom={isCustom} answers={answers} set={set} />
            )}

            {step.kind === 'likert' && (
              <div>
                <h2 className="mb-2 font-heading text-h3 text-afri-purple">{step.section.title}</h2>
                <p className="mb-6 font-body text-sm text-afri-black/60">
                  Please rate your level of agreement with each statement below.
                </p>
                <div className="flex flex-col gap-7">
                  {step.section.questions.map((q, idx) => (
                    <div key={q.key} className="border-b border-afri-lavender/40 pb-6 last:border-0 last:pb-0">
                      <div className="mb-3 flex items-start gap-2">
                        <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-afri-purple/10 font-heading text-xs font-bold text-afri-purple">
                          {idx + 1}
                        </span>
                        <p className="flex-1 font-body text-afri-black">{q.text}</p>
                      </div>
                      <LikertInput
                        name={q.text}
                        value={answers[q.key]}
                        onChange={(v) => set(q.key, v)}
                        labels={LIKERT_LABELS}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step.kind === 'overall' && (
              <div>
                <h2 className="mb-6 font-heading text-h3 text-afri-purple">{step.overall.title}</h2>
                <div className="flex flex-col gap-8">
                  {step.overall.sliders.map((sl, idx) => (
                    <div key={sl.key} className="border-b border-afri-lavender/40 pb-7 last:border-0 last:pb-0">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-afri-blue/10 font-heading text-xs font-bold text-afri-blue">
                          {idx + 1}
                        </span>
                        <p className="font-body font-medium text-afri-black">{sl.label}</p>
                      </div>
                      <SliderInput
                        name={sl.label}
                        value={answers[sl.key]}
                        onChange={(v) => set(sl.key, v)}
                        min={sl.min}
                        max={sl.max}
                        minLabel={sl.minLabel}
                        maxLabel={sl.maxLabel}
                      />
                    </div>
                  ))}
                  {step.overall.radios.map((r, idx) => (
                    <div key={r.key} className="border-b border-afri-lavender/40 pb-6 last:border-0 last:pb-0">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-afri-green/10 font-heading text-xs font-bold text-afri-green">
                          {step.overall.sliders.length + idx + 1}
                        </span>
                        <p className="font-body font-medium text-afri-black">{r.label}</p>
                      </div>
                      <RadioGroup
                        options={r.options}
                        value={answers[r.key]}
                        onChange={(v) => set(r.key, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step.kind === 'feedback' && (
              <div>
                <h2 className="mb-2 font-heading text-h3 text-afri-purple">{step.feedback.title}</h2>
                <p className="mb-6 font-body text-sm text-afri-black/60">{step.feedback.note}</p>
                <div className="flex flex-col gap-6">
                  {step.feedback.fields.map((f) => (
                    <div key={f.key} className="border-l-4 border-afri-purple/20 bg-afri-purple/3 p-4">
                      <label className="afri-label font-medium">{f.label}</label>
                      <textarea
                        rows={3}
                        className="afri-input mt-2 resize-y font-body"
                        value={answers[f.key] || ''}
                        onChange={(e) => set(f.key, e.target.value)}
                        placeholder="Your feedback here..."
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 flex gap-3 rounded-lg border border-afri-red/30 bg-afri-red/5 p-4">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-heading text-sm font-semibold text-afri-red">Error</p>
                  <p className="font-body text-sm text-afri-red/90">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={prev}
              disabled={stepIndex === 0 || submitting}
              className="afri-btn-secondary transition-all disabled:invisible disabled:pointer-events-none"
            >
              ← Previous
            </button>
            <div className="flex-1"></div>
            <button
              onClick={next}
              disabled={!stepValid || submitting}
              className="afri-btn-primary min-w-[140px] transition-all"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <Spinner />
                  <span>Submitting...</span>
                </div>
              ) : isLast ? (
                '✓ Submit survey'
              ) : (
                'Next →'
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

function Identification({ context, isOrg, isCustom, answers, set }) {
  if (isCustom) {
    const meta = context?.survey || {}
    return (
      <div>
        <div className="mb-6">
          <h2 className="mb-2 font-heading text-h3 text-afri-purple">{meta.title || 'Survey'}</h2>
          {meta.description && <p className="font-body text-sm text-afri-black/60">{meta.description}</p>}
        </div>
        <div className="rounded-lg border-l-4 border-l-afri-purple bg-afri-purple/5 p-5">
          <p className="mb-4 font-body text-sm font-medium text-afri-black">Your details (optional)</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="afri-label">Your name</label>
              <input
                className="afri-input mt-2"
                value={answers.__name || ''}
                onChange={(e) => set('__name', e.target.value)}
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div>
              <label className="afri-label">Your email</label>
              <input
                type="email"
                className="afri-input mt-2"
                value={answers.__email || ''}
                onChange={(e) => set('__email', e.target.value)}
                placeholder="e.g. jane@example.com"
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { volunteer, organisation, deployment } = context
  return (
    <div>
      <div className="mb-6">
        <h2 className="mb-2 font-heading text-h3 text-afri-purple">
          {isOrg ? 'Organisation Feedback Form' : 'Volunteer Experience Survey'}
        </h2>
        <p className="font-body text-sm text-afri-black/60">
          Please confirm the details below before you begin the survey.
        </p>
      </div>

      <div className="mb-6 space-y-3 rounded-lg bg-gradient-to-br from-afri-purple/5 to-afri-blue/5 p-5 border border-afri-purple/10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-afri-purple/70">Volunteer Name</p>
            <p className="mt-1 font-body text-lg font-medium text-afri-black">{volunteer.full_name}</p>
          </div>
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-afri-purple/70">Volunteer ID</p>
            <p className="mt-1 font-body text-lg font-mono text-afri-black">{volunteer.volunteer_id || '—'}</p>
          </div>
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-afri-purple/70">Organisation</p>
            <p className="mt-1 font-body text-lg font-medium text-afri-black">{organisation.name}</p>
          </div>
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-afri-purple/70">Volunteer role / assignment</p>
            <p className="mt-1 font-body text-lg font-medium text-afri-black">{deployment.role_title}</p>
          </div>
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-afri-purple/70">Organisation contact role</p>
            <p className="mt-1 font-body text-lg font-medium text-afri-black">{deployment.org_contact_role || '—'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-afri-purple/70">Deployment Period</p>
            <p className="mt-1 font-body text-lg font-medium text-afri-black">
              {formatDateRange(deployment.start_date, deployment.end_date)}
            </p>
          </div>
        </div>
      </div>

      {isOrg && (
        <div className="rounded-lg border-l-4 border-l-afri-green bg-afri-green/3 p-5">
          <p className="mb-4 font-body text-sm font-medium text-afri-black">
            Please provide your contact details:
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="afri-label">Your full name *</label>
              <input
                className="afri-input mt-2"
                value={answers.supervisor_name || ''}
                onChange={(e) => set('supervisor_name', e.target.value)}
                placeholder="e.g. Bola Adeyemi"
                required
              />
            </div>
            <div>
              <label className="afri-label">Your job title *</label>
              <input
                className="afri-input mt-2"
                value={answers.supervisor_title || ''}
                onChange={(e) => set('supervisor_title', e.target.value)}
                placeholder="e.g. Engineering Lead"
                required
              />
            </div>
          </div>
        </div>
      )}

      {!isOrg && (
        <div className="rounded-lg border-l-4 border-l-afri-blue bg-afri-blue/3 p-5">
          <p className="font-body text-sm text-afri-black/70">
            <span className="font-semibold">Thank you for your service!</span> Your feedback helps Afrivate improve placements for future volunteers.
            All responses are confidential and will be used for evaluation purposes only.
          </p>
        </div>
      )}
    </div>
  )
}

function RadioGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt
        return (
          <button
            type="button"
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-lg border px-4 py-2.5 font-body text-sm transition-colors ${selected
                ? 'border-afri-purple bg-afri-purple text-afri-white'
                : 'border-afri-lavender bg-afri-white text-afri-black hover:border-afri-purple/50'
              }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
