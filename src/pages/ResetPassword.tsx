import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LandingHeader } from '../components/LandingHeader'
import { ScreenWait } from '../components/ScreenWait'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import {
  completePasswordReset,
  loginResetPath,
  passwordResetLinkError,
} from '../lib/passwordReset'
import { paths } from '../lib/routes'
import {
  isPasswordRecoveryPending,
  supabase,
} from '../lib/supabase'
import '../styles/landing.css'

export function ResetPassword() {
  const navigate = useNavigate()
  const linkError = passwordResetLinkError()
  const [ready, setReady] = useState(
    () => Boolean(linkError || isPasswordRecoveryPending()),
  )
  const [recovery, setRecovery] = useState(() => isPasswordRecoveryPending())
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState(() => linkError ?? '')
  const [saving, setSaving] = useState(false)
  useDocumentTitle(
    !ready
      ? 'Choose a new password — NewRecall'
      : recovery
        ? 'Choose a new password — NewRecall'
        : 'Reset link expired — NewRecall',
  )

  useEffect(() => {
    if (linkError || isPasswordRecoveryPending()) return

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecovery(true)
        setReady(true)
      }
    })
    const hasCode = new URLSearchParams(window.location.search).has('code')
    const timer = window.setTimeout(
      () => setReady(true),
      hasCode ? 2500 : 400,
    )
    return () => {
      data.subscription.unsubscribe()
      window.clearTimeout(timer)
    }
  }, [linkError])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const result = await completePasswordReset({ password, confirmation })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(paths.dashboard, { replace: true })
  }

  if (!ready) return <ScreenWait label="Opening reset link…" />

  const sessionError = recovery
    ? null
    : error ||
      'This reset link is invalid or expired. Request a new one from sign in.'

  return (
    <div className="landing-page" data-page="salon">
      <LandingHeader />
      <main>
        <div className="wrap thanks">
          <div className="card">
            <p className="eyebrow">Account</p>
            <h1>{recovery ? 'Choose a new password' : 'This reset link is no longer valid'}</h1>
            <p className="lead">
              {recovery
                ? 'Pick a password for your NewRecall account. You’ll use it the next time you sign in.'
                : 'Open the latest reset email, or request a new link from sign in.'}
            </p>
            {sessionError ? (
              <>
                <p className="form-error">{sessionError}</p>
                <p className="muted auth-switch">
                  <Link to={loginResetPath()}>Request a new link</Link>
                </p>
              </>
            ) : (
              <form className="auth-form" onSubmit={onSubmit}>
                <label>
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </label>
                <label>
                  Confirm password
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    minLength={8}
                    required
                  />
                </label>
                {error ? <p className="form-error">{error}</p> : null}
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving your password…' : 'Save password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
