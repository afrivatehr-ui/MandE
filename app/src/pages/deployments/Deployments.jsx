import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import VPIBadge from '../../components/VPIBadge'
import SurveyStatus from '../../components/SurveyStatus'
import EmptyState from '../../components/EmptyState'
import Spinner from '../../components/Spinner'
import ConfirmDialog from '../../components/ConfirmDialog'
import { ErrorNote } from '../dashboard/Dashboard'
import { useDeployments, useVolunteers, useOrganisations } from '../../hooks/useData'
import { useAuthStore, isWriter } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { toast } from '../../store/toastStore'
import {
  createDeployment,
  createVolunteer,
  createOrganisation,
  createSurveyTokens,
  sendSurveyEmails,
  updateDeploymentStatus,
  nextVolunteerCode,
} from '../../api/data'
import { formatDateRange, formatVpi, STATUS_LABEL } from '../../utils/format'

const SURVEY_TARGETS = [
  { id: 'volunteer', label: 'Volunteer only', desc: 'Email the self-report survey to the volunteer (select which organisation they served at)' },
  { id: 'organisation', label: 'Organisation only', desc: 'Email the effectiveness survey to the organisation (select which volunteer they are rating)' },
  { id: 'both', label: 'Both parties', desc: 'Full paired deployment — both surveys; primary VPI uses the organisation rating when both are in' },
]

const FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'AWAITING_SURVEYS', label: 'Awaiting surveys' },
  { id: 'SURVEYS_COMPLETE', label: 'Surveys complete' },
]

function typeLabel(t) {
  return t === 'org' ? 'Organisation' : 'Volunteer'
}

function labelList(types) {
  return (types || []).map(typeLabel).join(' & ')
}

// Build a human summary from the email function's delivery report.
function deliveryMessage(d = {}) {
  const parts = []
  if (d.delivered?.length) parts.push(`Sent to ${labelList(d.delivered)}.`)
  if (d.skipped?.length) parts.push(`${labelList(d.skipped)} skipped (survey not Published).`)
  if (d.missing?.length) parts.push(`No email on file for ${labelList(d.missing)}.`)
  if (d.failed?.length)
    parts.push(`Could not send to ${d.failed.map((f) => `${typeLabel(f.type)} (${f.error})`).join('; ')}.`)
  return parts.join(' ')
}

