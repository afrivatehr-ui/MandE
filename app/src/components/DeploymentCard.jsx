import VPIBadge from './VPIBadge'
import SurveyStatus from './SurveyStatus'
import { formatDateRange, formatVpi, STATUS_LABEL } from '../utils/format'

/**
 * Compact deployment summary. Expects a deployment with joined volunteer and
 * organisation (e.g. { ..., volunteers: {full_name}, organisations: {name} })
 * and optional volDone / orgDone flags.
 */
export default function DeploymentCard({ deployment, volDone, orgDone, onClick }) {
  const vol = deployment.volunteers?.full_name || deployment.volunteer_name || 'Volunteer'
  const org = deployment.organisations?.name || deployment.organisation_name || 'Organisation'
  return (
    <button
      onClick={onClick}
      className="afri-card flex w-full flex-col gap-3 p-4 text-left transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-heading font-medium text-afri-purple">{vol}</p>
          <p className="truncate font-body text-sm text-afri-black/60">{org}</p>
        </div>
        <VPIBadge category={deployment.vpi_category} showLabel={false} />
      </div>
      <p className="font-body text-xs text-afri-black/55">{deployment.role_title}</p>
      <div className="flex items-center justify-between">
        <span className="font-body text-xs text-afri-black/55">
          {formatDateRange(deployment.start_date, deployment.end_date)}
        </span>
        <SurveyStatus volDone={volDone} orgDone={orgDone} />
      </div>
      <div className="flex items-center justify-between border-t border-afri-lavender pt-2">
        <span className="font-body text-xs text-afri-black/50">{STATUS_LABEL[deployment.status]}</span>
        <span className="font-heading text-sm font-semibold text-afri-purple">
          {formatVpi(deployment.vpi_score)}
        </span>
      </div>
    </button>
  )
}
