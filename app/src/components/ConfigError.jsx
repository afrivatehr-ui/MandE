import Logo from './Logo'

export default function ConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-afri-lavender p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-card bg-afri-white shadow-card">
        <div className="flex flex-col items-center gap-3 bg-afri-purple px-8 py-8">
          <Logo variant="white" className="w-[160px]" />
        </div>
        <div className="flex flex-col gap-4 p-8">
          <h1 className="font-heading text-h2 text-afri-purple">Site not ready yet</h1>
          <p className="afri-muted font-body text-sm">
            This site was published without the connection details it needs to load your data.
            Please contact your Afrivate administrator — they will need to finish the setup and
            publish the site again.
          </p>
        </div>
      </div>
    </div>
  )
}
