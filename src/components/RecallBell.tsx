import { Link } from 'react-router-dom'
import { useClients } from '../hooks/useClients'
import { dueToday, overdueClients } from '../lib/schedule'
import { paths } from '../lib/routes'

export function RecallBell() {
  const { clients, ready } = useClients()
  const today = new Date()
  const count = ready
    ? overdueClients(clients, today).length + dueToday(clients, today).length
    : 0
  const label = count > 99 ? '99+' : String(count)

  return (
    <Link
      to={paths.dashboard}
      aria-label={
        count === 0
          ? 'No overdue or due today'
          : `${count} overdue or due today`
      }
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-cocoa hover:bg-cream"
    >
      <BellMark />
      {count > 0 ? (
        <span className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blush px-1 text-[10px] font-semibold leading-none text-ivory">
          {label}
        </span>
      ) : null}
    </Link>
  )
}

function BellMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.2 9.2a5.8 5.8 0 0 1 11.6 0c0 4.6 1.7 6.6 2.2 7.2H4c.5-.6 2.2-2.6 2.2-7.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M10 19.2a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
