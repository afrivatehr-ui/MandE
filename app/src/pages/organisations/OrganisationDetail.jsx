import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import ConfirmDialog from '../../components/ConfirmDialog'
import { useOrganisation } from '../../hooks/useData'
import { useAuthStore, isWriter } from '../../store/authStore'
import { archiveOrganisation } from '../../api/data'
import { toast } from '../../store/toastStore'
import { dimensionAverages, orgRanking, supervisorHighlights } from '../../utils/analytics'
import { formatVpi, formatDateRange } from '../../utils/format'

export default function OrganisationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuthStore()
  const canWrite = isWriter(profile?.role)
  const { data, isLoading, error } = useOrganisation(id)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const archiveMutation = useMutation({
    mutationFn: () => archiveOrganisation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisation', id] })
      queryClient.invalidateQueries({ queryKey: ['organisations'] })
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
      toast.success('Organisation archived. Historical data remains in Reports.')
      navigate('/organisations')
    },
    onError: (e) => toast.error(e.message),
  })

  const derived = useMemo(() => {
    if (!data) return null
    const dims = dimensionAverages(data.deployments)
    const stats = orgRanking(data.deployments)[0] ?? null
    const quotes = supervisorHighlights(data.deployments)
    return { dims, stats, quotes }
  }, [data])

  if (isLoading) return <Spinner className="py-20" label="Loading organisation" />
  if (error) return <ErrorNote error={error} />

  const { organisation, deployments } = data
  const { dims, stats, quotes } = derived
  const isArchived = Boolean(organisation.archived_at)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => navigate('/organisations')} className="afri-btn-ghost !px-2 text-sm">
          ← Back to organisations
        </button>
        {canWrite && !isArchived && (
          <button onClick={() => setConfirmArchive(true)} className="afri-btn-secondary text-sm text-afri-red">
            Mark as no longer partnering
          </button>
        )}
        {isArchived && (
          <span className="rounded-full bg-afri-black/5 px-3 py-1 text-xs text-afri-black/50">Archived — data kept for reports</span>
        )}
      </div>

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
          {dims?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={dims} outerRadius={100}>
                <PolarGrid stroke="#E3D4EC" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: '#000' }} />
                <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#8D4087' }} />
                <Radar dataKey="value" stroke="#8D4087" fill="#8D4087" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-afri-black/45">No dimension data yet.</p>
          )}
        </div>

        <div className="afri-card p-5">
          <h2 className="mb-4 font-heading text-h3 text-afri-purple">Supervisor highlights</h2>
          {quotes.length ? (
            <ul className="flex flex-col gap-4">
              {quotes.map((q, i) => (
                <li key={i} className="rounded-lg border border-afri-lavender bg-afri-lavender/30 px-4 py-3">
                  <p className="mb-1 font-body text-[10px] font-semibold uppercase tracking-wide text-afri-purple/70">
                    {q.label} · {q.from}
                  </p>
                  <p className="font-body text-sm italic text-afri-black/75">"{q.text}"</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-sm text-afri-black/50">
              No supervisor feedback yet. Highlights appear when organisations complete the effectiveness survey (Section 6 open feedback).
            </p>
          )}
        </div>
      </div>

      <h2 className="mb-3 font-heading text-h3 text-afri-purple">Volunteers deployed here</h2>
      <DataTable
        rows={(deployments ?? []).filter((d) => !d.volunteerArchived)}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/volunteers/${r.volunteer_id}`)}
        columns={[
          {
            key: 'volunteerName',
            header: 'Volunteer',
            render: (r) => (
              <div>
                <p className="font-medium text-afri-purple">{r.volunteerName}</p>
                <p className="text-xs text-afri-black/50">{r.volunteerCode}</p>
              </div>
            ),
          },
          { key: 'role_title', header: 'Role' },
          { key: 'period', header: 'Period', render: (r) => <span className="text-xs">{formatDateRange(r.start_date, r.end_date)}</span> },
          { key: 'vpi', header: 'VPI', align: 'right', render: (r) => <span className="font-semibold text-afri-purple">{formatVpi(r.vpi)}</span> },
          { key: 'category', header: 'Category', align: 'center', render: (r) => <VPIBadge category={r.category} showLabel={false} /> },
        ]}
      />

      <ConfirmDialog
        open={confirmArchive}
        title="Archive this organisation?"
        message={`${organisation.name} will be removed from active partner lists. All deployment and survey data stays in Reports.`}
        confirmLabel="Archive organisation"
        tone="danger"
        busy={archiveMutation.isPending}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => archiveMutation.mutate()}
      />
    </div>
  )
}
