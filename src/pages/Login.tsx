import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LandingHeader } from '../components/LandingHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { loginAccount } from '../lib/auth'
import { loginResetPath, requestPasswordReset } from '../lib/passwordReset'
import { paths } from '../lib/routes'
import '../styles/landing.css'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const resetting = new URLSearchParams(location.search).has('reset')
  useDocumentTitle(resetting ? 'Reset password — NewRecall' : 'Sign in — NewRecall')
  const from =
    (location.state as { from?: string } | null)?.from || paths.dashboard
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)

  async function onSignIn(event: FormEvent) {
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

  async function onResetRequest(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const result = await requestPasswordReset(email)
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setSent(true)
  }

  return (
    <div className="landing-page" data-page="salon">
      <LandingHeader />
      <main>
        <div className="wrap thanks">
          <div className="card">
            <p className="eyebrow">Account</p>
            {resetting ? (
              <>
                <h1>Reset your password</h1>
                <p className="lead">
                  Enter the email you use for NewRecall. If we have an account
                  for it, we’ll send a link to choose a new password.
                </p>
                {sent ? (
                  <p className="muted">
                    If that email has a NewRecall account, we sent a reset
                    link. Check your inbox and spam folder.
                  </p>
                ) : (
                  <form className="auth-form" onSubmit={onResetRequest}>
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
                    {error ? <p className="form-error">{error}</p> : null}
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={saving}
                    >
                      {saving ? 'Sending the reset link…' : 'Email me a reset link'}
                    </button>
                  </form>
                )}
                <p className="muted auth-switch">
                  <Link
                    to={paths.login}
                    onClick={() => {
                      setSent(false)
                      setError('')
                    }}
                  >
                    Back to sign in
                  </Link>
                </p>
              </>
            ) : (
              <>
                <h1>Welcome back</h1>
                <p className="lead">
                  Sign in with your NewRecall email and password. Owners and invited
                  staff work from the same salon workspace.
                </p>
                <form className="auth-form" onSubmit={onSignIn}>
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
                  <p className="muted auth-switch auth-forgot">
                    <Link
                      to={loginResetPath()}
                      onClick={() => {
                        setSent(false)
                        setError('')
                      }}
                    >
                      Forgot password?
                    </Link>
                  </p>
                  {error ? <p className="form-error">{error}</p> : null}
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>
                <p className="muted auth-switch">
                  New to NewRecall? <Link to={paths.register}>Start your free trial</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
