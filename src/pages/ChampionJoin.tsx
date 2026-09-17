import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LandingHeader } from '../components/LandingHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { registerChampion } from '../lib/auth'
import { paths } from '../lib/routes'
import { gateChampionJoin } from '../lib/rewardsApi'
import '../styles/landing.css'

export function ChampionJoin() {
  useDocumentTitle('Become a Brand Champion — NewRecall')
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await gateChampionJoin()
    } catch (err) {
      setSaving(false)
      setError(err instanceof Error ? err.message : 'You could not join right now. Try again shortly.')
      return
    }
    const result = await registerChampion(name, email, password)
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(paths.rewards, { replace: true })
  }

  return (
    <div className="landing-page" data-page="rewards" data-kind="champion">
      <LandingHeader />
      <main>
        <div className="wrap thanks">
          <div className="card">
            <p className="eyebrow">Brand Champion</p>
            <h1>Become a Brand Champion</h1>
            <p className="lead">
              Help salons find NewRecall and get paid when they register with your
              referral code.
            </p>
            <form className="auth-form" onSubmit={(event) => void onSubmit(event)}>
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
              {error ? <p className="form-error">{error}</p> : null}
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Creating your account…' : 'Join as a Brand Champion'}
              </button>
            </form>
            <p className="muted auth-switch">
              Already referring salons? <Link to={paths.rewards}>Sign in to Rewards</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
