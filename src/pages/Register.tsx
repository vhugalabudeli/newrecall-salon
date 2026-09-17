import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LandingHeader } from '../components/LandingHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { registerAccount } from '../lib/auth'
import { sanitizePromoCode, validatePromoCodeFormat } from '../lib/promoCode'
import { paths } from '../lib/routes'
import { lookupPromoCode } from '../lib/rewardsApi'
import '../styles/landing.css'

export function Register() {
  useDocumentTitle('Start your free trial — NewRecall')
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [salonName, setSalonName] = useState('')
  const [promo, setPromo] = useState('')
  const [lookup, setLookup] = useState<{
    code: string
    valid: boolean
    reason: string
  } | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const cleanedPromo = sanitizePromoCode(promo)
  const promoFormatError = cleanedPromo ? validatePromoCodeFormat(cleanedPromo) : null

  useEffect(() => {
    if (!cleanedPromo || promoFormatError) return
    const timer = window.setTimeout(() => {
      void lookupPromoCode(cleanedPromo)
        .then((result) => {
          setLookup({
            code: cleanedPromo,
            valid: result.valid,
            reason: result.valid
              ? 'Code applied.'
              : result.reason || 'That code is not recognised.',
          })
        })
        .catch((err: unknown) => {
          setLookup({
            code: cleanedPromo,
            valid: false,
            reason:
              err instanceof Error ? err.message : 'That code could not be checked.',
          })
        })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [cleanedPromo, promoFormatError])

  const promoState:
    | 'empty'
    | 'checking'
    | 'valid'
    | 'invalid' = !cleanedPromo
    ? 'empty'
    : promoFormatError
      ? 'invalid'
      : lookup?.code === cleanedPromo
        ? lookup.valid
          ? 'valid'
          : 'invalid'
        : 'checking'
  const promoReason =
    promoFormatError ||
    (lookup?.code === cleanedPromo ? lookup.reason : '')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const cleanedPromo = sanitizePromoCode(promo)
    if (cleanedPromo && promoState !== 'valid') {
      setError(promoReason || 'Enter a recognised promo code, or leave it blank.')
      return
    }
    setSaving(true)
    setError('')
    const result = await registerAccount({
      name,
      email,
      password,
      salonName,
      promoCode: cleanedPromo,
    })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
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
            <h1>Create your salon account</h1>
            <p className="lead">
              Set up your salon, then start your 30-day free trial. You can invite
              staff to work from the same client list once you’re inside.
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
                  required
                />
              </label>
              <label>
                Promo code (optional)
                <input
                  type="text"
                  name="promo"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  value={promo}
                  onChange={(event) => setPromo(sanitizePromoCode(event.target.value))}
                  maxLength={12}
                />
              </label>
                {promoState === 'checking' ? (
                <p className="form-note">Checking that code…</p>
              ) : promoReason ? (
                <p className={promoState === 'valid' ? 'form-note' : 'form-error'}>
                  {promoReason}
                </p>
              ) : null}
              {error ? <p className="form-error">{error}</p> : null}
              <button
                className="btn btn-primary"
                type="submit"
                disabled={saving || promoState === 'checking'}
              >
                {saving ? 'Creating your account…' : 'Continue to free trial'}
              </button>
            </form>
            <p className="muted auth-switch">
              Already have an account? <Link to={paths.login}>Sign in</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
