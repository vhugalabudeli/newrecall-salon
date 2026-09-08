import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { logoutTo } from '../lib/auth'
import { paths } from '../lib/routes'
import { LandingBrand } from './LandingBrand'

export function LandingHeader() {
  const { user, ready } = useAuth()
  const location = useLocation()
  const onSubscribe = location.pathname === paths.subscribe

  return (
    <header className="site-header">
      <div className="wrap">
        <LandingBrand />
        <nav className="header-nav" aria-label="Primary">
          {ready && user && onSubscribe ? (
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
                Log in
              </Link>
              <Link className="btn btn-primary" to={paths.register}>
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
