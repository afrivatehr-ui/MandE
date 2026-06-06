import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import VPIBadge from '../../components/VPIBadge'
import EmptyState from '../../components/EmptyState'
import Spinner from '../../components/Spinner'
import { ErrorNote } from '../dashboard/Dashboard'
import { useAllDeployments } from '../../hooks/useData'
import { orgRanking } from '../../utils/analytics'
import { formatVpi } from '../../utils/format'

export default function OrganisationsList() {
  const navigate = useNavigate()
  const { data: deployments, isLoading, error } = useAllDeployments()

  const rows = useMemo(() => {
    if (!deployments) return []
    return orgRanking(deployments).filter((o) => {
      const first = o.deployments[0]
      return !first?.organisationArchived
    })
  }, [deployments])

  if (isLoading) return <Spinner className="py-20" label="Loading organisations" />
  if (error) return <ErrorNote error={error} />

  const num = (v, suffix = '') => (v == null ? '—' : `${v}${suffix}`)

  const columns = [
    { key: 'name', header: 'Organisation', sortable: true, render: (r) => (
      <div>
        <p className="font-medium text-afri-purple">{r.name}</p>
        {r.sector && <p className="text-xs text-afri-black/50">{r.sector}</p>}
      </div>
    ) },
    { key: 'volunteersDeployed', header: 'Volunteers', align: 'center', sortable: true },
    { key: 'avgTask', header: 'Avg Task', align: 'right', sortValue: (r) => r.avgTask ?? -1, render: (r) => num(r.avgTask) },
    { key: 'avgProf', header: 'Avg Prof.', align: 'right', sortValue: (r) => r.avgProf ?? -1, render: (r) => num(r.avgProf) },
    { key: 'avgImpact', header: 'Avg Impact', align: 'right', sortValue: (r) => r.avgImpact ?? -1, render: (r) => num(r.avgImpact) },
    { key: 'avgVpi', header: 'Avg VPI', align: 'right', sortable: true, sortValue: (r) => r.avgVpi ?? -1, render: (r) => <span className="font-heading font-semibold text-afri-purple">{formatVpi(r.avgVpi)}</span> },
    { key: 'tier', header: 'Tier', align: 'center', render: (r) => <VPIBadge category={r.tier} showLabel={false} /> },
    { key: 'repeatRate', header: 'Repeat Request', align: 'right', sortValue: (r) => r.repeatRate ?? -1, render: (r) => num(r.repeatRate, '%') },
  ]

  return (
    <div>
      <PageHeader title="Organisations" subtitle="Partner performance, ranked by average VPI" />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/organisations/${r.id}`)}
        emptyState={<EmptyState title="No organisations yet" description="Organisations appear here once they host a deployment." />}
      />
    </div>
  )
}
