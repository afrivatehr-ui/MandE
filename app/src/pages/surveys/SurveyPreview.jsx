import { useState } from 'react'
import SurveyFlow from '../../components/survey/SurveyFlow'
import { getSurveyConfig } from '../../api/data'
import { isOrgSurveyKey } from '../../utils/surveyKeys'

// Sample deployment context so built-in previews look like a real survey
// without touching the database or needing a token.
const PREVIEW_CONTEXT = {
  volunteer: { full_name: 'Sample Volunteer', volunteer_id: 'AV-2026-000' },
  organisation: { name: 'Sample Organisation' },
  deployment: {
    role_title: 'Sample volunteer role',
    org_contact_role: 'Sample contact role',
    start_date: '2026-01-06',
    end_date: '2026-03-27',
  },
}

/**
 * Full-screen, no-save preview of a survey so staff can experience exactly what
 * a respondent sees. Nothing is submitted to the API. Works for built-in and
 * custom surveys.
 */
export default function SurveyPreview({ survey, onClose }) {
  const [done, setDone] = useState(false)
  const [key, setKey] = useState(0)

  const isCustom = !survey.is_builtin
  const baseConfig = getSurveyConfig(survey)
  const config = isCustom ? { ...baseConfig, type: 'custom' } : baseConfig
  const context = isCustom
    ? { custom: true, survey: { title: survey.title, description: survey.description } }
    : PREVIEW_CONTEXT

  async function handleSubmit() {
    setDone(true)
    window.scrollTo({ top: 0 })
  }
  function restart() {
    setDone(false)
    setKey((k) => k + 1)
    window.scrollTo({ top: 0 })
  }

  const heading = survey.is_builtin
    ? isOrgSurveyKey(survey.key)
      ? 'Organisation Feedback Survey'
      : 'Volunteer Self-Report Survey'
    : survey.title

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-afri-white">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-afri-black px-4 py-2.5 text-afri-white sm:px-6">
        <span className="flex items-center gap-2 font-body text-xs sm:text-sm">
          <span className="rounded bg-afri-white/15 px-2 py-0.5 font-semibold uppercase tracking-wide">Preview</span>
          <span className="truncate text-afri-white/80">{heading} — responses are not saved</span>
        </span>
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg bg-afri-white/10 px-3 py-1.5 font-body text-xs font-medium text-afri-white transition-colors hover:bg-afri-white/20"
        >
          Close preview ✕
        </button>
      </div>

      {done ? (
        <PreviewDone isCustom={isCustom} onRestart={restart} onClose={onClose} />
      ) : (
        <SurveyFlow key={key} survey={config} context={context} onSubmit={handleSubmit} />
      )}
    </div>
  )
}

function PreviewDone({ isCustom, onRestart, onClose }) {
  return (
    <div className="flex min-h-[calc(100vh-44px)] items-center justify-center bg-afri-lavender/40 px-5 py-10">
      <div className="afri-card max-w-lg p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-afri-green/15 text-afri-green">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="font-heading text-h2 text-afri-purple">End of preview</h1>
        <p className="mt-2 font-body text-afri-black/70">
          This is where a real respondent would see their confirmation. Nothing was saved — this was only a preview.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={onRestart} className="afri-btn-secondary">
            Preview again
          </button>
          <button onClick={onClose} className="afri-btn-primary">
            Back to Surveys
          </button>
        </div>
      </div>
    </div>
  )
}
