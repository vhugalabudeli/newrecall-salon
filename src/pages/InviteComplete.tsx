import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LandingHeader } from '../components/LandingHeader'
import { ScreenWait } from '../components/ScreenWait'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { completeInvite } from '../lib/inviteCompletion'
import { paths } from '../lib/routes'
import '../styles/landing.css'

export function InviteComplete() {
  useDocumentTitle('Join your salon — NewRecall')
  const navigate = useNavigate()
  const { user, ready } = useAuth()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const result = await completeInvite({ name, password, confirmation })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(paths.dashboard, { replace: true })
  }

  if (!ready) return <ScreenWait label="Opening invitation…" />

  const sessionError = !user
    ? 'This invitation link is invalid or expired. Ask the salon owner to send a new invite.'
    : user.role !== 'staff'
      ? 'This page is only for invited staff accounts.'
      : null

  return (
    <div className="landing-page" data-page="salon">
      <LandingHeader />
      <main>
        <div className="wrap thanks">
          <div className="card">
            <p className="eyebrow">Staff invitation</p>
            <h1>Finish setting up your account</h1>
            <p className="lead">
              {user?.role === 'staff'
                ? `Create your own sign-in for ${user.salonName}. You’ll share the salon workspace with your team.`
                : 'Open the latest invitation email from your salon owner to continue.'}
            </p>
            {sessionError ? (
              <p className="form-error">{sessionError}</p>
            ) : (
              <form className="auth-form" onSubmit={onSubmit}>
                <label>
                  Name
                  <input
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Password
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
                  {saving ? 'Setting up your account…' : 'Finish setup'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
