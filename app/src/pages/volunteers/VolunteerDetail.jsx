import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import VPIRing from '../../components/VPIRing'
import VPIBadge from '../../components/VPIBadge'
import ActionFlag from '../../components/ActionFlag'
import DataTable from '../../components/DataTable'
import ConfirmDialog from '../../components/ConfirmDialog'
import Spinner from '../../components/Spinner'
import SurveyAnswers from '../../components/survey/SurveyAnswers'
import { ErrorNote } from '../dashboard/Dashboard'
import { mapApiError } from '../../utils/mapApiError'
import { useVolunteer } from '../../hooks/useData'
import { useAuthStore, isWriter } from '../../store/authStore'
import { archiveVolunteer, createVolunteerEngagement, updateVolunteerEngagement, deleteVolunteerEngagement } from '../../api/data'
import { toast } from '../../store/toastStore'
import { getActionDescription } from '../../utils/vpiEngine'
import { initials, formatDateRange, formatVpi } from '../../utils/format'
import { getSurveyConfigForTrack, MANDE_TRACK_LABELS } from '../../config/surveyQuestions'
import VolunteerHoursBadge from '../../components/VolunteerHoursBadge'

export default function VolunteerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuthStore()
  const canWrite = isWriter(profile?.role)
  const { data, isLoading, error } = useVolunteer(id)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [showAddEngagement, setShowAddEngagement] = useState(false)
  const [confirmRemoveEngagement, setConfirmRemoveEngagement] = useState(null)
  const [editEngagement, setEditEngagement] = useState(null)

  const archiveMutation = useMutation({
    mutationFn: () => archiveVolunteer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteer', id] })
      queryClient.invalidateQueries({ queryKey: ['volunteers'] })
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
      toast.success('Volunteer archived. Deployment history remains in Reports.')
      navigate('/volunteers')
    },
    onError: (e) => toast.error(e.message),
  })

  if (isLoading) return <Spinner className="py-20" label="Loading profile" />
  if (error) {
    const msg = mapApiError(error)
    if (error.code === 'PGRST116' || /not found/i.test(msg)) {
      return (
        <div className="afri-card p-8 text-center">
          <h1 className="font-heading text-h2 text-afri-purple">Volunteer not found</h1>
          <p className="afri-muted mt-2 text-sm">This volunteer may have been removed or the link is incorrect.</p>
          <button type="button" onClick={() => navigate('/volunteers')} className="afri-btn-primary mt-6">
            Back to volunteers
          </button>
        </div>
      )
    }
    return <ErrorNote error={error} />
  }

  const { volunteer, deployments, engagements = [], totalHours = 0, hoursWarning = null } = data
  const latest = deployments.find((d) => d.vpi != null) || deployments[0] || null
  const isArchived = Boolean(volunteer.archived_at)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => navigate('/volunteers')} className="afri-btn-ghost !px-2 text-sm">
          ← Back to volunteers
        </button>
        {canWrite && !isArchived && (
          <button onClick={() => setConfirmArchive(true)} className="afri-btn-secondary text-sm text-afri-red">
            Mark as no longer with us
          </button>
        )}
        {isArchived && (
          <span className="afri-subtle rounded-full bg-afri-black/5 px-3 py-1 text-xs">Archived — data kept for reports</span>
        )}
      </div>

      {/* Header */}
      <div className="afri-card mb-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-afri-purple font-heading text-xl font-bold text-afri-white">
            {initials(volunteer.full_name)}
          </span>
          <div>
            <h1 className="font-heading text-h2 text-afri-purple">{volunteer.full_name}</h1>
            <p className="afri-muted font-body text-sm">
              {volunteer.volunteer_id} · {volunteer.email}
            </p>
            {latest && (
              <div className="mt-2 flex items-center gap-2">
                <VPIBadge category={latest.category} />
                <ActionFlag category={latest.category} />
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 sm:items-end">
          <VolunteerHoursBadge hours={totalHours} warning={hoursWarning} />
          <VPIRing score={latest?.vpi == null ? null : Number(latest.vpi)} category={latest?.category} />
        </div>
      </div>

      {latest?.category && (
        <div className="afri-card mb-6 border-l-4 border-l-afri-purple p-5">
          <p className="font-heading text-sm font-semibold text-afri-purple">Recommended next step</p>
          <p className="afri-muted mt-1 font-body text-sm">{getActionDescription(latest.category)}</p>
        </div>
      )}

      {/* Dimension breakdown */}
      {latest?.orgSurvey && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <DimCard label="Task Performance" value={latest.task} />
          <DimCard label="Professionalism" value={latest.prof} />
          <DimCard label="Impact" value={latest.impact} />
          <DimCard label="Overall" value={latest.overall} max={10} />
        </div>
      )}

      {/* Past engagements (historical hours) */}
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-h3 text-afri-purple">Past engagements</h2>
          {canWrite && !isArchived && (
            <button type="button" onClick={() => setShowAddEngagement((v) => !v)} className="afri-btn-secondary text-sm">
              {showAddEngagement ? 'Cancel' : 'Add past engagement'}
            </button>
          )}
        </div>
        {showAddEngagement && (
          <PastEngagementForm
            volunteerId={volunteer.id}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['volunteer', id] })
              setShowAddEngagement(false)
              toast.success('Past engagement recorded.')
            }}
          />
        )}
        {editEngagement && (
          <PastEngagementForm
            volunteerId={volunteer.id}
            initial={editEngagement}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['volunteer', id] })
              setEditEngagement(null)
              toast.success('Engagement updated.')
            }}
            onCancel={() => setEditEngagement(null)}
          />
        )}
        {engagements.length ? (
          <DataTable
            rows={engagements}
            rowKey={(r) => r.id}
            columns={[
              { key: 'organisation_name', header: 'Organisation' },
              { key: 'role_title', header: 'Role', render: (r) => r.role_title || '—' },
              { key: 'period', header: 'Period', render: (r) => <span className="text-xs">{formatDateRange(r.start_date, r.end_date)}</span> },
              { key: 'hours_served', header: 'Hours', align: 'right', render: (r) => Number(r.hours_served).toLocaleString() },
              { key: 'mande_track', header: 'Track', render: (r) => <span className="text-xs">{MANDE_TRACK_LABELS[r.mande_track] ?? r.mande_track}</span> },
              { key: 'notes', header: 'Notes', render: (r) => <span className="text-xs text-afri-black/60">{r.notes?.trim() || '—'}</span> },
              ...(canWrite ? [{
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) => (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="text-xs text-afri-purple hover:underline"
                      onClick={() => setEditEngagement(r)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-afri-red hover:underline"
                      onClick={() => setConfirmRemoveEngagement(r)}
                    >
                      Remove
                    </button>
                  </div>
                ),
              }] : []),
            ]}
          />
        ) : (
          <p className="afri-muted rounded-lg border border-dashed border-afri-purple/20 px-4 py-6 text-center text-sm">
            No past engagements recorded yet. Add historical placements to include their hours in certificates.
          </p>
        )}
      </div>

      {/* Deployment history */}
      <div className="mb-6">
        <h2 className="mb-3 font-heading text-h3 text-afri-purple">Deployment history</h2>
        <DataTable
          rows={deployments}
          rowKey={(r) => r.id}
          columns={[
            { key: 'orgName', header: 'Organisation' },
            { key: 'role_title', header: 'Role' },
            { key: 'period', header: 'Period', render: (r) => <span className="text-xs">{formatDateRange(r.start_date, r.end_date)}</span> },
            { key: 'hours_served', header: 'Hours', align: 'right', render: (r) => (r.hours_served == null ? '—' : Number(r.hours_served).toLocaleString()) },
            { key: 'mande_track', header: 'Track', render: (r) => <span className="text-xs">{MANDE_TRACK_LABELS[r.mande_track] ?? 'Internal'}</span> },
            { key: 'vpi', header: 'VPI', align: 'right', render: (r) => <span className="font-semibold text-afri-purple">{formatVpi(r.vpi)}</span> },
            { key: 'category', header: 'Category', align: 'center', render: (r) => <VPIBadge category={r.category} showLabel={false} /> },
          ]}
        />
      </div>

      {/* Survey responses (expandable) */}
      <div className="flex flex-col gap-4">
        {deployments.map((d) => (
          <div key={d.id} className="afri-card p-5">
            <p className="mb-3 font-heading font-medium text-afri-purple">
              {d.orgName} · {formatDateRange(d.start_date, d.end_date)}
              <span className="afri-muted ml-2 font-body text-xs font-normal">
                ({MANDE_TRACK_LABELS[d.mande_track] ?? 'Internal'})
              </span>
            </p>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Expandable title="Organisation survey" defaultOpen={false}>
                <SurveyAnswers survey={d.orgSurvey} config={getSurveyConfigForTrack('org', d.mande_track)} />
              </Expandable>
              <Expandable title="Volunteer self-report" defaultOpen={false}>
                <SurveyAnswers survey={d.volSurvey} config={getSurveyConfigForTrack('volunteer', d.mande_track)} />
              </Expandable>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(confirmRemoveEngagement)}
        title="Remove past engagement?"
        message={`Remove ${confirmRemoveEngagement?.organisation_name ?? 'this engagement'} from the volunteer's history?`}
        confirmLabel="Remove"
        tone="danger"
        onCancel={() => setConfirmRemoveEngagement(null)}
        onConfirm={async () => {
          try {
            await deleteVolunteerEngagement(confirmRemoveEngagement.id)
            queryClient.invalidateQueries({ queryKey: ['volunteer', id] })
            toast.success('Engagement removed.')
            setConfirmRemoveEngagement(null)
          } catch (err) {
            toast.error(err.message || 'Could not remove engagement.')
          }
        }}
      />

      <ConfirmDialog
        open={confirmArchive}
        title="Archive this volunteer?"
        message={`${volunteer.full_name} will be removed from active lists. All deployment and survey data stays in Reports.`}
        confirmLabel="Archive volunteer"
        tone="danger"
        busy={archiveMutation.isPending}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => archiveMutation.mutate()}
      />
    </div>
  )
}

