import { MANDE_TRACK_LABELS } from '../config/surveyQuestions'

export function isOrgSurveyKey(key) {
  return String(key ?? '').startsWith('org')
}

export function surveyTypeFromKey(key) {
  return isOrgSurveyKey(key) ? 'org' : 'volunteer'
}

export function trackFromSurveyKey(key) {
  return String(key ?? '').includes('external') ? 'external' : 'internal'
}

export function surveyRegistryKey(type, track = 'internal') {
  return track === 'external' ? `${type}_external` : type
}

export function builtInAudienceLabel(key) {
  const base = isOrgSurveyKey(key) ? 'Organisation' : 'Volunteer'
  return trackFromSurveyKey(key) === 'external' ? `${base} · External` : base
}

export function trackBadgeLabel(key) {
  return MANDE_TRACK_LABELS[trackFromSurveyKey(key)] ?? MANDE_TRACK_LABELS.internal
}
