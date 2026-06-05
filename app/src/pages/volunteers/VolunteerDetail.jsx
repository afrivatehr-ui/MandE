import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import VPIRing from '../../components/VPIRing'
import VPIBadge from '../../components/VPIBadge'
import ActionFlag from '../../components/ActionFlag'
import DataTable from '../../components/DataTable'
import Spinner from '../../components/Spinner'
import SurveyAnswers from '../../components/survey/SurveyAnswers'
import { ErrorNote } from '../dashboard/Dashboard'
import { useVolunteer } from '../../hooks/useData'
import { getActionDescription } from '../../utils/vpiEngine'
import { initials, formatDateRange, formatVpi } from '../../utils/format'
import { VOLUNTEER_SURVEY, ORG_SURVEY } from '../../config/surveyQuestions'

export default function VolunteerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, error } = useVolunteer(id)

  if (isLoading) return <Spinner className="py-20" label="Loading profile" />
  if (error) return <ErrorNote error={error} />

  const { volunteer, deployments } = data
  const latest = deployments.find((d) => d.vpi != null) || deployments[0] || null

  return (
    <div>
      <button onClick={() => navigate('/volunteers')} className="afri-btn-ghost mb-4 !px-2 text-sm">
        ← Back to volunteers
      </button>

      {/* Header */}
      <div className="afri-card mb-6 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-afri-purple font-heading text-xl font-bold text-afri-white">
            {initials(volunteer.full_name)}
          </span>
          <div>
            <h1 className="font-heading text-h2 text-afri-purple">{volunteer.full_name}</h1>
            <p className="font-body text-sm text-afri-black/60">
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
        <VPIRing score={latest?.vpi == null ? null : Number(latest.vpi)} category={latest?.category} />
      </div>

      {latest?.category && (
        <div className="afri-card mb-6 border-l-4 border-l-afri-purple p-5">
          <p className="font-heading text-sm font-semibold text-afri-purple">Recommended next step</p>
          <p className="mt-1 font-body text-sm text-afri-black/75">{getActionDescription(latest.category)}</p>
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
            </p>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Expandable title="Organisation survey" defaultOpen={false}>
                <SurveyAnswers survey={d.orgSurvey} config={ORG_SURVEY} />
              </Expandable>
              <Expandable title="Volunteer self-report" defaultOpen={false}>
                <SurveyAnswers survey={d.volSurvey} config={VOLUNTEER_SURVEY} />
              </Expandable>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DimCard({ label, value, max = 5 }) {
  return (
    <div className="afri-card p-4">
      <p className="font-body text-xs uppercase tracking-wide text-afri-black/50">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-afri-purple">
        {value == null ? '—' : Number(value).toFixed(1)}
        <span className="text-sm font-medium text-afri-black/40"> / {max}</span>
      </p>
    </div>
  )
}

function Expandable({ title, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-afri-lavender">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 font-heading text-sm font-medium text-afri-purple"
      >
        {title}
        <span className="text-afri-black/40">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="border-t border-afri-lavender px-4 py-4">{children}</div>}
    </div>
  )
}
