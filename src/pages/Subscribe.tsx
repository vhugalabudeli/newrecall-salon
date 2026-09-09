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
  useDocumentTitle('Start your free trial — NewRecall')
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
      const checkout = await startTrialCheckout()
      const result = await openPaystackPopup(checkout.accessCode)
      if (result === 'cancelled') {
        setStatus('cancelled')
        setMessage('Checkout was closed. Start the free trial when you’re ready.')
        return
      }
      const billed = await finishTrialCheckout({
        reference: result.reference,
      })
      const ok = billed.entitled || (await refresh())
      if (ok) {
        navigate(paths.dashboard, { replace: true })
        return
      }
      setStatus('error')
      setMessage('Your payment was confirmed, but access is still updating. Please try again in a moment.')
    } catch (error) {
      setStatus('error')
      setMessage(
        error instanceof Error
          ? error.message
          : 'We could not open the secure checkout. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }, [busy, navigate, refresh, user])

  if (!ready) return <ScreenWait label="Loading…" />
  if (entitled) return <Navigate to={paths.dashboard} replace />

  const isStaff = user?.role === 'staff'

  return (
    <div className="landing-page" data-page="salon">
      <LandingHeader />
      <main>
        <div className="wrap thanks">
          <div className="card">
            <p className="eyebrow">Subscription</p>
            <h1>Try NewRecall free for 30 days</h1>
            <p className="lead">
              {isStaff
                ? 'Your salon does not have an active plan yet. Ask the owner to start the free trial — staff never need a separate subscription.'
                : 'Add a South African bank card to start. Paystack will charge '}
              {isStaff ? null : (
                <>
                  <strong>R1.00</strong> now to verify the card, then refund it.
                  Your trial is free for 30 days, then the plan renews at R200 per month until you cancel.
                </>
              )}
            </p>
            {status === 'cancelled' || status === 'error' || accessError ? (
              <p className="form-error">{message || accessError}</p>
            ) : null}
            {isStaff ? null : (
              <div className="cta-row">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={busy}
                  onClick={() => void present()}
                >
                  {busy ? 'Opening secure checkout…' : 'Start my free trial'}
                </button>
              </div>
            )}
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
