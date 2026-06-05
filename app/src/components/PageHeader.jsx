export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-h1 text-afri-purple">{title}</h1>
        {subtitle && <p className="mt-1 font-body text-afri-black/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
