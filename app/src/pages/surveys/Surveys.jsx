import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import PageHeader from '../../components/PageHeader'
import Spinner from '../../components/Spinner'
import ConfirmDialog from '../../components/ConfirmDialog'
import { fetchSurveys, updateSurvey, deleteSurvey } from '../../api/data'
import { useAuthStore, isWriter } from '../../store/authStore'
import { toast } from '../../store/toastStore'
import SurveyManager, { StatusBadge } from './SurveyManager'
import SurveyPreview from './SurveyPreview'
import SurveyBuilder from './SurveyBuilder'

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-GB') : '—'
}

export default function Surveys() {
  const profile = useAuthStore((s) => s.profile)
  const canWrite = isWriter(profile?.role)
  const qc = useQueryClient()
  const [active, setActive] = useState(null)
  const [preview, setPreview] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['surveys', canWrite],
    queryFn: () => fetchSurveys({ publishDue: canWrite }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateSurvey(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveys'] })
      toast.success('Survey status updated.')
    },
    onError: (e) => toast.error(`Could not update: ${e.message}`),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteSurvey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveys'] })
      toast.success('Survey deleted.')
      setConfirmDelete(null)
    },
    onError: (e) => toast.error(`Could not delete: ${e.message}`),
  })

  const stats = useMemo(() => {
    const list = data ?? []
    const published = list.filter((s) => s.status === 'PUBLISHED').length
    const totalResponses = list.reduce((n, s) => n + (s.responseCount ?? 0), 0)
    const last = list
      .map((s) => s.lastResponseAt)
      .filter(Boolean)
      .sort()
      .at(-1)
    return { published, totalResponses, last }
  }, [data])

  if (isLoading) return <Spinner className="py-20" label="Loading surveys" />
  if (error)
    return (
      <div className="rounded-card border border-afri-red/30 bg-afri-red/5 p-5 font-body text-sm text-afri-red">
        Couldn't load surveys: {error?.message || 'unknown error'}
      </div>
    )

  const surveys = data ?? []

  return (
    <div>
      <PageHeader
        title="Surveys"
        subtitle="Manage built-in and custom surveys, set their status, and review who has responded."
        actions={
          canWrite && (
            <button onClick={() => setShowCreate(true)} className="afri-btn-primary">
              + New survey
            </button>
          )
        }
      />

      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Published surveys" value={stats.published} />
        <StatCard label="Total responses" value={stats.totalResponses} />
        <StatCard label="Last response" value={fmtDate(stats.last)} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {surveys.map((s) => (
          <SurveyCard
            key={s.id}
            survey={s}
            canWrite={canWrite}
            busy={statusMutation.isPending}
            onOpen={() => setActive(s)}
            onPreview={() => setPreview(s)}
            onSetStatus={(status) => statusMutation.mutate({ id: s.id, status })}
            onDelete={() => setConfirmDelete(s)}
          />
        ))}
      </div>

      {active && (
        <SurveyManager
          survey={active}
          canWrite={canWrite}
          onClose={() => setActive(null)}
          onPreview={() => setPreview(active)}
        />
      )}

      {preview && <SurveyPreview survey={preview} onClose={() => setPreview(null)} />}

      {showCreate && <SurveyBuilder onClose={() => setShowCreate(false)} />}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this survey?"
        message={`This permanently deletes "${confirmDelete?.title}" and all of its responses. This cannot be undone.`}
        confirmLabel="Delete survey"
        busy={deleteMutation.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => deleteMutation.mutate(confirmDelete.id)}
      />
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="afri-card p-5">
      <p className="font-body text-xs uppercase tracking-wide text-afri-black/45">{label}</p>
      <p className="mt-1 font-heading text-h2 text-afri-purple">{value}</p>
    </div>
  )
}

function SurveyCard({ survey, canWrite, busy, onOpen, onPreview, onSetStatus, onDelete }) {
  const isCustom = !survey.is_builtin
  return (
    <div className="afri-card flex flex-col p-6 transition-shadow hover:shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className={`rounded px-2 py-1 text-xs font-semibold ${
            survey.is_builtin
              ? survey.key === 'volunteer'
                ? 'bg-afri-blue/20 text-afri-blue'
                : 'bg-afri-green/20 text-afri-green'
              : 'bg-afri-purple/15 text-afri-purple'
          }`}
        >
          {survey.is_builtin ? (survey.key === 'volunteer' ? 'Volunteer' : 'Organisation') : survey.audience || 'Custom'}
        </span>
        <StatusBadge status={survey.status} />
      </div>

      <h3 className="font-heading text-h3 text-afri-purple">{survey.title}</h3>
      <p className="mt-1.5 flex-1 font-body text-sm text-afri-black/60">{survey.description}</p>

      <dl className="my-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-afri-lavender/60 py-4">
        <Meta label="Responses" value={survey.responseCount ?? 0} />
        <Meta label="Last response" value={fmtDate(survey.lastResponseAt)} />
        <Meta label="Type" value={survey.is_builtin ? 'Built-in (VPI)' : 'Custom'} />
        {survey.status === 'SCHEDULED' ? (
          <Meta label="Scheduled" value={fmtDate(survey.scheduled_at)} />
        ) : (
          <Meta label="Published" value={fmtDate(survey.published_at)} />
        )}
      </dl>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={onOpen} className="afri-btn-primary flex-1">
          {canWrite ? 'Edit & view responses' : 'View responses'}
        </button>
        <button onClick={onPreview} className="afri-btn-secondary flex-1">
          Preview &amp; fill
        </button>
      </div>

      {canWrite && !survey._virtual && (
        <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-afri-lavender/60 pt-3">
          {survey.status !== 'PUBLISHED' && (
            <QuickAction onClick={() => onSetStatus('PUBLISHED')} busy={busy}>Publish</QuickAction>
          )}
          {survey.status === 'PUBLISHED' && (
            <QuickAction onClick={() => onSetStatus('DRAFT')} busy={busy}>Unpublish</QuickAction>
          )}
          {survey.status !== 'CLOSED' && (
            <QuickAction onClick={() => onSetStatus('CLOSED')} busy={busy}>Close</QuickAction>
          )}
          {survey.status === 'CLOSED' && (
            <QuickAction onClick={() => onSetStatus('PUBLISHED')} busy={busy}>Reopen</QuickAction>
          )}
          {isCustom && (
            <QuickAction onClick={onDelete} danger>Delete</QuickAction>
          )}
        </div>
      )}
    </div>
  )
}

function QuickAction({ children, onClick, busy, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`rounded-lg px-2.5 py-1.5 font-body text-xs transition-colors disabled:opacity-50 ${
        danger ? 'text-afri-red hover:bg-afri-red/10' : 'text-afri-purple hover:bg-afri-lavender'
      }`}
    >
      {children}
    </button>
  )
}

function Meta({ label, value }) {
  return (
    <div>
      <dt className="font-body text-xs uppercase tracking-wide text-afri-black/45">{label}</dt>
      <dd className="mt-0.5 font-heading text-sm font-semibold text-afri-black">{value}</dd>
    </div>
  )
}
