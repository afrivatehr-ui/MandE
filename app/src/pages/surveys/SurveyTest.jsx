import { useQuery } from '@tanstack/react-query'
import PageHeader from '../../components/PageHeader'
import Spinner from '../../components/Spinner'
import { supabase } from '../../lib/supabase'

export default function SurveyTest() {
    const { data: tokens = [], isLoading } = useQuery({

        queryKey: ['surveyTokens'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('survey_tokens')
                .select('id, token, deployment_id, type, used, expires_at, deployments:deployment_id(volunteer_id, organisation_id, volunteers:volunteer_id(volunteer_id, full_name), organisations:organisation_id(name))')
                .order('expires_at', { ascending: false })
            if (error) throw error
            return data || []
        },
    })

    return (
        <div>
            <PageHeader
                title="Survey Testing"
                subtitle="Test survey links for deployments"
            />

            {isLoading ? (
                <Spinner className="py-20" />
            ) : (
                <div className="afri-card p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-afri-lavender text-xs uppercase tracking-wide text-afri-purple">
                                    <th className="py-3 px-4">Volunteer</th>
                                    <th className="py-3 px-4">Organisation</th>
                                    <th className="py-3 px-4">Survey Type</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">Test Link</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tokens.map((token) => {
                                    const volunteerName = token.deployments?.volunteers?.full_name || 'Unknown'
                                    const orgName = token.deployments?.organisations?.name || 'Unknown'
                                    const surveyLink = `${window.location.origin}/survey/${token.type}/${token.token}`

                                    return (
                                        <tr key={`${token.deployment_id}-${token.type}`} className="border-b border-afri-lavender/60 hover:bg-afri-lavender/20">
                                            <td className="py-3 px-4 text-sm">{volunteerName}</td>
                                            <td className="py-3 px-4 text-sm">{orgName}</td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${token.type === 'volunteer'
                                                    ? 'bg-afri-blue/20 text-afri-blue'
                                                    : 'bg-afri-green/20 text-afri-green'
                                                    }`}>
                                                    {token.type === 'volunteer' ? 'Volunteer Self-Report' : 'Organisation Feedback'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`text-xs font-semibold ${token.used ? 'text-afri-black/50' : 'text-afri-green'}`}>
                                                    {token.used ? '✓ Submitted' : '○ Pending'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex gap-2">
                                                    <a
                                                        href={surveyLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="afri-btn-primary !px-3 !py-1 text-xs"
                                                    >
                                                        Open
                                                    </a>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(surveyLink)
                                                            alert('Link copied to clipboard!')
                                                        }}
                                                        className="afri-btn-ghost !px-3 !py-1 text-xs"
                                                    >
                                                        Copy
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {tokens.length === 0 && (
                        <div className="text-center py-8 text-afri-black/60">
                            <p>No survey tokens found. Create a deployment first.</p>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-6 afri-card p-6 bg-afri-blue/5 border-l-4 border-afri-blue">
                <h3 className="font-heading text-lg text-afri-purple mb-3">How to test surveys:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-afri-black/70">
                    <li>Click "Open" to test a survey in a new tab</li>
                    <li>The survey link is unique per deployment (volunteer or organisation)</li>
                    <li>Fill out the survey completely to see VPI calculations</li>
                    <li>Once submitted, the token status changes to "✓ Submitted"</li>
                    <li>View results in the <strong>Reports</strong> page or <strong>Deployments</strong> detail</li>
                </ol>
            </div>
        </div>
    )
}
