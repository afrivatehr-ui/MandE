import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import SurveyFlow from './SurveyFlow'
import Logo from '../Logo'
import { FullPageSpinner } from '../Spinner'
import { getSurveyContext, submitSurvey } from '../../api/surveys'
import { getSurveyConfigForTrack } from '../../config/surveyQuestions'

export default function SurveyPage() {
  const { token } = useParams()
  const [state, setState] = useState({ status: 'loading', context: null, error: null })
  const [submitted, setSubmitted] = useState(null)

  useEffect(() => {
    let active = true
    getSurveyContext(token)
      .then((context) => active && setState({ status: 'ready', context, error: null }))
      .catch((err) => active && setState({ status: 'error', context: null, error: err }))
    return () => {
      active = false
    }
  }, [token])

  if (state.status === 'loading') return <FullPageSpinner label="Loading your survey" />

  if (state.status === 'error') {
    return <SurveyMessage title="This survey link can't be opened" body={state.error?.message} />
  }

  const { context } = state

  if (submitted) {
    return <Confirmation context={context} type={submitted.type} answers={submitted.answers} />
  }

  if (context.alreadySubmitted) {
    return (
      <SurveyMessage
        title="Already submitted"
        body="This survey has already been completed. Thank you — there is nothing more to do."
      />
    )
  }

  if (context.accepting === false) {
    return (
      <SurveyMessage
        title="Survey not open"
        body="This survey isn't currently accepting responses. Please check back later or contact the Afrivate M&E team."
      />
    )
  }

  const survey = getSurveyConfigForTrack(context.type, context.mande_track ?? 'internal')

  async function handleSubmit(answers) {
    const result = await submitSurvey(token, answers)
    setSubmitted({ type: result.type, answers })
  }

  return <SurveyFlow survey={survey} context={context} onSubmit={handleSubmit} />
}

function SurveyShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-afri-lavender/50">
      <header className="bg-afri-purple px-5 py-4 sm:px-8">
        <Logo variant="white" className="h-8" />
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">{children}</main>
    </div>
  )
}

function SurveyMessage({ title, body }) {
  return (
    <SurveyShell>
      <div className="afri-card max-w-md p-7 text-center">
        <h1 className="font-heading text-h2 text-afri-purple">{title}</h1>
        {body && <p className="afri-muted mt-3 font-body">{body}</p>}
        <p className="afri-subtle mt-5 font-body text-sm">
          If you believe this is a mistake, please contact the Afrivate M&amp;E team.
        </p>
      </div>
    </SurveyShell>
  )
}

function Confirmation({ context, type, answers }) {
  const name = type === 'org' ? answers.supervisor_name : context.volunteer.full_name
  const recap =
    type === 'org'
      ? [
          ['Overall effectiveness', `${answers.s5_overall_effectiveness} / 10`],
          ['Would request a volunteer again', answers.s5_request_again],
          ['Would request the same volunteer', answers.s5_request_same_vol],
        ]
      : [
          ['Overall satisfaction', `${answers.s5_overall_satisfaction} / 10`],
          ['Likelihood to recommend Afrivate', `${answers.s5_nps_score} / 10`],
          ['Would volunteer again', answers.s5_volunteer_again],
        ]

  return (
    <SurveyShell>
      <div className="afri-card max-w-lg p-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-afri-green/15 text-afri-green">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="font-heading text-h2 text-afri-purple">Thank you{name ? `, ${name}` : ''}.</h1>
        <p className="afri-muted mt-2 font-body">Your response has been recorded.</p>

        <dl className="mt-6 divide-y divide-afri-lavender rounded-lg bg-afri-lavender/40 px-4 text-left">
          {recap.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-3">
              <dt className="afri-muted font-body text-sm">{label}</dt>
              <dd className="font-heading text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="afri-subtle mt-6 font-body text-sm">
          You can now close this window. Your feedback helps Afrivate support future volunteers.
        </p>
      </div>
    </SurveyShell>
  )
}
