import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSalonName } from '../hooks/useSalonName'
import { useVisibleViewportHeight } from '../hooks/useVisibleViewportHeight'
import { paths } from '../lib/routes'
import { shopMarkLabel } from '../lib/settings'
import { LiveAlertHost } from './LiveAlertHost'
import { RecallAlertHost } from './RecallAlertHost'
import { RecallBell } from './RecallBell'
import { SwUpdateHost } from './SwUpdateHost'
import { WelcomeDialog } from './WelcomeDialog'

const links = [
  { to: paths.dashboard, label: 'Dashboard', end: true, icon: DashboardMark },
  { to: paths.clients, label: 'Clients', end: true, icon: ClientsMark },
  { to: paths.calendar, label: 'Calendar', end: false, icon: CalendarMark },
  { to: paths.settings, label: 'Settings', end: false, icon: SettingsMark },
]

export function AppShell() {
  useDocumentTitle('NewRecall — Client follow-ups for salons')
  const height = useVisibleViewportHeight()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (location.hash) return
    mainRef.current?.scrollTo(0, 0)
  }, [location.hash, location.pathname])

  return (
    <div
      className="flex overflow-hidden bg-cream text-cocoa"
      style={{ height }}
    >
      <aside className="hidden h-full w-60 shrink-0 flex-col border-r border-line bg-ivory px-5 py-6 md:flex">
        <Brand />
        <SidebarNav className="mt-10 flex flex-col gap-1" />
      </aside>

      <div className="group/shell relative flex min-h-0 min-w-0 flex-1 flex-col">
        <LiveAlertHost />
        <SwUpdateHost />
        <RecallAlertHost />
        <WelcomeDialog />
        <AppHeader />
        <main
          ref={mainRef}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto"
        >
          <Outlet />
        </main>

        <BottomTabs />
      </div>
    </div>
  )
}

function Brand() {
  const { salonName } = useSalonName()

  return (
    <div className="flex min-w-0 w-full items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blush text-ivory">
        <ScissorsMark />
      </span>
      <p className="font-display min-w-0 truncate text-lg leading-tight font-semibold">
        {shopMarkLabel(salonName)}
      </p>
    </div>
  )
}

function AppHeader() {
  return (
    <header className="shrink-0 border-b border-line bg-ivory">
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.65rem,env(safe-area-inset-top))] pb-2.5 md:justify-end md:px-8">
        <div className="min-w-0 md:hidden">
          <ShopMark />
        </div>
        <RecallBell />
      </div>
    </header>
  )
}

function ShopMark() {
  const { salonName } = useSalonName()

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blush text-ivory">
        <ScissorsMark />
      </span>
      <p className="font-display truncate text-sm font-semibold leading-tight">
        {shopMarkLabel(salonName)}
      </p>
    </div>
  )
}

function SidebarNav({ className }: { className: string }) {
  return (
    <nav className={className}>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'bg-rose-mist text-cocoa'
                : 'text-cocoa-soft hover:bg-cream hover:text-cocoa'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}

function BottomTabs() {
  return (
    <nav
      className="grid shrink-0 grid-cols-4 border-t border-line bg-ivory pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      {links.map((link) => {
        const Icon = link.icon
        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs font-medium ${
                isActive ? 'text-blush-dark' : 'text-cocoa'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full ${
                    isActive ? 'bg-rose-mist' : ''
                  }`}
                >
                  <Icon />
                </span>
                <span className="leading-none">{link.label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

function ScissorsMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="6.5" cy="17.5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="17.5" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.4 16.1 19 5.5M15.6 16.1 5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function DashboardMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M4.5 11.5 12 5l7.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19v-7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ClientsMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19c1.2-3 3.5-4.5 6.5-4.5s5.3 1.5 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SettingsMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CalendarMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect
        x="4.5"
        y="5.5"
        width="15"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M4.5 10h15M8.5 3.5v4M15.5 3.5v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
