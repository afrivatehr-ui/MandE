import { describe, it, expect } from 'vitest'
import {
  calculateVPI,
  getCategory,
  getActionFlag,
  calcOrgSectionAvgs,
  calcVolSectionAvgs,
} from './vpiEngine'

describe('calculateVPI', () => {
  it('returns 100 for all-5 dimensions and overall 10', () => {
    expect(calculateVPI({ taskPerf: 5, professionalism: 5, impact: 5, overall10: 10 })).toBe(100)
  })

  it('normalises the 1-10 overall by halving it', () => {
    // ((4 + 4 + 4 + (8/2)) / 4) * 20 = 80
    expect(calculateVPI({ taskPerf: 4, professionalism: 4, impact: 4, overall10: 8 })).toBe(80)
  })

  it('returns a mid-range score', () => {
    // ((3 + 3 + 3 + (6/2)) / 4) * 20 = 60
    expect(calculateVPI({ taskPerf: 3, professionalism: 3, impact: 3, overall10: 6 })).toBe(60)
  })
})

describe('getCategory', () => {
  it('classifies A at >= 80', () => expect(getCategory(80)).toBe('A'))
  it('classifies B between 60 and 79', () => expect(getCategory(60)).toBe('B'))
  it('classifies C below 60', () => expect(getCategory(59.9)).toBe('C'))
})

describe('getActionFlag', () => {
  it('maps categories to flags', () => {
    expect(getActionFlag('A')).toBe('Retain & Recognise')
    expect(getActionFlag('B')).toBe('Develop & Monitor')
    expect(getActionFlag('C')).toBe('Urgent Review')
  })
})

describe('calcOrgSectionAvgs', () => {
  it('computes dimension averages and an A-grade VPI', () => {
    const survey = {
      s2_tasks_completed: 5, s2_skills_demonstrated: 5, s2_deadlines_met: 4,
      s2_initiative: 5, s2_work_quality: 5, s2_minimal_supervision: 4,
      s3_professional_behaviour: 5, s3_clear_communication: 5, s3_policy_adherence: 4,
      s3_punctuality: 5, s3_team_integration: 4,
      s4_measurable_value: 5, s4_mission_support: 4, s4_irreplaceable_contrib: 5, s4_moral_effect: 4,
      s5_overall_effectiveness: 9,
    }
    const { taskPerf, professionalism, impact, vpi } = calcOrgSectionAvgs(survey)
    expect(taskPerf).toBeCloseTo(4.67, 2)
    expect(professionalism).toBeCloseTo(4.6, 2)
    expect(impact).toBeCloseTo(4.5, 2)
    expect(vpi).toBeGreaterThanOrEqual(80)
    expect(getCategory(vpi)).toBe('A')
  })
})

describe('calcVolSectionAvgs', () => {
  it('computes proxy dimensions for the volunteer survey', () => {
    const survey = {
      s2_clear_briefing: 3, s2_felt_welcome: 3, s2_tools_available: 3,
      s2_afrivate_support: 3, s2_knew_who_to_contact: 3,
      s3_skills_matched: 3, s3_meaningful_impact: 3, s3_appropriate_responsibility: 3,
      s3_manageable_workload: 3, s3_useful_feedback: 3, s3_learning_opportunities: 3,
      s4_inclusive_culture: 3, s4_safe_environment: 3, s4_collaborative_staff: 3, s4_clear_communication: 3,
      s5_overall_satisfaction: 6,
    }
    const { onboarding, workExp, orgEnv, vpi } = calcVolSectionAvgs(survey)
    expect(onboarding).toBe(3)
    expect(workExp).toBe(3)
    expect(orgEnv).toBe(3)
    expect(vpi).toBe(60)
  })
})
