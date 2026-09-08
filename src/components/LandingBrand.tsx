import { Link } from 'react-router-dom'
import { paths } from '../lib/routes'

export function ScissorsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

export function LandingBrand() {
  return (
    <Link className="brand" to={paths.landing}>
      <span className="brand-mark" aria-hidden="true">
        <ScissorsIcon />
      </span>
      <span className="brand-copy">
        <strong>NewRecall</strong>
        <span>Salon CRM</span>
      </span>
    </Link>
  )
}
