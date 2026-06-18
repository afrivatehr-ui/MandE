import Papa from 'papaparse'
import { MANDE_TRACK_LABELS } from '../config/surveyQuestions'

export function deploymentsToRows(deployments) {
  return deployments.map((d) => ({
    'Volunteer Name': d.volunteerName,
    'Volunteer ID': d.volunteerCode,
    Organisation: d.orgName,
    Sector: d.organisation?.sector ?? '',
    Role: d.role_title,
    Start: d.start_date,
    End: d.end_date,
    Status: d.status,
    'M&E Track': MANDE_TRACK_LABELS[d.mande_track] ?? d.mande_track ?? 'Internal',
    'Hours Served': d.hours_served ?? '',
    'Task Performance': d.task ?? '',
    Professionalism: d.prof ?? '',
    Impact: d.impact ?? '',
    'Overall (/10)': d.overall ?? '',
    'VPI %': d.vpi ?? '',
    Category: d.category ?? '',
    'Action Flag': d.action_flag ?? '',
    'Volunteer Survey': d.volSubmitted ? 'Submitted' : 'Pending',
    'Org Survey': d.orgSubmitted ? 'Submitted' : 'Pending',
    'Volunteer NPS': d.volSurvey?.s5_nps_score ?? '',
    'Would Volunteer Again': d.volSurvey?.s5_volunteer_again ?? '',
    'Would Request Again': d.orgSurvey?.s5_request_again ?? '',
    'Would Request Same Volunteer': d.orgSurvey?.s5_request_same_vol ?? '',
  }))
}

export function downloadCsv(deployments, filename = 'afrivate-me-export.csv') {
  const csv = Papa.unparse(deploymentsToRows(deployments))
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename)
}

// --- Survey responses --------------------------------------------------------

// Flatten survey responses into labelled rows using the question config, so the
// CSV headers read like the actual questions rather than DB column names.
// Works for built-in (volunteer/org) and custom surveys.
export function surveyResponsesToRows(config, responses, opts = {}) {
  const isOrg = opts.isOrg ?? config?.type === 'org'
  const isCustom = opts.isCustom ?? false
  const likertSections = config?.likertSections ?? []
  const sliders = config?.overall?.sliders ?? []
  const radios = config?.overall?.radios ?? []
  const fields = config?.feedback?.fields ?? []

  return responses.map((r) => {
    const dep = r.deployment || r.deployments || {}
    const vol = r.volunteer || dep.volunteers || {}
    const org = r.organisation || dep.organisations || {}
    const row = { 'Submitted At': r.submitted_at ? new Date(r.submitted_at).toLocaleString('en-GB') : '' }

    if (isCustom) {
      row['Respondent'] = r.respondent_name ?? ''
      row['Email'] = r.respondent_email ?? ''
    } else {
      row['Volunteer'] = vol.full_name ?? ''
      row['Volunteer ID'] = vol.volunteer_id ?? ''
      row['Organisation'] = org.name ?? ''
      row['Role'] = dep.role_title ?? ''
      if (isOrg) {
        row['Supervisor'] = r.supervisor_name ?? ''
        row['Supervisor Title'] = r.supervisor_title ?? ''
      }
    }

    for (const section of likertSections) for (const q of section.questions) row[q.text] = r[q.key] ?? ''
    for (const s of sliders) row[s.label] = r[s.key] ?? ''
    for (const rad of radios) row[rad.label] = r[rad.key] ?? ''
    for (const f of fields) row[f.label] = r[f.key] ?? ''

    if (!isCustom && isOrg) {
      row['Task Performance (avg)'] = r.task_perf_avg ?? ''
      row['Professionalism (avg)'] = r.professionalism_avg ?? ''
      row['Impact (avg)'] = r.impact_avg ?? ''
      row['Org VPI %'] = r.org_vpi ?? ''
    } else if (!isCustom) {
      row['Onboarding (avg)'] = r.onboarding_avg ?? ''
      row['Work Experience (avg)'] = r.work_exp_avg ?? ''
      row['Org Environment (avg)'] = r.org_env_avg ?? ''
      row['Volunteer VPI %'] = r.volunteer_vpi ?? ''
    }
    return row
  })
}

export function downloadSurveyResponsesCsv(config, responses, filename, opts = {}) {
  const csv = Papa.unparse(surveyResponsesToRows(config, responses, opts))
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename || 'afrivate-survey-responses.csv')
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
