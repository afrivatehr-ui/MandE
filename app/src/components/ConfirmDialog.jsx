/**
 * Controlled confirmation modal. Render conditionally on `open`.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
  onCancel,
  busy = false,
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-afri-black/40 p-4" onClick={onCancel}>
      <div
        className="afri-card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="font-heading text-h3 text-afri-purple">{title}</h3>
        {message && <p className="afri-muted mt-2 font-body text-sm">{message}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="afri-btn-secondary" disabled={busy}>
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={
              tone === 'danger'
                ? 'afri-btn bg-afri-red text-afri-white hover:bg-afri-red/90'
                : 'afri-btn-primary'
            }
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
