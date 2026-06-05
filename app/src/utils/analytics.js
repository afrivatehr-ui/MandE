import { categoryFromVpi } from './category'

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

// Deployments that have a final (org-rated) VPI score.
export const scoredDeployments = (deployments) => deployments.filter((d) => d.vpi != null)

export function summarise(deployments) {
  const scored = scoredDeployments(deployments)
  const volunteerIds = new Set(deployments.map((d) => d.volunteer_id))
  const orgIds = new Set(deployments.map((d) => d.organisation_id))
  const counts = { A: 0, B: 0, C: 0 }
  for (const d of scored) if (counts[d.category] != null) counts[d.category] += 1
  return {
    totalVolunteers: volunteerIds.size,
    avgVpi: scored.length ? mean(scored.map((d) => Number(d.vpi))) : null,
    a: counts.A,
    b: counts.B,
    c: counts.C,
    activeOrgs: orgIds.size,
    scoredCount: scored.length,
  }
}

export function dimensionAverages(deployments) {
  const scored = scoredDeployments(deployments).filter((d) => d.orgSurvey)
  if (!scored.length) {
    return [
      { dimension: 'Task', value: 0 },
      { dimension: 'Professionalism', value: 0 },
      { dimension: 'Impact', value: 0 },
      { dimension: 'Overall', value: 0 },
    ]
  }
  return [
    { dimension: 'Task', value: round(mean(scored.map((d) => Number(d.task)))) },
    { dimension: 'Professionalism', value: round(mean(scored.map((d) => Number(d.prof)))) },
    { dimension: 'Impact', value: round(mean(scored.map((d) => Number(d.impact)))) },
    { dimension: 'Overall', value: round(mean(scored.map((d) => Number(d.overall) / 2))) },
  ]
}

export function vpiDistribution(deployments) {
  return scoredDeployments(deployments)
    .map((d) => ({
      name: d.volunteerName,
      org: d.orgName,
      vpi: Number(Number(d.vpi).toFixed(1)),
      category: d.category,
    }))
    .sort((a, b) => b.vpi - a.vpi)
}

export function actionFlags(deployments) {
  return scoredDeployments(deployments).filter((d) => d.category === 'C')
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
        category: d.category,
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
        category: d.category,
      })
    }
  }
  return events.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit)
}

export function orgRanking(deployments) {
  const byOrg = new Map()
  for (const d of deployments) {
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
      const withOrgSurvey = o.deployments.filter((d) => d.orgSurvey)
      const repeatYes = withOrgSurvey.filter((d) => d.orgSurvey.s5_request_again === 'Yes, definitely')
      const avgVpi = scored.length ? mean(scored.map((d) => Number(d.vpi))) : null
      return {
        ...o,
        volunteersDeployed: o.deployments.length,
        avgTask: scored.length ? round(mean(scored.map((d) => Number(d.task)))) : null,
        avgProf: scored.length ? round(mean(scored.map((d) => Number(d.prof)))) : null,
        avgImpact: scored.length ? round(mean(scored.map((d) => Number(d.impact)))) : null,
        avgVpi: avgVpi == null ? null : round(avgVpi),
        tier: avgVpi == null ? null : categoryFromVpi(avgVpi),
        repeatRate: withOrgSurvey.length ? Math.round((repeatYes.length / withOrgSurvey.length) * 100) : null,
      }
    })
    .sort((a, b) => (b.avgVpi ?? -1) - (a.avgVpi ?? -1))
}

function round(n) {
  return Math.round(n * 100) / 100
}
