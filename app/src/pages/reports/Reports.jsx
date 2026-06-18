import { useMemo, useState } from 'react'
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
import DataTable from '../../components/DataTable'
import Spinner from '../../components/Spinner'
import { ErrorNote } from '../dashboard/Dashboard'
import { useAllDeployments } from '../../hooks/useData'
import {
  summarise,
  vpiDistribution,
  orgRanking,
  dimensionAverages,
  deploymentInPeriod,
} from '../../utils/analytics'
import { categoryHex } from '../../utils/category'
import { downloadCsv, triggerDownload } from '../../utils/csv'
import { toast } from '../../store/toastStore'
import { formatVpi } from '../../utils/format'
import { MANDE_TRACK_LABELS } from '../../config/surveyQuestions'

function periodBounds(period, custom) {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  if (period === 'all') return { from: null, to: null, label: 'All time' }
  if (period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    return { from, to: today, label: now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) }
  }
  if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3)
    const from = new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10)
    return { from, to: today, label: `Q${q + 1} ${now.getFullYear()}` }
  }
  if (period === 'year') {
    const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
    return { from, to: today, label: String(now.getFullYear()) }
  }
  return { from: custom.from || null, to: custom.to || null, label: 'Custom range' }
}

export default function Reports() {
  const { data: deployments, isLoading, error } = useAllDeployments()
  const [period, setPeriod] = useState('quarter')
  const [trackFilter, setTrackFilter] = useState('all')
  const [custom, setCustom] = useState({ from: '', to: '' })
  const [pdfBusy, setPdfBusy] = useState(false)

  const bounds = useMemo(() => periodBounds(period, custom), [period, custom])

  const filtered = useMemo(() => {
    if (!deployments) return []
    return deployments
      .filter((d) => deploymentInPeriod(d, bounds))
      .filter((d) => trackFilter === 'all' || (d.mande_track ?? 'internal') === trackFilter)
  }, [deployments, bounds, trackFilter])

  const summary = useMemo(() => summarise(filtered), [filtered])
  const distribution = useMemo(() => vpiDistribution(filtered), [filtered])
  const dims = useMemo(() => dimensionAverages(filtered), [filtered])
  const orgs = useMemo(() => orgRanking(filtered), [filtered])

  if (isLoading) return <Spinner className="py-20" label="Loading reports" />
  if (error) return <ErrorNote error={error} />

  function handleCsv() {
    if (!filtered.length) return toast.error('No data in the selected period to export.')
    downloadCsv(filtered, `afrivate-me-${period}.csv`)
    toast.success('CSV downloaded.')
  }

  async function handlePdf() {
    setPdfBusy(true)
    try {
      const [{ pdf }, { default: ReportDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../../components/reports/ReportDocument'),
      ])
      const blob = await pdf(
        <ReportDocument
          periodLabel={bounds.label}
          summary={summary}
          distribution={distribution}
          orgs={orgs}
          generatedAt={new Date()}
        />,
      ).toBlob()
      triggerDownload(blob, `afrivate-me-report-${period}.pdf`)
      toast.success('PDF report generated.')
    } catch (e) {
      toast.error(`Could not generate PDF: ${e.message}`)
    } finally {
      setPdfBusy(false)
    }
  }

  const num = (v, suffix = '') => (v == null ? '—' : `${v}${suffix}`)

  return (
    <div>
      <PageHeader title="Reports" subtitle="Historical programme data — includes archived records" />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="afri-label">Period</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="afri-input">
            <option value="month">This month</option>
            <option value="quarter">This quarter</option>
            <option value="year">This year</option>
            <option value="all">All time</option>
            <option value="custom">Custom range</option>
          </select>
        </div>
        <div>
          <label className="afri-label">M&amp;E track</label>
          <select value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)} className="afri-input">
            <option value="all">All tracks</option>
            <option value="internal">{MANDE_TRACK_LABELS.internal}</option>
            <option value="external">{MANDE_TRACK_LABELS.external}</option>
          </select>
        </div>
        {period === 'custom' && (
          <>
            <div>
              <label className="afri-label">From</label>
              <input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="afri-input" />
            </div>
            <div>
              <label className="afri-label">To</label>
              <input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="afri-input" />
            </div>
          </>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={handleCsv} className="afri-btn-secondary">Download CSV</button>
          <button onClick={handlePdf} disabled={pdfBusy} className="afri-btn-primary">
            {pdfBusy ? <Spinner /> : 'Generate PDF report'}
          </button>
        </div>
      </div>

      <p className="mb-3 font-heading text-h3 text-afri-purple">Summary — {bounds.label}</p>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <KPICard label="Scored volunteers" value={summary.totalVolunteers} tone="purple" />
        <KPICard label="Average VPI" value={formatVpi(summary.avgVpi)} />
        <KPICard label="A-Players" value={summary.a} />
        <KPICard label="B-Players" value={summary.b} />
        <KPICard label="C-Players" value={summary.c} tone={summary.c > 0 ? 'alert' : 'default'} />
        <KPICard label="Partner orgs" value={summary.activeOrgs} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="afri-card p-5">
          <h2 className="mb-4 font-heading text-h3 text-afri-purple">VPI distribution</h2>
          {distribution.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={distribution} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#000' }} interval={0} angle={-20} textAnchor="end" height={56} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#000' }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="vpi" radius={[6, 6, 0, 0]}>
                  {distribution.map((entry) => (
                    <Cell key={`${entry.name}-${entry.org}`} fill={categoryHex[entry.category] ?? '#8D4087'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-afri-black/45">No scored deployments in this period.</p>
          )}
        </div>

        <div className="afri-card p-5">
          <h2 className="mb-4 font-heading text-h3 text-afri-purple">Dimension averages</h2>
          {dims?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={dims} outerRadius={90}>
                <PolarGrid stroke="#E3D4EC" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#000' }} />
                <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#8D4087' }} />
                <Radar dataKey="value" stroke="#8D4087" fill="#8D4087" fillOpacity={0.4} />
                <Tooltip formatter={(v) => `${v} / 5`} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-sm text-afri-black/45">No dimension data in this period.</p>
          )}
        </div>
      </div>

      <div className="afri-card mb-8 p-5">
        <h2 className="mb-4 font-heading text-h3 text-afri-purple">Organisation ranking</h2>
        <DataTable
          rows={orgs}
          rowKey={(r) => r.id}
          emptyState={<p className="py-8 text-center text-sm text-afri-black/45">No organisation data in this period.</p>}
          columns={[
            { key: 'name', header: 'Organisation', sortable: true },
            { key: 'volunteersDeployed', header: 'Deployments', align: 'center', sortable: true },
            { key: 'avgVpi', header: 'Avg VPI', align: 'right', sortValue: (r) => r.avgVpi ?? -1, render: (r) => formatVpi(r.avgVpi) },
            { key: 'avgTask', header: 'Task', align: 'right', render: (r) => num(r.avgTask) },
            { key: 'avgProf', header: 'Prof.', align: 'right', render: (r) => num(r.avgProf) },
            { key: 'avgImpact', header: 'Impact', align: 'right', render: (r) => num(r.avgImpact) },
            { key: 'tier', header: 'Tier', align: 'center', render: (r) => <VPIBadge category={r.tier} showLabel={false} /> },
            { key: 'repeatRate', header: 'Repeat', align: 'right', render: (r) => num(r.repeatRate, '%') },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="afri-card p-5">
          <h2 className="mb-4 font-heading text-h3 text-afri-purple">Review cadence</h2>
          <ul className="flex flex-col gap-3">
            {[
              ['Weekly', 'Check responses as they arrive.'],
              ['Monthly', 'Compile organisation averages and share with the Programme team.'],
              ['Quarterly', 'Executive review of volunteer performance and partner outcomes.'],
              ['Annually', 'Framework audit and methodology review.'],
            ].map(([k, v]) => (
              <li key={k} className="flex gap-3">
                <span className="w-20 shrink-0 font-heading text-sm font-semibold text-afri-purple">{k}</span>
                <span className="font-body text-sm text-afri-black/70">{v}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="afri-card p-5">
          <h2 className="mb-4 font-heading text-h3 text-afri-purple">VPI scoring reference</h2>
          <div className="mb-4 rounded-lg bg-afri-lavender/60 p-3 font-body text-sm text-afri-black/80">
            VPI% = ((Task + Professionalism + Impact + (Overall / 2)) / 4) × 20
          </div>
          <ul className="flex flex-col gap-2 font-body text-sm">
            <li className="flex items-center gap-2"><Dot c="green" /> Category A (≥ 80%) — High Performer · Retain &amp; Recognise</li>
            <li className="flex items-center gap-2"><Dot c="yellow" /> Category B (60–79%) — Developing · Develop &amp; Monitor</li>
            <li className="flex items-center gap-2"><Dot c="red" /> Category C (&lt; 60%) — Needs Intervention · Urgent Review</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function Dot({ c }) {
  const map = { green: 'bg-afri-green', yellow: 'bg-afri-yellow', red: 'bg-afri-red' }
  return <span className={`h-2.5 w-2.5 rounded-full ${map[c]}`} />
}
