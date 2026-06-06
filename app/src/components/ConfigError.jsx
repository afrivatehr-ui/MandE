import Logo from './Logo'

/**
 * Shown when VITE_SUPABASE_* were not present at build time (e.g. Netlify env vars
 * missing or site not redeployed after adding them).
 */
export default function ConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-afri-lavender p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-card bg-afri-white shadow-card">
        <div className="flex flex-col items-center gap-3 bg-afri-purple px-8 py-8">
          <Logo variant="white" className="w-[160px]" />
        </div>
        <div className="flex flex-col gap-4 p-8">
          <h1 className="font-heading text-h2 text-afri-purple">Configuration required</h1>
          <p className="afri-muted font-body text-sm">
            This deployment was built without Supabase credentials. The app cannot connect to
            the database until environment variables are set and the site is rebuilt.
          </p>
          <div className="rounded-lg border border-afri-purple/20 bg-afri-lavender/50 px-4 py-3 text-sm dark:border-afri-purple-light/30 dark:bg-afri-purple-surface">
            <p className="mb-2 font-semibold text-afri-purple">Netlify → Site settings → Environment variables</p>
            <ul className="list-inside list-disc space-y-1 font-mono text-xs">
              <li>VITE_SUPABASE_URL</li>
              <li>VITE_SUPABASE_ANON_KEY</li>
            </ul>
          </div>
          <p className="afri-muted text-sm">
            After saving the variables, trigger a new deploy (Deploys → Trigger deploy → Deploy
            site). Vite bakes these values into the bundle at build time — a redeploy is required.
          </p>
        </div>
      </div>
    </div>
  )
}
