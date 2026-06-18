import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, isWriter } from '../../store/authStore'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import PageHeader from '../../components/PageHeader'
import KPICard from '../../components/KPICard'
import VPIBadge from '../../components/VPIBadge'
import EmptyState from '../../components/EmptyState'
import Spinner from '../../components/Spinner'
import { useDeployments } from '../../hooks/useData'
import {
  summarise,
  dimensionAverages,
  vpiDistribution,
  actionFlags,
  recentSubmissions,
} from '../../utils/analytics'
import { categoryHex } from '../../utils/category'
import { formatVpi, formatDateTime } from '../../utils/format'
import { mapApiError } from '../../utils/mapApiError'

export default function Dashboard() {
  const navigate = useNavigate()
  const canWrite = isWriter(useAuthStore((s) => s.profile?.role))
  const { data: deployments, isLoading, error } = useDeployments()

  const derived = useMemo(() => {
    if (!deployments) return null
    return {
      summary: summarise(deployments),
      dims: dimensionAverages(deployments),
      distribution: vpiDistribution(deployments),
      flags: actionFlags(deployments),
      recent: recentSubmissions(deployments),
    }
  }, [deployments])

  if (isLoading) return <Spinner className="py-20" label="Loading dashboard" />
  if (error) return <ErrorNote error={error} />

  const hasData = deployments.length > 0
  const { summary, dims, distribution, flags, recent } = derived ?? {
    summary: { totalVolunteers: 0, avgVpi: null, a: 0, b: 0, c: 0, activeOrgs: 0, scoredCount: 0 },
    dims: null,
    distribution: [],
    flags: [],
    recent: [],
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Programme overview · ${summary?.scoredCount ?? 0} scored deployment${summary?.scoredCount === 1 ? '' : 's'}`} />

      {!hasData ? (
        <EmptyState
          title="No deployments yet"
          description={
            canWrite
              ? 'Create your first deployment to start collecting feedback and generating performance scores.'
              : 'Deployments will appear here once your team starts tracking volunteer programmes.'
          }
          cta={
            canWrite ? (
              <button onClick={() => navigate('/deployments')} className="afri-btn-primary">
                Go to deployments
              </button>
            ) : null
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <KPICard label="Scored volunteers" value={summary.totalVolunteers} sub="with VPI" tone="purple" onClick={() => navigate('/volunteers')} />
            <KPICard label="Average VPI" value={summary.avgVpi == null ? '—' : formatVpi(summary.avgVpi)} sub="scored deployments" tone="purple" />
            <KPICard label="A-Players" value={summary.a} sub="≥ 80%" onClick={() => navigate('/deployments')} />
            <KPICard label="B-Players" value={summary.b} sub="60–79%" onClick={() => navigate('/deployments')} />
            <KPICard label="C-Players" value={summary.c} sub="< 60%" tone={summary.c > 0 ? 'alert' : 'default'} onClick={() => navigate('/deployments')} />
            <KPICard label="Scored partners" value={summary.activeOrgs} sub="organisations" onClick={() => navigate('/organisations')} />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="afri-card p-5">
              <h2 className="mb-4 font-heading text-h3 text-afri-purple">VPI Score Distribution</h2>
              {distribution.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={distribution} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#000' }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#000' }} />
                    <Tooltip formatter={(v) => `${v}%`} cursor={{ fill: '#F0E7F6' }} />
                    <Bar dataKey="vpi" radius={[6, 6, 0, 0]}>
                      {distribution.map((entry) => (
                        <Cell key={entry.name} fill={categoryHex[entry.category]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <NoChartData />
              )}
            </div>

            <div className="afri-card p-5">
              <h2 className="mb-4 font-heading text-h3 text-afri-purple">Programme Dimension Averages</h2>
              {dims?.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={dims} outerRadius={100}>
                    <PolarGrid stroke="#E3D4EC" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: '#000' }} />
                    <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#8D4087' }} />
                    <Radar dataKey="value" stroke="#8D4087" fill="#8D4087" fillOpacity={0.4} />
                    <Tooltip formatter={(v) => `${v} / 5`} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <NoChartData label="No dimension data yet — complete surveys to populate this chart." />
              )}
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="afri-card p-5">
              <h2 className="mb-4 font-heading text-h3 text-afri-purple">Action Flags — Needs Intervention</h2>
              {flags.length ? (
                <ul className="flex flex-col divide-y divide-afri-lavender">
                  {flags.map((d) => (
                    <li key={d.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-heading font-medium">{d.volunteerName}</p>
                        <p className="afri-muted truncate font-body text-sm">{d.orgName}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-heading text-sm font-semibold text-afri-red">{formatVpi(d.vpi)}</span>
                        <button type="button" onClick={() => navigate(`/volunteers/${d.volunteer_id}`)} className="afri-btn-secondary !px-3 !py-1.5 text-xs">
                          View profile
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="afri-subtle py-6 text-center font-body text-sm">
                  No volunteers currently need intervention.
                </p>
              )}
            </div>

            <div className="afri-card p-5">
              <h2 className="mb-4 font-heading text-h3 text-afri-purple">Recent Submissions</h2>
              {recent.length ? (
                <ul className="flex flex-col divide-y divide-afri-lavender">
                  {recent.map((r) => (
                    <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-heading font-medium">{r.name}</p>
                        <p className="afri-muted truncate font-body text-sm">
                          {r.org} · {r.type} survey
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-end sm:gap-1">
                        <VPIBadge category={r.scored ? r.category : null} showLabel={false} />
                        {!r.scored && (
                          <span className="afri-subtle font-body text-[10px]">Pending VPI</span>
                        )}
                        <span className="afri-subtle font-body text-xs">{formatDateTime(r.at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="afri-subtle py-6 text-center font-body text-sm">No submissions yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NoChartData({ label = 'No scored deployments yet.' }) {
  return (
    <div className="afri-subtle flex h-[280px] items-center justify-center px-4 text-center font-body text-sm">
      {label}
    </div>
  )
}

export function ErrorNote({ error }) {
  const message = error?.message || mapApiError(error)
  return (
    <div className="rounded-card border border-afri-red/30 bg-afri-red/5 p-5 font-body text-sm text-afri-red">
      We couldn&apos;t load this page. {message || 'Please refresh and try again.'}
    </div>
  )
}
