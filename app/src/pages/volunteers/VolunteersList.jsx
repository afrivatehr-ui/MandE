import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import ScoreBar from '../../components/ScoreBar'
import VPIBadge from '../../components/VPIBadge'
import ActionFlag from '../../components/ActionFlag'
import SurveyStatus from '../../components/SurveyStatus'
import EmptyState from '../../components/EmptyState'
import Spinner from '../../components/Spinner'
import { ErrorNote } from '../dashboard/Dashboard'
import { useDeployments, useOrganisations } from '../../hooks/useData'
import { formatDateRange, formatVpi } from '../../utils/format'

export default function VolunteersList() {
  const navigate = useNavigate()
  const { data: deployments, isLoading, error } = useDeployments()
  const { data: organisations } = useOrganisations()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [orgId, setOrgId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const rows = useMemo(() => {
    if (!deployments) return []
    const q = search.trim().toLowerCase()
    return deployments.filter((d) => {
      if (q && !`${d.volunteerName} ${d.volunteerCode} ${d.orgName}`.toLowerCase().includes(q)) return false
      if (category && d.category !== category) return false
      if (orgId && d.organisation_id !== orgId) return false
      if (from && d.start_date < from) return false
      if (to && d.start_date > to) return false
      return true
    })
  }, [deployments, search, category, orgId, from, to])

  if (isLoading) return <Spinner className="py-20" label="Loading volunteers" />
  if (error) return <ErrorNote error={error} />

  const columns = [
    {
      key: 'volunteerName',
      header: 'Volunteer',
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-medium text-afri-purple">{r.volunteerName}</p>
          <p className="text-xs text-afri-black/50">{r.volunteerCode}</p>
        </div>
      ),
    },
    { key: 'orgName', header: 'Organisation', sortable: true },
    {
      key: 'period',
      header: 'Period',
      render: (r) => <span className="text-xs">{formatDateRange(r.start_date, r.end_date)}</span>,
    },
    { key: 'task', header: 'Task', sortValue: (r) => r.task ?? -1, render: (r) => (r.task == null ? '—' : <ScoreBar value={r.task} />) },
    { key: 'prof', header: 'Prof.', sortValue: (r) => r.prof ?? -1, render: (r) => (r.prof == null ? '—' : <ScoreBar value={r.prof} />) },
    { key: 'impact', header: 'Impact', sortValue: (r) => r.impact ?? -1, render: (r) => (r.impact == null ? '—' : <ScoreBar value={r.impact} />) },
    {
      key: 'vpi',
      header: 'VPI',
      align: 'right',
      sortable: true,
      sortValue: (r) => (r.vpi == null ? -1 : Number(r.vpi)),
      render: (r) => <span className="font-heading font-semibold text-afri-purple">{formatVpi(r.vpi)}</span>,
    },
    { key: 'category', header: 'Category', align: 'center', render: (r) => <VPIBadge category={r.category} showLabel={false} /> },
    { key: 'flag', header: 'Action', render: (r) => <ActionFlag category={r.category} /> },
    {
      key: 'surveys',
      header: 'Surveys',
      align: 'center',
      render: (r) => (
        <SurveyStatus
          volDone={r.volSubmitted}
          orgDone={r.orgSubmitted}
          volNa={!r.needsVolunteerSurvey}
          orgNa={!r.needsOrganisationSurvey}
        />
      ),
    },
    {
      key: 'view',
      header: '',
      align: 'right',
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/volunteers/${r.volunteer_id}`)
          }}
          className="afri-btn-ghost !px-3 !py-1.5 text-xs"
        >
          View
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Volunteers" subtitle={`${rows.length} deployment${rows.length === 1 ? '' : 's'}`} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="afri-label">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, ID or organisation"
            className="afri-input"
          />
        </div>
        <div>
          <label className="afri-label">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="afri-input">
            <option value="">All</option>
            <option value="A">A — High</option>
            <option value="B">B — Developing</option>
            <option value="C">C — Intervention</option>
          </select>
        </div>
        <div>
          <label className="afri-label">Organisation</label>
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="afri-input">
            <option value="">All</option>
            {(organisations ?? []).map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="afri-label">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="afri-input" />
        </div>
        <div>
          <label className="afri-label">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="afri-input" />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/volunteers/${r.volunteer_id}`)}
        emptyState={
          <EmptyState
            title="No volunteers match"
            description="Try adjusting your filters, or create a deployment to start tracking volunteers."
          />
        }
      />
    </div>
  )
}
