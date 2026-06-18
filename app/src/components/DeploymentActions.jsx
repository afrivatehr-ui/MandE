import { useEffect, useRef, useState } from 'react'

/**
 * Compact action bar for deployment table rows.
 * Email options are grouped in a single dropdown (no abbreviations).
 */
export default function DeploymentActions({
  row,
  canWrite,
  onView,
  onCopyLinks,
  onSendEmail,
  onEdit,
  onComplete,
  onRemove,
  emailBusy,
}) {
  const [emailOpen, setEmailOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!emailOpen) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setEmailOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [emailOpen])

  const emailOptions = []
  if (row.hasVolunteer && row.needsVolunteerSurvey) {
    emailOptions.push({ id: 'volunteer', label: 'Email volunteer' })
  }
  if (row.hasOrganisation && row.needsOrganisationSurvey) {
    emailOptions.push({ id: 'org', label: 'Email organisation' })
  }
  if (emailOptions.length === 2) {
    emailOptions.push({ id: 'both', label: 'Email both parties' })
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      <ActionBtn label="View volunteer profile" onClick={onView}>
        View
      </ActionBtn>

      {canWrite && (
        <ActionBtn label="Copy survey links" onClick={onCopyLinks}>
          Links
        </ActionBtn>
      )}

      {canWrite && emailOptions.length > 0 && (
        <div className="relative" ref={menuRef}>
          <ActionBtn
            label="Send survey email"
            onClick={() => setEmailOpen((o) => !o)}
            busy={emailBusy}
            hasMenu
          >
            Send email
          </ActionBtn>
          {emailOpen && (
            <div className="absolute right-0 z-20 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-afri-lavender bg-afri-white shadow-card">
              {emailOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={emailBusy}
                  onClick={() => {
                    setEmailOpen(false)
                    const types =
                      opt.id === 'both'
                        ? ['volunteer', 'org']
                        : [opt.id]
                    onSendEmail(types)
                  }}
                  className="block w-full px-3 py-2.5 text-left font-body text-sm text-afri-black transition-colors hover:bg-afri-lavender/60 disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {canWrite && onEdit && (
        <ActionBtn label="Edit hours and M&E track" onClick={onEdit}>
          Edit
        </ActionBtn>
      )}

      {canWrite && row.status !== 'COMPLETED' && (
        <ActionBtn label="Mark deployment complete" onClick={onComplete}>
          Complete
        </ActionBtn>
      )}

      {canWrite && (
        <ActionBtn label="Remove deployment" onClick={onRemove} danger>
          Remove
        </ActionBtn>
      )}
    </div>
  )
}

function ActionBtn({ children, onClick, label, busy, danger, hasMenu }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      disabled={busy}
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-body text-xs font-medium transition-colors disabled:opacity-50 ${
        danger
          ? 'text-afri-red hover:bg-afri-red/10'
          : 'text-afri-purple hover:bg-afri-lavender'
      }`}
    >
      {children}
      {hasMenu && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      )}
    </button>
  )
}
