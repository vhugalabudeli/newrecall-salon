import { Link } from 'react-router-dom'
import { LegalLayout } from '../components/LegalLayout'
import { paths } from '../lib/routes'

export function Pricing() {
  return (
    <LegalLayout title="Simple monthly pricing" eyebrow="Pricing">
      <p>
        NewRecall gives your whole salon one shared place to manage client
        follow-ups. Start with a 30-day free trial, then pay month to month.
      </p>

      <h2>Plan</h2>
      <p>
        <strong>R200 per month</strong>, billed in South African rand through
        Paystack. Your first 30 days are free. Paystack charges R1.00 when you
        add your card to verify it, then refunds that amount. Unless you cancel,
        the paid monthly subscription starts when your trial ends.
      </p>

      <h2>What is included</h2>
      <p>
        One salon workspace with your client list, follow-up calendar, services,
        notes, alerts, backups, and staff access. Invited staff share the owner’s
        subscription and do not pay separately. NewRecall provides the software;
        each salon adds and manages its own existing clients.
      </p>

      <h2>Cancel</h2>
      <p>
        The salon owner can cancel at any time from <strong>Manage subscription</strong>
        in Settings. See the{' '}
        <Link to={paths.refunds}>refund policy</Link> for how charges and
        refunds work.
      </p>

      <p>
        <Link className="btn btn-primary" to={paths.register}>
          Start your free trial
        </Link>
      </p>
    </LegalLayout>
  )
}
