/**
 * Read-only rendering of a submitted survey, driven by the survey config so
 * labels stay consistent with the forms. Used on detail pages.
 */
export default function SurveyAnswers({ survey, config }) {
  if (!survey?.id) {
    return <p className="afri-subtle font-body text-sm">Not submitted yet.</p>
  }

  function fmt(value, max) {
    if (value == null || value === '') return '—'
    return max ? `${value} / ${max}` : value
  }

  return (
    <div className="flex flex-col gap-5">
      {config.type === 'org' && (
        <p className="afri-muted font-body text-sm">
          Completed by <span className="font-medium text-afri-purple">{survey.supervisor_name || '—'}</span>
          {survey.supervisor_title ? `, ${survey.supervisor_title}` : ''}
        </p>
      )}

      {config.likertSections.map((section) => (
        <div key={section.title}>
          <h4 className="mb-2 font-heading text-sm font-semibold">{section.title}</h4>
          <ul className="flex flex-col gap-1.5">
            {section.questions.map((q) => (
              <li key={q.key} className="flex items-start justify-between gap-4 border-b border-afri-lavender/60 pb-1.5">
                <span className="afri-muted font-body text-sm">{q.text}</span>
                <span className="shrink-0 font-heading text-sm font-medium text-afri-purple">
                  {fmt(survey[q.key], 5)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div>
        <h4 className="mb-2 font-heading text-sm font-semibold">{config.overall.title}</h4>
        <ul className="flex flex-col gap-1.5">
          {config.overall.sliders.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-4 border-b border-afri-lavender/60 pb-1.5">
              <span className="afri-muted font-body text-sm">{s.label}</span>
              <span className="shrink-0 font-heading text-sm font-medium text-afri-purple">
                {fmt(survey[s.key], s.max)}
              </span>
            </li>
          ))}
          {config.overall.radios.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-4 border-b border-afri-lavender/60 pb-1.5">
              <span className="afri-muted font-body text-sm">{r.label}</span>
              <span className="shrink-0 font-body text-sm font-medium">{survey[r.key] || '—'}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-2 font-heading text-sm font-semibold">{config.feedback.title}</h4>
        <div className="flex flex-col gap-3">
          {config.feedback.fields.map((f) => (
            <div key={f.key}>
              <p className="afri-subtle font-body text-xs uppercase tracking-wide">{f.label}</p>
              <p className="font-body text-sm text-afri-black/80">
                {survey[f.key] || <span className="afri-subtle">No response</span>}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
