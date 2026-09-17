import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { LandingHeader } from '../components/LandingHeader'
import { ScreenWait } from '../components/ScreenWait'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { formatZarFromCents } from '../lib/adminClassify'
import { loginAccount, logoutTo } from '../lib/auth'
import { loginResetPath, validateNewPassword } from '../lib/passwordReset'
import { sanitizePromoCode, validatePromoCodeFormat } from '../lib/promoCode'
import { paths } from '../lib/routes'
import {
  checkPromoAvailable,
  claimPromoCode,
  fetchRewardHub,
  type RewardHub,
} from '../lib/rewardsApi'
import { supabase } from '../lib/supabase'
import '../styles/landing.css'

export function Rewards() {
  const { user, referrer, ready } = useAuth()
  useDocumentTitle(
    referrer ? `${referrer.kind === 'influencer' ? 'Influencer' : 'Brand Champion'} rewards — NewRecall` : 'Rewards sign in — NewRecall',
  )

  if (!ready) return <ScreenWait label="Loading…" />
  if (user) return <Navigate to={paths.dashboard} replace />
  if (!referrer) return <RewardsSignIn />
  return <RewardsHub />
}

function RewardsSignIn() {
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
  }

  return (
    <div className="landing-page" data-page="rewards">
      <LandingHeader />
      <main>
        <div className="wrap thanks">
          <div className="card">
            <p className="eyebrow">Rewards</p>
            <h1>Sign in to your rewards</h1>
            <p className="lead">
              Brand Champions and Influencers use this page to copy their code and
              see earnings. Salon owners sign in on the salon page.
            </p>
            <form className="auth-form" onSubmit={(event) => void onSubmit(event)}>
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
                <Link to={loginResetPath()}>Forgot password?</Link>
              </p>
              {error ? <p className="form-error">{error}</p> : null}
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <p className="muted auth-switch">
              Referring salons in person?{' '}
              <Link to={paths.champion}>Become a Brand Champion</Link>
            </p>
            <p className="muted auth-switch">
              Running a salon? <Link to={paths.login}>Salon sign in</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

function RewardsHub() {
  const { referrer } = useAuth()
  const [hub, setHub] = useState<RewardHub | null>(null)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [availability, setAvailability] = useState<{ code: string; hint: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const cleanedCode = sanitizePromoCode(code)
  const codeFormatError = cleanedCode ? validatePromoCodeFormat(cleanedCode) : null

  useEffect(() => {
    let cancelled = false
    void fetchRewardHub()
      .then((next) => {
        if (!cancelled) setHub(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Rewards could not be loaded.')
        }
      })
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      const user = data.user
      setNeedsPassword(
        Boolean(user?.invited_at) && user?.user_metadata?.password_set !== true,
      )
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!cleanedCode || codeFormatError) return
    const timer = window.setTimeout(() => {
      void checkPromoAvailable(cleanedCode)
        .then((result) => {
          const hint = result.own
            ? 'This is already your code.'
            : result.available
              ? 'This code is available.'
              : result.reason || 'That code is already taken.'
          setAvailability({ code: cleanedCode, hint })
        })
        .catch((err: unknown) => {
          setAvailability({
            code: cleanedCode,
            hint: err instanceof Error ? err.message : 'That code could not be checked.',
          })
        })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [cleanedCode, codeFormatError])

  const codeHint = !cleanedCode
    ? ''
    : codeFormatError ||
      (availability?.code === cleanedCode ? availability.hint : '')

  async function loadHub() {
    setHub(await fetchRewardHub())
  }

  async function onClaim(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await claimPromoCode(sanitizePromoCode(code))
      await loadHub()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The code could not be claimed.')
    } finally {
      setSaving(false)
    }
  }

  async function onCopy() {
    if (!hub?.code) return
    try {
      await navigator.clipboard.writeText(hub.code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('The code could not be copied. Select it and copy it yourself.')
    }
  }

  async function onSetPassword(event: FormEvent) {
    event.preventDefault()
    const invalid = validateNewPassword(password, confirmation)
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(true)
    setError('')
    const { data } = await supabase.auth.getUser()
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { ...data.user?.user_metadata, password_set: true },
    })
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setNeedsPassword(false)
    setPasswordSaved(true)
  }

  const kind = hub?.kind || referrer?.kind || 'champion'
  const label = hub?.label || (kind === 'influencer' ? 'Influencer' : 'Brand Champion')

  return (
    <div className="landing-page" data-page="rewards" data-kind={kind}>
      <LandingHeader />
      <main>
        <div className="wrap thanks">
          <div className="card rewards-card">
            <p className="eyebrow">{label}</p>
            <h1>Your rewards</h1>
            <p className="lead">
              Share your code when a salon signs up.
            </p>
            {hub?.bountyCents ? (
              <p className="muted">
                You earn {formatZarFromCents(hub.bountyCents)} for each salon that
                registers with your code.
              </p>
            ) : (
              <p className="muted">
                Your bounty is set by NewRecall. It will show here once a rate is published.
              </p>
            )}

            {needsPassword ? (
              <form className="auth-form" onSubmit={(event) => void onSetPassword(event)}>
                <p className="form-note">
                  Choose a password so you can sign in next time.
                </p>
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
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving your password…' : 'Save password'}
                </button>
              </form>
            ) : null}
            {passwordSaved ? (
              <p className="muted">Your password is saved. Use it the next time you sign in.</p>
            ) : null}

            {hub?.code ? (
              <div className="rewards-code-block">
                <p className="rewards-code" aria-label="Your promo code">
                  {hub.code}
                </p>
                <button className="btn btn-primary rewards-copy" type="button" onClick={() => void onCopy()}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            ) : (
              <form className="auth-form" onSubmit={(event) => void onClaim(event)}>
                <label>
                  Choose your code
                  <input
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    value={code}
                    onChange={(event) => setCode(sanitizePromoCode(event.target.value))}
                    maxLength={12}
                    required
                  />
                </label>
                {codeHint ? <p className="form-note">{codeHint}</p> : null}
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Saving your code…' : 'Save my code'}
                </button>
              </form>
            )}

            {error ? <p className="form-error">{error}</p> : null}

            {hub ? (
              <>
                <dl className="rewards-ledger">
                  <div>
                    <dt>Pending</dt>
                    <dd>{formatZarFromCents(hub.pendingCents)}</dd>
                  </div>
                  <div>
                    <dt>Paid</dt>
                    <dd>{formatZarFromCents(hub.paidCents)}</dd>
                  </div>
                  <div>
                    <dt>Signups</dt>
                    <dd>{hub.signupCount}</dd>
                  </div>
                </dl>
                <h2 className="rewards-subhead">Credits</h2>
                {hub.credits.length === 0 ? (
                  <p className="muted">No salon signups yet.</p>
                ) : (
                  <ul className="rewards-list">
                    {hub.credits.map((row) => (
                      <li key={row.id}>
                        {formatZarFromCents(row.amountCents)} ·{' '}
                        {new Date(row.createdAt).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                )}
                <h2 className="rewards-subhead">Payouts</h2>
                {hub.payouts.length === 0 ? (
                  <p className="muted">No payouts recorded yet.</p>
                ) : (
                  <ul className="rewards-list">
                    {hub.payouts.map((row) => (
                      <li key={row.id}>
                        {formatZarFromCents(row.amountCents)} ·{' '}
                        {new Date(row.paidAt).toLocaleDateString()}
                        {row.note ? ` · ${row.note}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="muted">Loading your wallet…</p>
            )}

            <p className="muted auth-switch">
              <button
                className="text-link"
                type="button"
                onClick={() => logoutTo(paths.rewards)}
              >
                Log out
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
