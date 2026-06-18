import VPIBadge from '../VPIBadge'
import ActionFlag from '../ActionFlag'
import SurveyStatus from '../SurveyStatus'
import ScoreBar from '../ScoreBar'
import DeploymentActions from '../DeploymentActions'
import { formatDateRange, formatVpi, STATUS_LABEL } from '../../utils/format'
import { MANDE_TRACK_LABELS } from '../../config/surveyQuestions'
import { categoryHex } from '../../utils/category'

/** Volunteers tab — rich mobile cards */
export function VolunteerMobileList({ rows, onSelect }) {
  if (!rows.length) return null
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r)}
          className="group w-full overflow-hidden rounded-2xl border border-afri-lavender bg-afri-white text-left shadow-card transition-all active:scale-[0.99] active:shadow-sm"
        >
          <div
            className="flex items-center justify-between gap-3 px-4 py-3"
            style={{ background: `linear-gradient(135deg, ${categoryHex[r.category] ?? '#8D4087'}22, #F0E7F6)` }}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-base font-semibold text-afri-purple">{r.volunteerName}</p>
              <p className="font-body text-xs text-afri-black/50">{r.volunteerCode}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <VPIBadge category={r.category} showLabel={false} />
              <span className="font-heading text-lg font-bold text-afri-purple">{formatVpi(r.vpi)}</span>
            </div>
          </div>

          <div className="space-y-3 px-4 py-4">
            <div className="flex items-start gap-2">
              <BuildingMini />
              <div className="min-w-0">
                <p className="font-body text-xs uppercase tracking-wide text-afri-black/45">Organisation</p>
                <p className="truncate font-medium text-afri-black/85">{r.orgName}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs text-afri-black/55">
              <span className="flex items-center gap-1.5">
                <CalendarMini />
                {formatDateRange(r.start_date, r.end_date)}
              </span>
              <SurveyStatus
                volDone={r.volSubmitted}
                orgDone={r.orgSubmitted}
                volLinkUsed={r.volLinkUsed}
                orgLinkUsed={r.orgLinkUsed}
                volNa={!r.needsVolunteerSurvey}
                orgNa={!r.needsOrganisationSurvey}
              />
            </div>

            {(r.task != null || r.prof != null || r.impact != null) && (
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-afri-lavender/50 p-3">
                {r.task != null && (
                  <div>
                    <p className="mb-1 text-[10px] font-medium uppercase text-afri-black/45">Task</p>
                    <ScoreBar value={r.task} />
                  </div>
                )}
                {r.prof != null && (
                  <div>
                    <p className="mb-1 text-[10px] font-medium uppercase text-afri-black/45">Prof.</p>
                    <ScoreBar value={r.prof} />
                  </div>
                )}
                {r.impact != null && (
                  <div>
                    <p className="mb-1 text-[10px] font-medium uppercase text-afri-black/45">Impact</p>
                    <ScoreBar value={r.impact} />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-afri-lavender/60 pt-3">
              <ActionFlag category={r.category} />
              <span className="font-body text-sm font-medium text-afri-purple group-hover:underline">
                View profile →
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

/** Organisations tab — ranked partner cards */
export function OrganisationMobileList({ rows, onSelect }) {
  if (!rows.length) return null
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r, i) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onSelect(r)}
          className="w-full overflow-hidden rounded-2xl border border-afri-lavender bg-afri-white text-left shadow-card transition-all active:scale-[0.99]"
        >
          <div className="flex items-start gap-3 bg-afri-purple px-4 py-4 text-afri-white">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-afri-white/15 font-heading text-sm font-bold">
              #{i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-base font-semibold">{r.name}</p>
              {r.sector && <p className="truncate font-body text-xs text-afri-white/70">{r.sector}</p>}
            </div>
            <VPIBadge category={r.tier} showLabel={false} />
          </div>

          <div className="grid grid-cols-2 gap-px bg-afri-lavender/80">
            <StatCell label="Avg VPI" value={formatVpi(r.avgVpi)} large />
            <StatCell label="Volunteers" value={r.volunteersDeployed} />
            <StatCell label="Avg Task" value={r.avgTask ?? '—'} />
            <StatCell label="Repeat rate" value={r.repeatRate == null ? '—' : `${r.repeatRate}%`} />
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex gap-3 font-body text-xs text-afri-black/55">
              <span>Prof. {r.avgProf ?? '—'}</span>
              <span>Impact {r.avgImpact ?? '—'}</span>
            </div>
            <span className="text-sm font-medium text-afri-purple">Details →</span>
          </div>
        </button>
      ))}
    </div>
  )
}

