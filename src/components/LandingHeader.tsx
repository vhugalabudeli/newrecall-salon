import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { logoutTo } from '../lib/auth'
import { paths } from '../lib/routes'
import { LandingBrand } from './LandingBrand'

export function LandingHeader() {
  const { user, referrer, ready } = useAuth()
  const location = useLocation()
  const onSubscribe = location.pathname === paths.subscribe
  const onRewards = location.pathname === paths.rewards

  return (
    <header className="site-header">
      <div className="wrap">
        <LandingBrand />
        <nav className="header-nav" aria-label="Primary">
          {ready && referrer ? (
            onRewards ? (
              <button
                className="nav-text"
                type="button"
                onClick={() => logoutTo(paths.rewards)}
              >
                Log out
              </button>
            ) : (
              <Link className="btn btn-primary" to={paths.rewards}>
                <span className="btn-full">Open rewards</span>
                <span className="btn-short">Rewards</span>
              </Link>
            )
          ) : ready && user && onSubscribe ? (
            <button
              className="nav-text"
              type="button"
              onClick={() => logoutTo(paths.landing)}
            >
              Log out
            </button>
          ) : ready && user ? (
            <Link className="btn btn-primary" to={paths.dashboard}>
              <span className="btn-full">Open the app</span>
              <span className="btn-short">Open app</span>
            </Link>
          ) : (
            <>
              <Link className="nav-text" to={paths.login}>
                Sign in
              </Link>
              <Link className="btn btn-primary" to={paths.register}>
                <span className="btn-full">Start free trial</span>
                <span className="btn-short">Try free</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
