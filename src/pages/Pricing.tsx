import { Link } from 'react-router-dom'
import { LegalLayout } from '../components/LegalLayout'
import { paths } from '../lib/routes'

export function Pricing() {
  return (
    <LegalLayout title="Pricing" eyebrow="Salon CRM">
      <p>
        NewRecall Salon CRM is a monthly subscription. Register at
        salon.newrecall.com to start.
      </p>

      <h2>Plan</h2>
      <p>
        <strong>R200 per month</strong> (South African rand), billed through
        Paystack. New customers start with a <strong>30-day free trial</strong>.
        A payment method is collected at the start of the trial (R1.00 card
        verification, refunded). When the trial ends, the subscription renews
        monthly until you cancel.
      </p>

      <h2>What is included</h2>
      <p>
        The salon recall book in the cloud: clients, recall calendar, staff
        access, and settings. Staff invited by the owner share the same book.
        The owner’s Paystack subscription unlocks the salon.
      </p>

      <h2>Cancel</h2>
      <p>
        Cancel anytime before the trial converts, or later, through Manage
        subscription in Settings. See the{' '}
        <Link to={paths.refunds}>refund policy</Link> for how charges and
        refunds work.
      </p>

      <p>
        <Link className="btn btn-primary" to={paths.register}>
          Register
        </Link>
      </p>
    </LegalLayout>
  )
}
