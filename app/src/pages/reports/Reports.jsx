import { useMemo, useState } from 'react'
import PageHeader from '../../components/PageHeader'
import KPICard from '../../components/KPICard'
import Spinner from '../../components/Spinner'
import { ErrorNote } from '../dashboard/Dashboard'
import { useDeployments } from '../../hooks/useData'
import { summarise, vpiDistribution, orgRanking } from '../../utils/analytics'
import { downloadCsv, triggerDownload } from '../../utils/csv'
import { toast } from '../../store/toastStore'
import { formatVpi } from '../../utils/format'

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
  const { data: deployments, isLoading, error } = useDeployments()
  const [period, setPeriod] = useState('quarter')
  const [custom, setCustom] = useState({ from: '', to: '' })
  const [pdfBusy, setPdfBusy] = useState(false)

  const bounds = useMemo(() => periodBounds(period, custom), [period, custom])

  const filtered = useMemo(() => {
    if (!deployments) return []
    return deployments.filter((d) => {
      if (bounds.from && d.start_date < bounds.from) return false
      if (bounds.to && d.start_date > bounds.to) return false
      return true
    })
  }, [deployments, bounds])

  const summary = useMemo(() => summarise(filtered), [filtered])

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
      const Doc = ReportDocument
      const blob = await pdf(
        <Doc
          periodLabel={bounds.label}
          summary={summary}
          distribution={vpiDistribution(filtered)}
          orgs={orgRanking(filtered)}
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

  return (
    <div>
      <PageHeader title="Reports" subtitle="Programme performance and exports" />

      {/* Period selector */}
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

      {/* Summary snapshot */}
      <p className="mb-3 font-heading text-h3 text-afri-purple">Summary — {bounds.label}</p>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-6">
        <KPICard label="Volunteers" value={summary.totalVolunteers} tone="purple" />
        <KPICard label="Average VPI" value={formatVpi(summary.avgVpi)} />
        <KPICard label="A-Players" value={summary.a} />
        <KPICard label="B-Players" value={summary.b} />
        <KPICard label="C-Players" value={summary.c} tone={summary.c > 0 ? 'alert' : 'default'} />
        <KPICard label="Partner Orgs" value={summary.activeOrgs} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Review cadence */}
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

        {/* VPI scoring reference */}
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
