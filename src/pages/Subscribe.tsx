import { useCallback, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { LandingHeader } from '../components/LandingHeader'
import { ScreenWait } from '../components/ScreenWait'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSubscription } from '../hooks/useSubscription'
import {
  finishTrialCheckout,
  openPaystackPopup,
  startTrialCheckout,
} from '../lib/billing'
import { paths } from '../lib/routes'
import '../styles/landing.css'

export function Subscribe() {
  useDocumentTitle('Start free trial — NewRecall Salon')
  const navigate = useNavigate()
  const { user } = useAuth()
  const { entitled, ready, error: accessError, refresh } = useSubscription()
  const [status, setStatus] = useState<'idle' | 'open' | 'cancelled' | 'error'>(
    'idle',
  )
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const present = useCallback(async () => {
    if (!user || busy) return
    setBusy(true)
    setStatus('open')
    setMessage('')
    try {
      const checkout = await startTrialCheckout({
        email: user.email,
        userId: user.id,
      })
      const result = await openPaystackPopup(checkout.accessCode)
      if (result === 'cancelled') {
        setStatus('cancelled')
        setMessage('Start the free trial to open the book.')
        return
      }
      const billed = await finishTrialCheckout({
        email: user.email,
        userId: user.id,
        reference: result.reference,
      })
      const ok = billed.entitled || (await refresh())
      if (ok) {
        navigate(paths.dashboard, { replace: true })
        return
      }
      setStatus('error')
      setMessage('The trial did not unlock access yet. Try again.')
    } catch (error) {
      setStatus('error')
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not open checkout.',
      )
    } finally {
      setBusy(false)
    }
  }, [busy, navigate, refresh, user])

  if (!ready) return <ScreenWait label="Loading…" />
  if (entitled) return <Navigate to={paths.dashboard} replace />

  return (
    <div className="landing-page" data-page="salon">
      <LandingHeader />
      <main>
        <div className="wrap thanks">
          <div className="card">
            <p className="eyebrow">Subscription</p>
            <h1>Free for 30 days, then R200 / month</h1>
            <p className="lead">
              A South African card is required to start the trial. We charge{' '}
              <strong>R1.00</strong> now to verify the card, then refund it.
              After 30 days the plan is R200 per month until you cancel.
            </p>
            {status === 'cancelled' || status === 'error' || accessError ? (
              <p className="form-error">{message || accessError}</p>
            ) : null}
            <div className="cta-row">
              <button
                className="btn btn-primary"
                type="button"
                disabled={busy}
                onClick={() => void present()}
              >
                {busy ? 'Opening checkout…' : 'Start free trial'}
              </button>
            </div>
            <p className="legal-inline">
              <Link to={paths.terms}>Terms</Link>
              {' · '}
              <Link to={paths.privacy}>Privacy</Link>
              {' · '}
              <Link to={paths.refunds}>Refunds</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
