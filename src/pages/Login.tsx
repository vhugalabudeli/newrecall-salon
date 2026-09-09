import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LandingHeader } from '../components/LandingHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { loginAccount } from '../lib/auth'
import { paths } from '../lib/routes'
import '../styles/landing.css'

export function Login() {
  useDocumentTitle('Sign in — NewRecall')
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from || paths.dashboard
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const result = await loginAccount({ email, password })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    const next = from.startsWith(paths.dashboard) ? from : paths.dashboard
    navigate(next, { replace: true })
  }

  return (
    <div className="landing-page" data-page="salon">
      <LandingHeader />
      <main>
        <div className="wrap thanks">
          <div className="card">
            <p className="eyebrow">Account</p>
            <h1>Welcome back</h1>
            <p className="lead">
              Sign in with your NewRecall email and password. Owners and invited
              staff work from the same salon workspace.
            </p>
            <form className="auth-form" onSubmit={onSubmit}>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <p className="muted auth-switch">
              New to NewRecall? <Link to={paths.register}>Start your free trial</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
