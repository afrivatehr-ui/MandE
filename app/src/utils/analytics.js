import { categoryFromVpi } from './category'

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

export const scoredDeployments = (deployments) => deployments.filter((d) => d.vpi != null)

function effectiveCategory(d) {
  if (d.category === 'A' || d.category === 'B' || d.category === 'C') return d.category
  if (d.vpi != null) return categoryFromVpi(Number(d.vpi))
  return null
}

/** Likert dimensions for radar charts — org survey preferred, volunteer proxies as fallback. */
function deploymentDimensions(d) {
  if (d.orgSurvey && d.task != null) {
    return {
      task: Number(d.task),
      prof: Number(d.prof),
      impact: Number(d.impact),
      overall: Number(d.overall) / 2,
    }
  }
  const vs = d.volSurvey
  if (vs?.work_exp_avg != null) {
    return {
      task: Number(vs.work_exp_avg),
      prof: Number(vs.onboarding_avg),
      impact: Number(vs.org_env_avg),
      overall: Number(vs.s5_overall_satisfaction) / 2,
    }
  }
  return null
}

export function summarise(deployments) {
  const scored = scoredDeployments(deployments)
  const scoredVolIds = new Set(scored.map((d) => d.volunteer_id).filter(Boolean))
  const scoredOrgIds = new Set(scored.map((d) => d.organisation_id).filter(Boolean))
  const counts = { A: 0, B: 0, C: 0 }
  for (const d of scored) {
    const cat = effectiveCategory(d)
    if (cat) counts[cat] += 1
  }
  return {
    totalVolunteers: scoredVolIds.size,
    avgVpi: scored.length ? mean(scored.map((d) => Number(d.vpi))) : null,
    a: counts.A,
    b: counts.B,
    c: counts.C,
    activeOrgs: scoredOrgIds.size,
    scoredCount: scored.length,
    deploymentCount: deployments.length,
  }
}

export function dimensionAverages(deployments) {
  const dims = { task: [], prof: [], impact: [], overall: [] }
  for (const d of scoredDeployments(deployments)) {
    const row = deploymentDimensions(d)
    if (!row) continue
    dims.task.push(row.task)
    dims.prof.push(row.prof)
    dims.impact.push(row.impact)
    dims.overall.push(row.overall)
  }
  if (!dims.task.length) return null
  return [
    { dimension: 'Task', value: round(mean(dims.task)) },
    { dimension: 'Professionalism', value: round(mean(dims.prof)) },
    { dimension: 'Impact', value: round(mean(dims.impact)) },
    { dimension: 'Overall', value: round(mean(dims.overall)) },
  ]
}

export function vpiDistribution(deployments) {
  return scoredDeployments(deployments)
    .map((d) => ({
      name: d.volunteerName,
      org: d.orgName,
      vpi: Number(Number(d.vpi).toFixed(1)),
      category: effectiveCategory(d),
    }))
    .sort((a, b) => b.vpi - a.vpi)
}

export function actionFlags(deployments) {
  return scoredDeployments(deployments).filter((d) => effectiveCategory(d) === 'C')
}

export function recentSubmissions(deployments, limit = 5) {
  const events = []
  for (const d of deployments) {
    if (d.volSurvey) {
      events.push({
        id: `${d.id}-v`,
        deploymentId: d.id,
        name: d.volunteerName,
        org: d.orgName,
        type: 'Volunteer',
        at: d.volSurvey.submitted_at,
        scored: d.vpi != null,
        category: effectiveCategory(d),
      })
    }
    if (d.orgSurvey) {
      events.push({
        id: `${d.id}-o`,
        deploymentId: d.id,
        name: d.volunteerName,
        org: d.orgName,
        type: 'Organisation',
        at: d.orgSurvey.submitted_at,
        scored: d.vpi != null,
        category: effectiveCategory(d),
      })
    }
  }
  return events.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit)
}

export function orgRanking(deployments) {
  const byOrg = new Map()
  for (const d of deployments) {
    if (!d.organisation_id) continue
    if (!byOrg.has(d.organisation_id)) {
      byOrg.set(d.organisation_id, {
        id: d.organisation_id,
        name: d.orgName,
        sector: d.organisation?.sector,
        deployments: [],
      })
    }
    byOrg.get(d.organisation_id).deployments.push(d)
  }

  return Array.from(byOrg.values())
    .map((o) => {
      const scored = o.deployments.filter((d) => d.vpi != null)
      const withOrgSurvey = scored.filter((d) => d.orgSurvey && d.task != null)
      const repeatYes = withOrgSurvey.filter((d) => d.orgSurvey.s5_request_again === 'Yes, definitely')
      const avgVpi = scored.length ? mean(scored.map((d) => Number(d.vpi))) : null
      return {
        ...o,
        volunteersDeployed: o.deployments.length,
        avgTask: withOrgSurvey.length ? round(mean(withOrgSurvey.map((d) => Number(d.task)))) : null,
        avgProf: withOrgSurvey.length ? round(mean(withOrgSurvey.map((d) => Number(d.prof)))) : null,
        avgImpact: withOrgSurvey.length ? round(mean(withOrgSurvey.map((d) => Number(d.impact)))) : null,
        avgVpi: avgVpi == null ? null : round(avgVpi),
        tier: avgVpi == null ? null : categoryFromVpi(avgVpi),
        repeatRate: withOrgSurvey.length ? Math.round((repeatYes.length / withOrgSurvey.length) * 100) : null,
      }
    })
    .sort((a, b) => (b.avgVpi ?? -1) - (a.avgVpi ?? -1))
}

/** True when deployment period overlaps [from, to] (inclusive date strings YYYY-MM-DD). */
export function deploymentInPeriod(d, { from, to }) {
  if (from && d.end_date < from) return false
  if (to && d.start_date > to) return false
  return true
}

function round(n) {
  return Math.round(n * 100) / 100
}
