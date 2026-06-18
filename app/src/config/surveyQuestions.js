// Survey question definitions (spec Section 8.1). Keys match the database
// columns and the Edge Function's validation lists.

export const LIKERT_LABELS = { 1: 'Strongly Disagree', 5: 'Strongly Agree' }

export const VOLUNTEER_SURVEY = {
  type: 'volunteer',
  likertSections: [
    {
      title: 'Onboarding & Support',
      questions: [
        { key: 's2_clear_briefing', text: 'I received a clear briefing on my role and responsibilities before starting.' },
        { key: 's2_felt_welcome', text: 'The partner organisation made me feel welcome on arrival.' },
        { key: 's2_tools_available', text: 'I had access to the tools and resources I needed to do my work.' },
        { key: 's2_afrivate_support', text: 'Afrivate provided adequate pre-deployment support.' },
        { key: 's2_knew_who_to_contact', text: 'I knew who to contact if I had a problem during my deployment.' },
      ],
    },
    {
      title: 'Work Experience',
      questions: [
        { key: 's3_skills_matched', text: 'My skills were well-matched to the tasks I was assigned.' },
        { key: 's3_meaningful_impact', text: 'My work had a visible, meaningful impact.' },
        { key: 's3_appropriate_responsibility', text: 'I was given appropriate levels of responsibility.' },
        { key: 's3_manageable_workload', text: 'The workload was manageable and well-structured.' },
        { key: 's3_useful_feedback', text: 'I received useful feedback from my supervisor at the organisation.' },
        { key: 's3_learning_opportunities', text: 'I had opportunities to learn and develop new skills.' },
      ],
    },
    {
      title: 'Organisational Environment',
      questions: [
        { key: 's4_inclusive_culture', text: "The organisation's culture was inclusive and respectful." },
        { key: 's4_safe_environment', text: 'I felt safe and comfortable in the work environment.' },
        { key: 's4_collaborative_staff', text: 'Staff at the organisation were collaborative and supportive.' },
        { key: 's4_clear_communication', text: 'Communication within the organisation was clear and effective.' },
      ],
    },
  ],
  overall: {
    title: 'Overall Satisfaction',
    sliders: [
      { key: 's5_overall_satisfaction', label: 'Overall satisfaction', min: 1, max: 10, minLabel: 'Very Dissatisfied', maxLabel: 'Very Satisfied' },
      { key: 's5_nps_score', label: 'How likely are you to recommend Afrivate?', min: 0, max: 10, minLabel: 'Not at all likely', maxLabel: 'Extremely likely' },
    ],
    radios: [
      {
        key: 's5_volunteer_again',
        label: 'Would you volunteer with this organisation again?',
        options: ['Yes, definitely', 'Yes, with reservations', 'No', 'Unsure'],
      },
    ],
  },
  feedback: {
    title: 'Open Feedback',
    note: 'All questions in this section are optional.',
    fields: [
      { key: 's6_org_strengths', label: 'What did the organisation do particularly well?' },
      { key: 's6_org_improvements', label: 'What could the organisation improve?' },
      { key: 's6_afrivate_improvements', label: 'What could Afrivate do better to support your deployment?' },
      { key: 's6_other_comments', label: 'Any other comments or suggestions?' },
    ],
  },
}

export const ORG_SURVEY = {
  type: 'org',
  likertSections: [
    {
      title: 'Task Performance',
      questions: [
        { key: 's2_tasks_completed', text: 'The volunteer completed all assigned tasks to a satisfactory standard.' },
        { key: 's2_skills_demonstrated', text: 'The volunteer demonstrated the skills required for their role.' },
        { key: 's2_deadlines_met', text: 'The volunteer met deadlines and managed their time effectively.' },
        { key: 's2_initiative', text: 'The volunteer showed initiative and problem-solving ability.' },
        { key: 's2_work_quality', text: "The quality of the volunteer's work met our organisational expectations." },
        { key: 's2_minimal_supervision', text: 'The volunteer required minimal supervision to deliver results.' },
      ],
    },
    {
      title: 'Professionalism & Conduct',
      questions: [
        { key: 's3_professional_behaviour', text: 'The volunteer behaved professionally at all times.' },
        { key: 's3_clear_communication', text: 'The volunteer communicated clearly and respectfully with staff.' },
        { key: 's3_policy_adherence', text: 'The volunteer adhered to our organisational policies and procedures.' },
        { key: 's3_punctuality', text: 'The volunteer was punctual and consistent in attendance.' },
        { key: 's3_team_integration', text: 'The volunteer integrated well with our team and culture.' },
      ],
    },
    {
      title: 'Impact & Organisational Value',
      questions: [
        { key: 's4_measurable_value', text: "The volunteer's contribution created measurable value for our organisation." },
        { key: 's4_mission_support', text: "The volunteer's work directly supported our mission or operational goals." },
        { key: 's4_irreplaceable_contrib', text: 'We would have struggled to achieve the same outcomes without this volunteer.' },
        { key: 's4_moral_effect', text: "The volunteer's presence had a positive effect on staff morale." },
      ],
    },
  ],
  overall: {
    title: 'Overall Assessment',
    sliders: [
      { key: 's5_overall_effectiveness', label: 'Overall effectiveness', min: 1, max: 10, minLabel: 'Ineffective', maxLabel: 'Highly effective' },
    ],
    radios: [
      {
        key: 's5_request_again',
        label: 'Would you request an Afrivate volunteer again?',
        options: ['Yes, definitely', 'Yes, with requirements', 'No', 'Unsure'],
      },
      {
        key: 's5_request_same_vol',
        label: 'Would you request the same volunteer again?',
        options: ['Yes', 'No', 'Unsure'],
      },
    ],
  },
  feedback: {
    title: 'Open Feedback',
    note: 'All questions in this section are optional.',
    fields: [
      { key: 's6_strengths', label: "What were this volunteer's greatest strengths?" },
      { key: 's6_improvements', label: 'What areas should this volunteer improve on?' },
      { key: 's6_afrivate_improvements', label: 'What could Afrivate do to improve volunteer matching or onboarding?' },
      { key: 's6_other_feedback', label: 'Any other feedback or comments?' },
    ],
  },
}

/** External / media publication questionnaires — same scoring fields, different framing. */
export const VOLUNTEER_SURVEY_EXTERNAL = {
  ...VOLUNTEER_SURVEY,
  type: 'volunteer',
  track: 'external',
  overall: {
    ...VOLUNTEER_SURVEY.overall,
    title: 'Overall experience (shareable summary)',
  },
}

export const ORG_SURVEY_EXTERNAL = {
  ...ORG_SURVEY,
  type: 'org',
  track: 'external',
  overall: {
    ...ORG_SURVEY.overall,
    title: 'Overall assessment (publication-ready summary)',
  },
}

export function getSurveyConfigForTrack(type, track = 'internal') {
  if (type === 'org') return track === 'external' ? ORG_SURVEY_EXTERNAL : ORG_SURVEY
  return track === 'external' ? VOLUNTEER_SURVEY_EXTERNAL : VOLUNTEER_SURVEY
}

export const MANDE_TRACK_LABELS = {
  internal: 'Internal (Afrivate evaluation)',
  external: 'External (Media / publication)',
}
