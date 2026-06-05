import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Spinner from '../../components/Spinner'
import { createSurvey } from '../../api/data'
import { toast } from '../../store/toastStore'

const TYPES = [
  { id: 'rating', label: 'Rating (1–5 agreement)', hint: 'Strongly disagree → Strongly agree' },
  { id: 'scale', label: 'Scale (slider)', hint: 'A numeric scale, e.g. 0–10' },
  { id: 'choice', label: 'Multiple choice', hint: 'Pick one option' },
  { id: 'text', label: 'Long text', hint: 'Open-ended written answer' },
]

let counter = 0
function newQuestion(type) {
  counter += 1
  return {
    key: `q_${Date.now().toString(36)}_${counter}`,
    type,
    text: '',
    options: type === 'choice' ? ['', ''] : [],
    min: 0,
    max: 10,
    minLabel: '',
    maxLabel: '',
  }
}

function buildDefinition(questions) {
  const likert = []
  const sliders = []
  const radios = []
  const fields = []
  for (const q of questions) {
    if (q.type === 'rating') likert.push({ key: q.key, text: q.text.trim() })
    else if (q.type === 'scale')
      sliders.push({
        key: q.key,
        label: q.text.trim(),
        min: Number(q.min) || 0,
        max: Number(q.max) || 10,
        minLabel: q.minLabel?.trim() || '',
        maxLabel: q.maxLabel?.trim() || '',
      })
    else if (q.type === 'choice')
      radios.push({ key: q.key, label: q.text.trim(), options: q.options.map((o) => o.trim()).filter(Boolean) })
    else fields.push({ key: q.key, label: q.text.trim() })
  }
  return {
    type: 'custom',
    likertSections: likert.length ? [{ title: 'Ratings', questions: likert }] : [],
    overall: { title: 'Your assessment', sliders, radios },
    feedback: { title: 'Additional comments', note: 'All questions in this section are optional.', fields },
  }
}

export default function SurveyBuilder({ onClose }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [audience, setAudience] = useState('')
  const [publishNow, setPublishNow] = useState(false)
  const [questions, setQuestions] = useState([newQuestion('rating')])

  function addQuestion(type) {
    setQuestions((qs) => [...qs, newQuestion(type)])
  }
  function updateQuestion(key, patch) {
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)))
  }
  function removeQuestion(key) {
    setQuestions((qs) => qs.filter((q) => q.key !== key))
  }
  function move(key, dir) {
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q.key === key)
      const j = i + dir
      if (i < 0 || j < 0 || j >= qs.length) return qs
      const copy = [...qs]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })
  }

  const mutation = useMutation({
    mutationFn: () =>
      createSurvey({
        title,
        description,
        audience,
        definition: buildDefinition(questions),
        status: publishNow ? 'PUBLISHED' : 'DRAFT',
      }),
    onSuccess: () => {
      toast.success(publishNow ? 'Survey created and published.' : 'Survey created as a draft.')
      qc.invalidateQueries({ queryKey: ['surveys'] })
      onClose()
    },
    onError: (e) => toast.error(`Could not create survey: ${e.message}`),
  })

  function validate() {
    if (!title.trim()) return 'Give the survey a title.'
    if (!questions.length) return 'Add at least one question.'
    for (const q of questions) {
      if (!q.text.trim()) return 'Every question needs text.'
      if (q.type === 'choice' && q.options.map((o) => o.trim()).filter(Boolean).length < 2)
        return 'Multiple choice questions need at least two options.'
    }
    return null
  }

  function submit(e) {
    e.preventDefault()
    const err = validate()
    if (err) return toast.error(err)
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-afri-black/40 p-4" onClick={onClose}>
      <form
        className="my-8 w-full max-w-2xl rounded-card bg-afri-white p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="mb-1 font-heading text-h2 text-afri-purple">Create a survey</h2>
        <p className="mb-5 font-body text-sm text-afri-black/55">
          Build a standalone survey with your own questions. It gets a shareable public link and collects responses you
          can review and export. (It does not affect VPI scoring.)
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="afri-label">Title</label>
            <input className="afri-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mid-deployment Check-in" required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="afri-label">Audience (optional)</label>
              <input className="afri-input" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. Volunteers, Partners" />
            </div>
            <div>
              <label className="afri-label">Description (optional)</label>
              <input className="afri-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short intro shown to respondents" />
            </div>
          </div>
        </div>

        <div className="my-5 border-t border-afri-lavender pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-heading text-h3 text-afri-purple">Questions</h3>
            <span className="font-body text-xs text-afri-black/45">{questions.length} added</span>
          </div>

          <div className="flex flex-col gap-3">
            {questions.map((q, i) => (
              <QuestionEditor
                key={q.key}
                q={q}
                index={i}
                total={questions.length}
                onChange={(patch) => updateQuestion(q.key, patch)}
                onRemove={() => removeQuestion(q.key)}
                onMove={(dir) => move(q.key, dir)}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => addQuestion(t.id)}
                className="rounded-lg border border-dashed border-afri-purple/40 px-3 py-1.5 font-body text-xs text-afri-purple transition-colors hover:bg-afri-lavender/50"
                title={t.hint}
              >
                + {t.label}
              </button>
            ))}
          </div>
          <p className="mt-2 font-body text-xs text-afri-black/45">
            Note: questions are grouped by type when shown to respondents (ratings, then scales &amp; choices, then text).
          </p>
        </div>

        <label className="flex items-center gap-2 font-body text-sm text-afri-black/75">
          <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
          Publish immediately (otherwise saved as a draft)
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="afri-btn-secondary" disabled={mutation.isPending}>
            Cancel
          </button>
          <button type="submit" className="afri-btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner /> : 'Create survey'}
          </button>
        </div>
      </form>
    </div>
  )
}

