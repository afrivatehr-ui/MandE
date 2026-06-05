export default function SectionHeading({ label, icon, sub, actions, className = '' }) {
  return (
    <div className={`mb-4 flex items-start justify-between gap-4 ${className}`}>
      <div className="flex items-start gap-2.5">
        {icon && <span className="mt-0.5 text-afri-purple">{icon}</span>}
        <div>
          <h2 className="font-heading text-h2 text-afri-purple">{label}</h2>
          {sub && <p className="mt-0.5 font-body text-sm text-afri-black/60">{sub}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
