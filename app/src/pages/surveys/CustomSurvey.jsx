import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import SurveyFlow from '../../components/survey/SurveyFlow'
import Logo from '../../components/Logo'
import { FullPageSpinner } from '../../components/Spinner'
import { getCustomSurvey, submitCustomSurvey } from '../../api/surveys'

export default function CustomSurvey() {
  const { id } = useParams()
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    getCustomSurvey(id)
      .then((data) => active && setState({ status: 'ready', data, error: null }))
      .catch((err) => active && setState({ status: 'error', data: null, error: err }))
    return () => {
      active = false
    }
  }, [id])

  if (state.status === 'loading') return <FullPageSpinner label="Loading survey" />
  if (state.status === 'error') {
    return <Message title="This survey link can't be opened" body={state.error?.message} />
  }

  const { survey, accepting } = state.data

  if (!accepting) {
    return (
      <Message
        title="Survey not open"
        body="This survey isn't currently accepting responses. Please check back later or contact the Afrivate M&E team."
      />
    )
  }

  if (done) {
    return (
      <Message
        title="Thank you"
        body="Your response has been recorded. You can now close this window."
        success
      />
    )
  }

  const config = { ...survey.definition, type: 'custom' }
  const context = { custom: true, survey: { title: survey.title, description: survey.description } }

  async function handleSubmit(allAnswers) {
    const { __name, __email, ...answers } = allAnswers
    await submitCustomSurvey(id, answers, { name: __name, email: __email })
    setDone(true)
    window.scrollTo({ top: 0 })
  }

  return <SurveyFlow survey={config} context={context} onSubmit={handleSubmit} />
}

function Shell({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-afri-lavender/50">
      <header className="bg-afri-purple px-5 py-4 sm:px-8">
        <Logo variant="white" className="h-8" />
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">{children}</main>
    </div>
  )
}

function Message({ title, body, success }) {
  return (
    <Shell>
      <div className="afri-card max-w-md p-7 text-center">
        {success && (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-afri-green/15 text-afri-green">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
        <h1 className="font-heading text-h2 text-afri-purple">{title}</h1>
        {body && <p className="mt-3 font-body text-afri-black/70">{body}</p>}
        <p className="mt-5 font-body text-sm text-afri-black/50">
          If you believe this is a mistake, please contact the Afrivate M&amp;E team.
        </p>
      </div>
    </Shell>
  )
}
