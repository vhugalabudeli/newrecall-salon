import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LandingHeader } from '../components/LandingHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { registerAccount } from '../lib/auth'
import { paths } from '../lib/routes'
import { writeSalonName } from '../lib/settings'
import '../styles/landing.css'

export function Register() {
  useDocumentTitle('Register — NewRecall Salon')
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [salonName, setSalonName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const result = await registerAccount({
      name,
      email,
      password,
      salonName,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (result.user.salonName) {
      writeSalonName(result.user.salonName)
    }
    navigate(paths.subscribe, { replace: true })
  }

  return (
    <div className="landing-page" data-page="salon">
      <LandingHeader />
      <main>
        <div className="wrap thanks">
          <div className="card">
            <p className="eyebrow">Account</p>
            <h1>Register</h1>
            <p className="lead">
              Create a login for this device, then start a free trial to open
              the book. Data stays on this phone or computer.
            </p>
            <form className="auth-form" onSubmit={onSubmit}>
              <label>
                Name
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
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
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>
              <label>
                Salon name
                <input
                  type="text"
                  name="business"
                  autoComplete="organization"
                  value={salonName}
                  onChange={(event) => setSalonName(event.target.value)}
                  placeholder="Optional"
                />
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Creating account…' : 'Register'}
              </button>
            </form>
            <p className="muted auth-switch">
              Already have an account? <Link to={paths.login}>Log in</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
