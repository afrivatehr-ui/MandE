import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Spinner from '../../components/Spinner'
import DataTable from '../../components/DataTable'
import EmptyState from '../../components/EmptyState'
import SurveyAnswers from '../../components/survey/SurveyAnswers'
import { fetchSurveyResponses, updateSurvey, getSurveyConfig } from '../../api/data'
import { downloadSurveyResponsesCsv } from '../../utils/csv'
import { toast } from '../../store/toastStore'
import { copyToClipboard } from '../../utils/mapApiError'
import { isOrgSurveyKey, builtInAudienceLabel } from '../../utils/surveyKeys'

export const SURVEY_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'CLOSED']

const STATUS_META = {
  DRAFT: { label: 'Draft', cls: 'bg-afri-black/10 text-afri-black/70' },
  SCHEDULED: { label: 'Scheduled', cls: 'bg-afri-blue/20 text-afri-blue' },
  PUBLISHED: { label: 'Published', cls: 'bg-afri-green/20 text-afri-green' },
  CLOSED: { label: 'Closed', cls: 'bg-afri-red/15 text-afri-red' },
}

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.DRAFT
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  )
}

function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(v) {
  return v ? new Date(v).toISOString() : null
}

export default function SurveyManager({ survey, canWrite, onClose, onPreview }) {
  const [tab, setTab] = useState('responses')
  const config = getSurveyConfig(survey)

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-afri-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-3xl flex-col bg-afri-white shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-afri-lavender px-6 py-5">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <StatusBadge status={survey.status} />
              <span className="rounded bg-afri-lavender/60 px-2 py-0.5 text-xs font-medium text-afri-purple">
                {survey.is_builtin ? builtInAudienceLabel(survey.key) : survey.audience || 'Custom'}
              </span>
            </div>
            <h2 className="truncate font-heading text-h2 text-afri-purple">{survey.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onPreview && (
              <button
                onClick={onPreview}
                className="hidden rounded-lg border border-afri-purple px-3 py-1.5 font-body text-xs font-medium text-afri-purple transition-colors hover:bg-afri-lavender sm:inline-flex"
              >
                Preview &amp; fill
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-afri-black/50 transition-colors hover:bg-afri-lavender/50 hover:text-afri-black"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-afri-lavender px-4">
          {[
            { id: 'responses', label: `Responses (${survey.responseCount ?? 0})` },
            { id: 'questions', label: 'Questions' },
            { id: 'settings', label: 'Settings' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-4 py-3 font-body text-sm transition-colors ${
                tab === t.id
                  ? 'border-afri-purple font-medium text-afri-purple'
                  : 'border-transparent text-afri-black/55 hover:text-afri-black'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {tab === 'responses' && <ResponsesTab survey={survey} config={config} />}
          {tab === 'questions' && <QuestionsTab config={config} isBuiltin={survey.is_builtin} />}
          {tab === 'settings' && <SettingsTab survey={survey} canWrite={canWrite} onClose={onClose} />}
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------- */
/* Responses                                                                    */
/* --------------------------------------------------------------------------- */
function ResponsesTab({ survey, config }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['surveyResponses', survey.id],
    queryFn: () => fetchSurveyResponses(survey),
  })

  const rows = useMemo(() => {
    const list = data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((r) => {
      const hay = [
        r.volunteer?.full_name,
        r.volunteer?.volunteer_id,
        r.organisation?.name,
        r.supervisor_name,
        r.respondent_name,
        r.respondent_email,
        r.deployment?.role_title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [data, search])

  const columns = useMemo(() => buildResponseColumns(survey), [survey])
  const csvOpts = { isCustom: !survey.is_builtin, isOrg: isOrgSurveyKey(survey.key) }

  if (isLoading) return <Spinner className="py-16" label="Loading responses" />
  if (error)
    return (
      <div className="rounded-card border border-afri-red/30 bg-afri-red/5 p-4 font-body text-sm text-afri-red">
        Couldn't load responses: {error.message}
      </div>
    )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by volunteer, organisation, role…"
          className="afri-input max-w-xs flex-1"
        />
        <button
          onClick={() =>
            downloadSurveyResponsesCsv(config, data ?? [], `afrivate-${survey.key}-responses.csv`, csvOpts)
          }
          className="afri-btn-secondary text-sm disabled:opacity-50"
          disabled={!data?.length}
        >
          Download all ({data?.length ?? 0}) CSV
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No responses yet"
          description={
            data?.length
              ? 'No responses match your search.'
              : 'Responses will appear here once volunteers or organisations complete this survey.'
          }
        />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setSelected(r)} />
      )}

      {selected && (
        <ResponseDetail
          response={selected}
          survey={survey}
          config={config}
          csvOpts={csvOpts}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function buildResponseColumns(survey) {
  const key = survey.key

  if (!survey.is_builtin) {
    return [
      {
        key: 'respondent',
        header: 'Respondent',
        sortable: true,
        sortValue: (r) => r.respondent_name || '',
        render: (r) => (
          <div>
            <p className="font-medium text-afri-purple">{r.respondent_name || 'Anonymous'}</p>
            <p className="text-xs text-afri-black/50">{r.respondent_email || ''}</p>
          </div>
        ),
      },
      {
        key: 'submitted_at',
        header: 'Submitted',
        sortable: true,
        sortValue: (r) => r.submitted_at,
        render: (r) => (
          <span className="text-xs text-afri-black/60">
            {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-GB') : '—'}
          </span>
        ),
      },
      { key: 'view', header: '', align: 'right', render: () => <span className="text-xs text-afri-purple/70">View →</span> },
    ]
  }

  const common = [
    {
      key: 'submitted_at',
      header: 'Submitted',
      sortable: true,
      sortValue: (r) => r.submitted_at,
      render: (r) => (
        <span className="text-xs text-afri-black/60">
          {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-GB') : '—'}
        </span>
      ),
    },
    {
      key: 'org',
      header: 'Organisation',
      sortable: true,
      sortValue: (r) => r.organisation?.name || '',
      render: (r) => <span>{r.organisation?.name || '—'}</span>,
    },
  ]

  if (isOrgSurveyKey(key)) {
    return [
      {
        key: 'supervisor',
        header: 'Supervisor',
        sortable: true,
        sortValue: (r) => r.supervisor_name || '',
        render: (r) => (
          <div>
            <p className="font-medium text-afri-purple">{r.supervisor_name || '—'}</p>
            <p className="text-xs text-afri-black/50">{r.supervisor_title || ''}</p>
          </div>
        ),
      },
      {
        key: 'volunteer',
        header: 'Volunteer',
        sortable: true,
        sortValue: (r) => r.volunteer?.full_name || '',
        render: (r) => <span>{r.volunteer?.full_name || '—'}</span>,
      },
      ...common,
      {
        key: 'effectiveness',
        header: 'Effective',
        align: 'center',
        sortable: true,
        sortValue: (r) => r.s5_overall_effectiveness ?? -1,
        render: (r) => <span className="font-medium">{r.s5_overall_effectiveness ?? '—'}/10</span>,
      },
      {
        key: 'vpi',
        header: 'Org VPI',
        align: 'center',
        sortable: true,
        sortValue: (r) => r.org_vpi ?? -1,
        render: (r) => <span className="font-semibold text-afri-purple">{r.org_vpi != null ? `${r.org_vpi}%` : '—'}</span>,
      },
      { key: 'view', header: '', align: 'right', render: () => <span className="text-xs text-afri-purple/70">View →</span> },
    ]
  }

  return [
    {
      key: 'volunteer',
      header: 'Volunteer',
      sortable: true,
      sortValue: (r) => r.volunteer?.full_name || '',
      render: (r) => (
        <div>
          <p className="font-medium text-afri-purple">{r.volunteer?.full_name || '—'}</p>
          <p className="text-xs text-afri-black/50">{r.volunteer?.volunteer_id || ''}</p>
        </div>
      ),
    },
    ...common,
    {
      key: 'satisfaction',
      header: 'Satisfaction',
      align: 'center',
      sortable: true,
      sortValue: (r) => r.s5_overall_satisfaction ?? -1,
      render: (r) => <span className="font-medium">{r.s5_overall_satisfaction ?? '—'}/10</span>,
    },
    {
      key: 'nps',
      header: 'NPS',
      align: 'center',
      sortable: true,
      sortValue: (r) => r.s5_nps_score ?? -1,
      render: (r) => <span className="font-medium">{r.s5_nps_score ?? '—'}</span>,
    },
    {
      key: 'vpi',
      header: 'VPI',
      align: 'center',
      sortable: true,
      sortValue: (r) => r.volunteer_vpi ?? -1,
      render: (r) => (
        <span className="font-semibold text-afri-purple">{r.volunteer_vpi != null ? `${r.volunteer_vpi}%` : '—'}</span>
      ),
    },
    { key: 'view', header: '', align: 'right', render: () => <span className="text-xs text-afri-purple/70">View →</span> },
  ]
}

function ResponseDetail({ response, survey, config, csvOpts, onClose }) {
  const surveyKey = survey.key
  const who = !survey.is_builtin
    ? response.respondent_name || 'Anonymous respondent'
    : isOrgSurveyKey(surveyKey)
      ? response.supervisor_name || 'Organisation'
      : response.volunteer?.full_name || 'Volunteer'

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-afri-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-card bg-afri-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-heading text-h3 text-afri-purple">{who}</h3>
            <p className="mt-0.5 font-body text-sm text-afri-black/55">
              {survey.is_builtin ? `${response.organisation?.name || '—'}` : response.respondent_email || ''}
              {survey.is_builtin && response.deployment?.role_title ? ` · ${response.deployment.role_title}` : ''}
              {response.submitted_at ? ` · ${new Date(response.submitted_at).toLocaleDateString('en-GB')}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-afri-black/50 hover:bg-afri-lavender/50" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <SurveyAnswers survey={response} config={config} />

        <div className="mt-6 flex justify-end gap-2 border-t border-afri-lavender pt-4">
          <button onClick={onClose} className="afri-btn-secondary">
            Close
          </button>
          <button
            onClick={() =>
              downloadSurveyResponsesCsv(config, [response], `afrivate-${surveyKey}-response-${response.id}.csv`, csvOpts)
            }
            className="afri-btn-primary"
          >
            Download (CSV)
          </button>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------- */
/* Questions                                                                    */
/* --------------------------------------------------------------------------- */
function QuestionsTab({ config, isBuiltin }) {
  const likertSections = config.likertSections ?? []
  const sliders = config.overall?.sliders ?? []
  const radios = config.overall?.radios ?? []
  const fields = config.feedback?.fields ?? []
  const totalQuestions =
    likertSections.reduce((n, s) => n + s.questions.length, 0) + sliders.length + radios.length + fields.length

  return (
    <div className="flex flex-col gap-6">
      <p className="rounded-lg bg-afri-lavender/30 p-3 font-body text-sm text-afri-black/70">
        {isBuiltin
          ? `These ${totalQuestions} questions are standardised across the platform so the VPI scoring stays consistent and comparable between deployments. The structure is read-only here.`
          : `This survey has ${totalQuestions} question${totalQuestions === 1 ? '' : 's'}. The structure is read-only here — to change it, create a new survey.`}
      </p>

      {config.likertSections.map((section, i) => (
        <div key={section.title}>
          <h4 className="mb-2 font-heading text-sm font-semibold text-afri-purple">
            {i + 1}. {section.title}
            <span className="ml-2 font-body text-xs font-normal text-afri-black/45">1–5 agreement scale</span>
          </h4>
          <ol className="flex flex-col gap-1.5">
            {section.questions.map((q) => (
              <li key={q.key} className="border-b border-afri-lavender/50 pb-1.5 font-body text-sm text-afri-black/75">
                {q.text}
              </li>
            ))}
          </ol>
        </div>
      ))}

      <div>
        <h4 className="mb-2 font-heading text-sm font-semibold text-afri-purple">{config.overall.title}</h4>
        <ol className="flex flex-col gap-1.5">
          {config.overall.sliders.map((s) => (
            <li key={s.key} className="border-b border-afri-lavender/50 pb-1.5 font-body text-sm text-afri-black/75">
              {s.label} <span className="text-afri-black/45">({s.min}–{s.max})</span>
            </li>
          ))}
          {config.overall.radios.map((r) => (
            <li key={r.key} className="border-b border-afri-lavender/50 pb-1.5 font-body text-sm text-afri-black/75">
              {r.label} <span className="text-afri-black/45">({r.options.join(' / ')})</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h4 className="mb-2 font-heading text-sm font-semibold text-afri-purple">{config.feedback.title}</h4>
        <p className="mb-2 font-body text-xs text-afri-black/45">{config.feedback.note}</p>
        <ol className="flex flex-col gap-1.5">
          {config.feedback.fields.map((f) => (
            <li key={f.key} className="border-b border-afri-lavender/50 pb-1.5 font-body text-sm text-afri-black/75">
              {f.label}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------- */
/* Settings                                                                     */
/* --------------------------------------------------------------------------- */
function SettingsTab({ survey, canWrite, onClose }) {
  const qc = useQueryClient()
  const editable = canWrite && !survey._virtual

  const [form, setForm] = useState({
    title: survey.title || '',
    description: survey.description || '',
    status: survey.status || 'DRAFT',
    scheduled_at: toLocalInput(survey.scheduled_at),
    default_expiry_days: survey.default_expiry_days ?? 14,
  })

  const mutation = useMutation({
    mutationFn: () =>
      updateSurvey(survey.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        scheduled_at: form.status === 'SCHEDULED' ? fromLocalInput(form.scheduled_at) : null,
        default_expiry_days: Number(form.default_expiry_days),
      }),
    onSuccess: () => {
      toast.success('Survey updated.')
      qc.invalidateQueries({ queryKey: ['surveys'] })
      onClose()
    },
    onError: (e) => toast.error(`Update failed: ${e.message}`),
  })

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (form.status === 'SCHEDULED' && !form.scheduled_at) {
          toast.error('Choose a date for the scheduled release.')
          return
        }
        mutation.mutate()
      }}
    >
      {survey._virtual && (
        <p className="rounded-lg border border-afri-blue/30 bg-afri-blue/5 p-3 font-body text-sm text-afri-blue">
          Advanced survey settings are not available yet. Contact your administrator if you need to
          change scheduling or publishing options.
        </p>
      )}
      {!canWrite && !survey._virtual && (
        <p className="rounded-lg bg-afri-lavender/40 p-3 font-body text-sm text-afri-black/60">
          You have read-only access. Only Admin and HR can change survey settings.
        </p>
      )}

      {!survey.is_builtin && !survey._virtual && (
        <div className="rounded-lg border border-afri-lavender bg-afri-lavender/20 p-3">
          <p className="afri-label !mb-1">Public link {survey.status !== 'PUBLISHED' && '(active once Published)'}</p>
          <div className="flex items-center gap-2">
            <input readOnly value={`${window.location.origin}/survey/custom/${survey.id}`} className="afri-input flex-1 text-xs" onFocus={(e) => e.target.select()} />
            <button
              type="button"
              onClick={async () => {
                try {
                  await copyToClipboard(`${window.location.origin}/survey/custom/${survey.id}`)
                  toast.success('Survey link copied.')
                } catch {
                  toast.error('Could not copy link. Select and copy manually.')
                }
              }}
              className="afri-btn-secondary !py-2 text-xs"
            >
              Copy
            </button>
          </div>
          <p className="mt-1 font-body text-xs text-afri-black/45">Share this link with anyone you want to fill the survey.</p>
        </div>
      )}

      <div>
        <label className="afri-label">Title</label>
        <input
          className="afri-input"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          disabled={!editable}
          required
        />
      </div>

      <div>
        <label className="afri-label">Description</label>
        <textarea
          className="afri-input min-h-[80px]"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          disabled={!editable}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="afri-label">Status</label>
          <select
            className="afri-input"
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            disabled={!editable}
          >
            {SURVEY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="afri-label">Default link expiry (days)</label>
          <input
            type="number"
            min="1"
            max="365"
            className="afri-input"
            value={form.default_expiry_days}
            onChange={(e) => set('default_expiry_days', e.target.value)}
            disabled={!editable}
          />
        </div>
      </div>

      {form.status === 'SCHEDULED' && (
        <div>
          <label className="afri-label">Scheduled release</label>
          <input
            type="datetime-local"
            className="afri-input"
            value={form.scheduled_at}
            onChange={(e) => set('scheduled_at', e.target.value)}
            disabled={!editable}
          />
        </div>
      )}

      <div className="rounded-lg bg-afri-lavender/25 p-3 font-body text-xs text-afri-black/60">
        <p className="mb-1 font-semibold text-afri-purple">What the statuses mean</p>
        <p><strong>Draft</strong> — being prepared, not collecting responses.</p>
        <p><strong>Scheduled</strong> — set to go live on the chosen date.</p>
        <p><strong>Published</strong> — live and collecting responses from survey links.</p>
        <p><strong>Closed</strong> — no longer accepting new responses.</p>
      </div>

      {editable && (
        <div className="flex justify-end gap-2 border-t border-afri-lavender pt-4">
          <button type="button" onClick={onClose} className="afri-btn-secondary">
            Cancel
          </button>
          <button type="submit" className="afri-btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner /> : 'Save changes'}
          </button>
        </div>
      )}
    </form>
  )
}