export default function Deployments() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuthStore()
  const canWrite = isWriter(profile?.role)

  const { data: deployments, isLoading, error } = useDeployments()
  const [filter, setFilter] = useState('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [confirmComplete, setConfirmComplete] = useState(null)

  const rows = useMemo(() => {
    if (!deployments) return []
    return filter === 'ALL' ? deployments : deployments.filter((d) => d.status === filter)
  }, [deployments, filter])

  const resendMutation = useMutation({
    mutationFn: ({ id, types }) => sendSurveyEmails(id, undefined, types),
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
      const msg = deliveryMessage(report ?? {})
      if (report.failed?.length || (!report.delivered?.length && (report.missing?.length || report.skipped?.length))) {
        toast.error(msg || 'No emails were sent.')
      } else {
        toast.success(msg || 'Survey invitation emails sent.')
      }
    },
    onError: (e) => toast.error(`Could not send emails: ${e.message}`),
  })

  const completeMutation = useMutation({
    mutationFn: (id) => updateDeploymentStatus(id, 'COMPLETED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
      toast.success('Deployment marked complete.')
      setConfirmComplete(null)
    },
    onError: (e) => toast.error(e.message),
  })

  function copyLinks(d) {
    const origin = window.location.origin
    const vol = d.tokens?.volunteer ? `${origin}/survey/volunteer/${d.tokens.volunteer}` : null
    const org = d.tokens?.org ? `${origin}/survey/org/${d.tokens.org}` : null
    if (!vol && !org) return toast.error('No survey links yet — create or resend first.')
    const text = [vol && `Volunteer: ${vol}`, org && `Organisation: ${org}`].filter(Boolean).join('\n')
    navigator.clipboard?.writeText(text)
    toast.success('Survey links copied to clipboard.')
  }

  if (isLoading) return <Spinner className="py-20" label="Loading deployments" />
  if (error) return <ErrorNote error={error} />

  const columns = [
    { key: 'volunteerName', header: 'Volunteer', sortable: true, render: (r) => (
      <div>
        <p className="font-medium text-afri-purple">{r.volunteerName}</p>
        <p className="text-xs text-afri-black/50">{r.volunteerCode}</p>
      </div>
    ) },
    { key: 'orgName', header: 'Organisation', sortable: true },
    { key: 'period', header: 'Period', render: (r) => <span className="text-xs">{formatDateRange(r.start_date, r.end_date)}</span> },
    { key: 'status', header: 'Status', render: (r) => (
      <span className="rounded-full bg-afri-lavender px-2.5 py-1 font-body text-xs text-afri-purple">
        {STATUS_LABEL[r.status]}
      </span>
    ) },
    { key: 'surveys', header: 'Surveys', align: 'center', render: (r) => (
      <SurveyStatus
        volDone={r.volSubmitted}
        orgDone={r.orgSubmitted}
        volNa={!r.hasVolunteer}
        orgNa={!r.hasOrganisation}
      />
    ) },
    { key: 'vpi', header: 'VPI', align: 'right', render: (r) => <span className="font-semibold text-afri-purple">{formatVpi(r.vpi)}</span> },
    { key: 'category', header: 'Cat.', align: 'center', render: (r) => <VPIBadge category={r.category} showLabel={false} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <IconAction label="View volunteer" onClick={() => navigate(`/volunteers/${r.volunteer_id}`)}>
            View
          </IconAction>
          <IconAction label="Copy survey links" onClick={() => copyLinks(r)}>
            Links
          </IconAction>
          {canWrite && (
            <>
              {r.hasVolunteer && (
                <IconAction
                  label="Email volunteer survey"
                  onClick={() => resendMutation.mutate({ id: r.id, types: ['volunteer'] })}
                  busy={resendMutation.isPending}
                >
                  Email V
                </IconAction>
              )}
              {r.hasOrganisation && (
                <IconAction
                  label="Email organisation survey"
                  onClick={() => resendMutation.mutate({ id: r.id, types: ['org'] })}
                  busy={resendMutation.isPending}
                >
                  Email O
                </IconAction>
              )}
              {r.status !== 'COMPLETED' && (
                <IconAction label="Mark complete" onClick={() => setConfirmComplete(r)}>
                  Complete
                </IconAction>
              )}
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Deployments"
        subtitle="Create and manage volunteer deployments"
        actions={
          canWrite && (
            <button onClick={() => setShowCreate(true)} className="afri-btn-primary">
              + New deployment
            </button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-lg px-3 py-1.5 font-body text-sm transition-colors ${
              filter === f.id ? 'bg-afri-purple text-afri-white' : 'bg-afri-lavender text-afri-purple hover:bg-afri-lavender/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        emptyState={
          <EmptyState
            title="No deployments"
            description={canWrite ? 'Create a deployment to send surveys and generate scores.' : 'No deployments to show yet.'}
            cta={canWrite && <button onClick={() => setShowCreate(true)} className="afri-btn-primary">+ New deployment</button>}
          />
        }
      />

      {showCreate && <CreateDeploymentModal onClose={() => setShowCreate(false)} />}

      <ConfirmDialog
        open={Boolean(confirmComplete)}
        title="Mark deployment complete?"
        message={`This marks ${confirmComplete?.volunteerName}'s deployment at ${confirmComplete?.orgName} as completed.`}
        confirmLabel="Mark complete"
        busy={completeMutation.isPending}
        onCancel={() => setConfirmComplete(null)}
        onConfirm={() => completeMutation.mutate(confirmComplete.id)}
      />
    </div>
  )
}

function IconAction({ children, onClick, label, busy }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={label}
      disabled={busy}
      className="afri-btn-ghost !px-2.5 !py-1.5 text-xs disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function CreateDeploymentModal({ onClose }) {
  const queryClient = useQueryClient()
  const { data: volunteers } = useVolunteers()
  const { data: organisations } = useOrganisations()
  const expiryDays = useSettingsStore((st) => st.surveyTokenExpiryDays)

  const [surveyTarget, setSurveyTarget] = useState('both')
  const [volMode, setVolMode] = useState('existing')
  const [orgMode, setOrgMode] = useState('existing')
  const [form, setForm] = useState({
    volunteer_id: '',
    newVol: { volunteer_id: '', full_name: '', email: '', phone: '' },
    organisation_id: '',
    newOrg: { name: '', contact_name: '', contact_email: '', sector: '' },
    role_title: '',
    start_date: '',
    end_date: '',
  })

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setNewVol = (patch) => setForm((f) => ({ ...f, newVol: { ...f.newVol, ...patch } }))
  const setNewOrg = (patch) => setForm((f) => ({ ...f, newOrg: { ...f.newOrg, ...patch } }))

  async function suggestCode() {
    const code = await nextVolunteerCode()
    setNewVol({ volunteer_id: code })
  }

  const includeVolunteer = surveyTarget === 'volunteer' || surveyTarget === 'both'
  const includeOrganisation = surveyTarget === 'organisation' || surveyTarget === 'both'
  const surveyTypes = [
    ...(includeVolunteer ? ['volunteer'] : []),
    ...(includeOrganisation ? ['org'] : []),
  ]

  const volSectionLabel =
    surveyTarget === 'organisation'
      ? 'Volunteer being assessed'
      : surveyTarget === 'volunteer'
        ? 'Volunteer (survey recipient)'
        : 'Volunteer'
  const orgSectionLabel =
    surveyTarget === 'volunteer'
      ? 'Organisation they served at'
      : surveyTarget === 'organisation'
        ? 'Organisation (survey recipient)'
        : 'Organisation'
  const volSectionHint =
    surveyTarget === 'organisation'
      ? 'Select or create the volunteer this organisation will rate.'
      : surveyTarget === 'volunteer'
        ? 'This person will receive the survey email.'
        : null
  const orgSectionHint =
    surveyTarget === 'volunteer'
      ? 'Select or create the partner organisation for this placement (for context in the survey).'
      : surveyTarget === 'organisation'
        ? 'The contact email below will receive the assessment survey.'
        : null

  const createMutation = useMutation({
    mutationFn: async () => {
      let volunteerId = form.volunteer_id
      if (volMode === 'new') {
        const v = await createVolunteer(form.newVol)
        volunteerId = v.id
      }
      let organisationId = form.organisation_id
      if (orgMode === 'new') {
        const o = await createOrganisation(form.newOrg)
        organisationId = o.id
      }
      const deployment = await createDeployment({
        volunteer_id: volunteerId,
        organisation_id: organisationId,
        role_title: form.role_title,
        start_date: form.start_date,
        end_date: form.end_date,
      })
      await createSurveyTokens(deployment.id, form.end_date, expiryDays, surveyTypes)
      await updateDeploymentStatus(deployment.id, 'AWAITING_SURVEYS')
      let emailNote = ''
      try {
        const report = await sendSurveyEmails(deployment.id, expiryDays, surveyTypes)
        const msg = deliveryMessage(report ?? {})
        if (msg) emailNote = ` ${msg}`
        if (report.failed?.length || (!report.delivered?.length && (report.missing?.length || report.skipped?.length))) {
          emailNote = ` ${msg || 'No emails were sent.'} You can copy survey links from the table.`
        }
      } catch (e) {
        emailNote = ` Survey links were generated, but emails could not be sent (${e.message}). You can copy the links from the table.`
      }
      return { deployment, emailNote }
    },
    onSuccess: ({ emailNote }) => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
      queryClient.invalidateQueries({ queryKey: ['volunteers'] })
      queryClient.invalidateQueries({ queryKey: ['organisations'] })
      const failed = /No emails were sent|could not be sent/i.test(emailNote)
      if (failed) toast.error(`Deployment created.${emailNote}`)
      else toast.success(`Deployment created.${emailNote}`)
      onClose()
    },
    onError: (e) => toast.error(`Could not create deployment: ${e.message}`),
  })

  const volValid =
    volMode === 'existing'
      ? form.volunteer_id
      : form.newVol.full_name && form.newVol.volunteer_id && (includeVolunteer ? form.newVol.email : true)
  const orgValid =
    orgMode === 'existing'
      ? form.organisation_id
      : form.newOrg.name && (includeOrganisation ? form.newOrg.contact_email : true)
  const valid =
    form.role_title &&
    form.start_date &&
    form.end_date &&
    form.end_date >= form.start_date &&
    volValid &&
    orgValid

  const submitLabel = surveyTypes.length === 2
    ? 'Create & send both surveys'
    : includeVolunteer
      ? 'Create & email volunteer'
      : 'Create & email organisation'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-afri-black/40 p-4" onClick={onClose}>
      <div className="my-8 w-full max-w-2xl rounded-card bg-afri-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-5 font-heading text-h2 text-afri-purple">New deployment</h2>

        <div className="flex flex-col gap-6">
          {/* Survey target */}
          <fieldset>
            <p className="mb-2 font-heading text-sm font-semibold text-afri-purple">Who should receive a survey?</p>
            <div className="flex flex-col gap-2">
              {SURVEY_TARGETS.map((t) => (
                <label
                  key={t.id}
                  className={`flex cursor-pointer gap-3 rounded-lg border px-4 py-3 transition-colors ${
                    surveyTarget === t.id ? 'border-afri-purple bg-afri-lavender/50' : 'border-afri-lavender hover:bg-afri-lavender/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="surveyTarget"
                    value={t.id}
                    checked={surveyTarget === t.id}
                    onChange={() => setSurveyTarget(t.id)}
                    className="mt-1 accent-afri-purple"
                  />
                  <span>
                    <span className="block font-heading text-sm font-semibold text-afri-purple">{t.label}</span>
                    <span className="block font-body text-xs text-afri-black/60">{t.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Volunteer — always required for context or as recipient */}
          <fieldset>
            <Segmented
              label={volSectionLabel}
              mode={volMode}
              setMode={(m) => { setVolMode(m); if (m === 'new' && !form.newVol.volunteer_id) suggestCode() }}
            />
            {volSectionHint && (
              <p className="mb-2 font-body text-xs text-afri-black/55">{volSectionHint}</p>
            )}
            {volMode === 'existing' ? (
              <select className="afri-input" value={form.volunteer_id} onChange={(e) => set({ volunteer_id: e.target.value })}>
                <option value="">Select a volunteer…</option>
                {(volunteers ?? []).map((v) => (
                  <option key={v.id} value={v.id}>{v.full_name} ({v.volunteer_id})</option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="Volunteer ID" value={form.newVol.volunteer_id} onChange={(v) => setNewVol({ volunteer_id: v })} placeholder="AV-2026-003" />
                <Input label="Full name" value={form.newVol.full_name} onChange={(v) => setNewVol({ full_name: v })} />
                {includeVolunteer && (
                  <Input label="Email" type="email" value={form.newVol.email} onChange={(v) => setNewVol({ email: v })} />
                )}
                <Input label="Phone (optional)" value={form.newVol.phone} onChange={(v) => setNewVol({ phone: v })} />
              </div>
            )}
          </fieldset>

          {/* Organisation — always required for context or as recipient */}
          <fieldset>
            <Segmented label={orgSectionLabel} mode={orgMode} setMode={setOrgMode} />
            {orgSectionHint && (
              <p className="mb-2 font-body text-xs text-afri-black/55">{orgSectionHint}</p>
            )}
            {orgMode === 'existing' ? (
              <select className="afri-input" value={form.organisation_id} onChange={(e) => set({ organisation_id: e.target.value })}>
                <option value="">Select an organisation…</option>
                {(organisations ?? []).map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="Name" value={form.newOrg.name} onChange={(v) => setNewOrg({ name: v })} />
                <Input label="Sector (optional)" value={form.newOrg.sector} onChange={(v) => setNewOrg({ sector: v })} />
                <Input label="Contact name (optional)" value={form.newOrg.contact_name} onChange={(v) => setNewOrg({ contact_name: v })} />
                {includeOrganisation && (
                  <Input label="Contact email" type="email" value={form.newOrg.contact_email} onChange={(v) => setNewOrg({ contact_email: v })} />
                )}
              </div>
            )}
          </fieldset>

          {/* Deployment details */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <Input label="Role / Assignment title" value={form.role_title} onChange={(v) => set({ role_title: v })} />
            </div>
            <Input label="Start date" type="date" value={form.start_date} onChange={(v) => set({ start_date: v })} />
            <Input label="End date" type="date" value={form.end_date} onChange={(v) => set({ end_date: v })} />
          </div>
          {form.start_date && form.end_date && form.end_date < form.start_date && (
            <p className="font-body text-sm text-afri-red">End date must be on or after the start date.</p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="afri-btn-secondary" disabled={createMutation.isPending}>Cancel</button>
          <button onClick={() => createMutation.mutate()} disabled={!valid || createMutation.isPending} className="afri-btn-primary">
            {createMutation.isPending ? <Spinner /> : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function Segmented({ label, mode, setMode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <span className="font-heading text-sm font-semibold text-afri-purple">{label}</span>
      <div className="flex overflow-hidden rounded-lg border border-afri-lavender text-xs">
        {['existing', 'new'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 capitalize ${mode === m ? 'bg-afri-purple text-afri-white' : 'bg-afri-white text-afri-purple'}`}
          >
            {m === 'existing' ? 'Select existing' : 'Create new'}
          </button>
        ))}
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="afri-label">{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="afri-input" />
    </div>
  )
}
