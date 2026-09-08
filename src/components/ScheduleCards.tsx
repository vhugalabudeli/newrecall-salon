import { Link } from 'react-router-dom'
import { paths } from '../lib/routes'

export function ScheduleCards() {
  return (
    <section>
      <Link
        to={paths.calendar}
        className="block rounded-2xl bg-blush p-4 text-ivory shadow-sm transition hover:bg-blush-dark"
      >
        <p className="font-display text-2xl font-semibold">Go to calendar</p>
      </Link>
    </section>
  )
}