/** Deployments tab — operational cards with inline actions */
export function DeploymentMobileList({
  rows,
  canWrite,
  emailBusy,
  onView,
  onCopyLinks,
  onSendEmail,
  onEdit,
  onComplete,
  onRemove,
}) {
  if (!rows.length) return null
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <article
          key={r.id}
          className="overflow-hidden rounded-2xl border border-afri-lavender bg-afri-white shadow-card"
        >
          <div className="border-b border-afri-lavender/60 bg-gradient-to-r from-afri-lavender/60 to-afri-white px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-heading text-base font-semibold text-afri-purple">{r.volunteerName}</p>
                <p className="font-body text-xs text-afri-black/50">{r.volunteerCode}</p>
                <p className="mt-1 truncate font-body text-sm text-afri-black/75">{r.orgName}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="rounded-full bg-afri-lavender px-2.5 py-1 font-body text-[11px] font-medium text-afri-purple">
                  {STATUS_LABEL[r.status]}
                </span>
                <VPIBadge category={r.category} showLabel={false} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-body text-xs text-afri-black/45">Period</p>
              <p className="font-body text-sm">{formatDateRange(r.start_date, r.end_date)}</p>
              <p className="mt-1 font-body text-xs text-afri-black/50">
                {MANDE_TRACK_LABELS[r.mande_track] ?? 'Internal'}
                {r.hours_served != null ? ` · ${Number(r.hours_served).toLocaleString()} hrs` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="font-body text-xs text-afri-black/45">VPI</p>
              <p className="font-heading text-lg font-bold text-afri-purple">{formatVpi(r.vpi)}</p>
            </div>
          </div>

          <div className="flex items-center justify-center border-y border-afri-lavender/50 bg-afri-lavender/25 py-2.5">
            <SurveyStatus
              volDone={r.volSubmitted}
              orgDone={r.orgSubmitted}
              volLinkUsed={r.volLinkUsed}
              orgLinkUsed={r.orgLinkUsed}
              volNa={!r.needsVolunteerSurvey}
              orgNa={!r.needsOrganisationSurvey}
            />
          </div>

          <div className="px-3 py-3">
            <DeploymentActions
              row={r}
              canWrite={canWrite}
              emailBusy={emailBusy}
              onView={() => onView(r)}
              onCopyLinks={() => onCopyLinks(r)}
              onSendEmail={(types) => onSendEmail(r, types)}
              onEdit={onEdit ? () => onEdit(r) : undefined}
              onComplete={() => onComplete(r)}
              onRemove={() => onRemove(r)}
            />
          </div>
        </article>
      ))}
    </div>
  )
}

function StatCell({ label, value, large }) {
  return (
    <div className="bg-afri-white px-4 py-3">
      <p className="font-body text-[10px] uppercase tracking-wide text-afri-black/45">{label}</p>
      <p className={`font-heading font-semibold text-afri-purple ${large ? 'text-xl' : 'text-base'}`}>{value}</p>
    </div>
  )
}

function BuildingMini() {
  return (
    <svg className="mt-0.5 shrink-0 text-afri-purple/70" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="1" /><path d="M9 22v-4h6v4" />
    </svg>
  )
}

function CalendarMini() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