function PastEngagementForm({ volunteerId, initial, onSaved, onCancel }) {
  const isEdit = Boolean(initial?.id)
  const [form, setForm] = useState({
    organisation_name: initial?.organisation_name ?? '',
    role_title: initial?.role_title ?? '',
    start_date: initial?.start_date ?? '',
    end_date: initial?.end_date ?? '',
    hours_served: initial?.hours_served ?? '',
    mande_track: initial?.mande_track ?? 'internal',
    notes: initial?.notes ?? '',
  })
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      toast.error('End date must be on or after the start date.')
      return
    }
    setBusy(true)
    try {
      const payload = {
        organisation_name: form.organisation_name.trim(),
        role_title: form.role_title.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date,
        hours_served: Number(form.hours_served),
        mande_track: form.mande_track,
        notes: form.notes.trim() || null,
      }
      if (isEdit) await updateVolunteerEngagement(initial.id, payload)
      else await createVolunteerEngagement({ volunteer_id: volunteerId, ...payload })
      onSaved()
    } catch (err) {
      toast.error(err.message || 'Could not save engagement.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="afri-card mb-4 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
      <input className="afri-input sm:col-span-2" placeholder="Organisation name" required value={form.organisation_name} onChange={(e) => setForm((f) => ({ ...f, organisation_name: e.target.value }))} />
      <input className="afri-input" placeholder="Role title" value={form.role_title} onChange={(e) => setForm((f) => ({ ...f, role_title: e.target.value }))} />
      <input className="afri-input" type="number" min={1} step={0.5} placeholder="Hours served" required value={form.hours_served} onChange={(e) => setForm((f) => ({ ...f, hours_served: e.target.value }))} />
      <input className="afri-input" type="date" required value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
      <input className="afri-input" type="date" required value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
      <select className="afri-input sm:col-span-2" value={form.mande_track} onChange={(e) => setForm((f) => ({ ...f, mande_track: e.target.value }))}>
        <option value="internal">{MANDE_TRACK_LABELS.internal}</option>
        <option value="external">{MANDE_TRACK_LABELS.external}</option>
      </select>
      <textarea className="afri-input sm:col-span-2" rows={2} placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className="afri-btn-primary flex-1">{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Save past engagement'}</button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="afri-btn-secondary">Cancel</button>
        )}
      </div>
    </form>
  )
}

function DimCard({ label, value, max = 5 }) {
  return (
    <div className="afri-card p-4">
      <p className="afri-subtle font-body text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-afri-purple">
        {value == null ? '—' : Number(value).toFixed(1)}
        <span className="afri-subtle text-sm font-medium"> / {max}</span>
      </p>
    </div>
  )
}

function Expandable({ title, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-afri-lavender">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 font-heading text-sm font-medium"
      >
        {title}
        <span className="afri-subtle">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="border-t border-afri-lavender px-4 py-4">{children}</div>}
    </div>
  )
}
