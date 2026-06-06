export default function EmptyState({ icon, title, description, cta }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-afri-purple/25 bg-afri-lavender/40 px-6 py-12 text-center dark:border-afri-lavender/30 dark:bg-afri-purple-surface/60">
      {icon && <div className="text-afri-purple/50 dark:text-afri-lavender/50">{icon}</div>}
      <h3 className="font-heading text-h3">{title}</h3>
      {description && <p className="afri-muted max-w-sm font-body text-sm">{description}</p>}
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  )
}
