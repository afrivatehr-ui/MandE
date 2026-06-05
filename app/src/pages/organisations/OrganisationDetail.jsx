import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import VPIBadge from '../../components/VPIBadge'
import KPICard from '../../components/KPICard'
import Spinner from '../../components/Spinner'
import { ErrorNote } from '../dashboard/Dashboard'
import { useOrganisation } from '../../hooks/useData'
import { dimensionAverages, orgRanking } from '../../utils/analytics'
import { formatVpi, formatDateRange } from '../../utils/format'

export default function OrganisationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, error } = useOrganisation(id)

  const derived = useMemo(() => {
    if (!data) return null
    const dims = dimensionAverages(data.deployments)
    const stats = orgRanking(data.deployments)[0] ?? null
    const quotes = data.deployments
      .map((d) => d.orgSurvey?.s6_strengths)
      .filter(Boolean)
      .slice(0, 4)
    return { dims, stats, quotes }
  }, [data])

  if (isLoading) return <Spinner className="py-20" label="Loading organisation" />
  if (error) return <ErrorNote error={error} />

  const { organisation, deployments } = data
  const { dims, stats, quotes } = derived

  return (
    <div>
      <button onClick={() => navigate('/organisations')} className="afri-btn-ghost mb-4 !px-2 text-sm">
        ← Back to organisations
      </button>

      <PageHeader
        title={organisation.name}
        subtitle={[organisation.sector, organisation.contact_name, organisation.contact_email].filter(Boolean).join(' · ')}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Avg VPI" value={formatVpi(stats?.avgVpi)} tone="purple" />
        <KPICard label="Volunteers Deployed" value={stats?.volunteersDeployed ?? 0} />
        <KPICard label="Tier" value={stats?.tier ?? '—'} />
        <KPICard label="Repeat Request Rate" value={stats?.repeatRate == null ? '—' : `${stats.repeatRate}%`} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="afri-card p-5">
          <h2 className="mb-4 font-heading text-h3 text-afri-purple">Aggregate dimension scores</h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={dims} outerRadius={100}>
              <PolarGrid stroke="#E3D4EC" />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: '#000' }} />
              <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#8D4087' }} />
              <Radar dataKey="value" stroke="#8D4087" fill="#8D4087" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="afri-card p-5">
          <h2 className="mb-4 font-heading text-h3 text-afri-purple">Supervisor highlights</h2>
          {quotes.length ? (
            <ul className="flex flex-col gap-3">
              {quotes.map((q, i) => (
                <li key={i} className="border-l-2 border-afri-purple/40 pl-3 font-body text-sm italic text-afri-black/75">
                  “{q}”
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-sm text-afri-black/50">No supervisor feedback yet.</p>
          )}
        </div>
      </div>

      <h2 className="mb-3 font-heading text-h3 text-afri-purple">Volunteers deployed here</h2>
      <DataTable
        rows={deployments}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/volunteers/${r.volunteer_id}`)}
        columns={[
          { key: 'volunteerName', header: 'Volunteer', render: (r) => (
            <div>
              <p className="font-medium text-afri-purple">{r.volunteerName}</p>
              <p className="text-xs text-afri-black/50">{r.volunteerCode}</p>
            </div>
          ) },
          { key: 'role_title', header: 'Role' },
          { key: 'period', header: 'Period', render: (r) => <span className="text-xs">{formatDateRange(r.start_date, r.end_date)}</span> },
          { key: 'vpi', header: 'VPI', align: 'right', render: (r) => <span className="font-semibold text-afri-purple">{formatVpi(r.vpi)}</span> },
          { key: 'category', header: 'Category', align: 'center', render: (r) => <VPIBadge category={r.category} showLabel={false} /> },
        ]}
      />
    </div>
  )
}