function QuestionEditor({ q, index, total, onChange, onRemove, onMove }) {
  const typeMeta = TYPES.find((t) => t.id === q.type)
  return (
    <div className="rounded-lg border border-afri-lavender bg-afri-lavender/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded bg-afri-purple/10 px-2 py-0.5 font-body text-xs font-medium text-afri-purple">
          {index + 1}. {typeMeta?.label}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="rounded px-1.5 text-afri-black/50 hover:bg-afri-lavender disabled:opacity-30" title="Move up">↑</button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="rounded px-1.5 text-afri-black/50 hover:bg-afri-lavender disabled:opacity-30" title="Move down">↓</button>
          <button type="button" onClick={onRemove} className="rounded px-1.5 text-afri-red hover:bg-afri-red/10" title="Remove">✕</button>
        </div>
      </div>

      <input
        className="afri-input"
        value={q.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={q.type === 'text' || q.type === 'choice' || q.type === 'scale' ? 'Question / prompt' : 'Statement to rate'}
      />

      {q.type === 'choice' && (
        <div className="mt-2">
          <label className="afri-label !mb-1 text-xs">Options (one per line)</label>
          <textarea
            className="afri-input min-h-[70px] text-sm"
            value={q.options.join('\n')}
            onChange={(e) => onChange({ options: e.target.value.split('\n') })}
            placeholder={'Yes\nNo\nUnsure'}
          />
        </div>
      )}

      {q.type === 'scale' && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <label className="afri-label !mb-1 text-xs">Min</label>
            <input type="number" className="afri-input" value={q.min} onChange={(e) => onChange({ min: e.target.value })} />
          </div>
          <div>
            <label className="afri-label !mb-1 text-xs">Max</label>
            <input type="number" className="afri-input" value={q.max} onChange={(e) => onChange({ max: e.target.value })} />
          </div>
          <div>
            <label className="afri-label !mb-1 text-xs">Min label</label>
            <input className="afri-input" value={q.minLabel} onChange={(e) => onChange({ minLabel: e.target.value })} placeholder="Low" />
          </div>
          <div>
            <label className="afri-label !mb-1 text-xs">Max label</label>
            <input className="afri-input" value={q.maxLabel} onChange={(e) => onChange({ maxLabel: e.target.value })} placeholder="High" />
          </div>
        </div>
      )}
    </div>
  )
}
