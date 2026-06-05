export default function EmptyState({ icon, title, description, cta }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-afri-purple/25 bg-afri-lavender/40 px-6 py-12 text-center">
      {icon && <div className="text-afri-purple/50">{icon}</div>}
      <h3 className="font-heading text-h3 text-afri-purple">{title}</h3>
      {description && <p className="max-w-sm font-body text-sm text-afri-black/60">{description}</p>}
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  )
}
