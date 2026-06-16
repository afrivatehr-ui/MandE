import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore, isAdmin, isWriter, ROLE_LABELS } from '../../store/authStore'
import { useIdleLogout } from '../../hooks/useIdleLogout'
import Logo from '../Logo'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: GridIcon },
  { to: '/volunteers', label: 'Volunteers', icon: UsersIcon },
  { to: '/organisations', label: 'Organisations', icon: BuildingIcon },
  { to: '/deployments', label: 'Deployments', icon: SendIcon },
  { to: '/reports', label: 'Reports', icon: ChartIcon },
  { to: '/surveys', label: 'Surveys', icon: ClipboardIcon, writerOnly: true },
]

export default function AppLayout() {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useIdleLogout()

  const role = profile?.role
  const nav = [
    ...NAV.filter((item) => !item.writerOnly || isWriter(role)),
    ...(isAdmin(role) ? [{ to: '/settings', label: 'Settings', icon: CogIcon }] : []),
  ]

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const initials = (profile?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen bg-afri-lavender/40 lg:flex">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-afri-purple px-4 py-3 lg:hidden">
        <Logo variant="white" className="h-8" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-2 text-afri-white hover:bg-afri-white/10"
          aria-label="Toggle navigation"
        >
          <MenuIcon />
        </button>
      </header>

      {/* Mobile nav overlay */}
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-afri-black/50 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-afri-purple transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:block lg:h-screen lg:w-64 lg:shrink-0 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="hidden px-6 py-7 lg:block">
            <Logo variant="white" className="w-[160px]" />
          </div>

          <div className="flex items-center justify-between px-4 py-4 lg:hidden">
            <Logo variant="white" className="h-8" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 text-afri-white hover:bg-afri-white/10"
              aria-label="Close navigation"
            >
              <CloseIcon />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3 lg:py-0">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm transition-colors ${
                    isActive
                      ? 'bg-afri-white font-medium text-afri-purple'
                      : 'text-afri-white/85 hover:bg-afri-white/10'
                  }`
                }
              >
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-afri-white/15 p-3">
            <div className="flex items-center gap-3 px-2 py-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-afri-white/15 font-heading text-sm font-semibold text-afri-white">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm text-afri-white">{profile?.name}</p>
                <p className="truncate font-body text-xs text-afri-white/60">{ROLE_LABELS[role] ?? role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm text-afri-white/85 transition-colors hover:bg-afri-white/10"
            >
              <LogoutIcon />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}
function GridIcon() {
  return (
    <svg {...iconProps}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
  )
}
function UsersIcon() {
  return (
    <svg {...iconProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  )
}
function BuildingIcon() {
  return (
    <svg {...iconProps}><rect x="4" y="2" width="16" height="20" rx="1" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" /></svg>
  )
}
function SendIcon() {
  return (
    <svg {...iconProps}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
  )
}
function ChartIcon() {
  return (
    <svg {...iconProps}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
  )
}
function CogIcon() {
  return (
    <svg {...iconProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
  )
}
function ClipboardIcon() {
  return (
    <svg {...iconProps}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M9 14h6M9 10h6" /></svg>
  )
}
function LogoutIcon() {
  return (
    <svg {...iconProps}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
  )
}
function MenuIcon() {
  return (
    <svg {...iconProps} width="22" height="22"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
  )
}
function CloseIcon() {
  return (
    <svg {...iconProps} width="22" height="22"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
  )
}
