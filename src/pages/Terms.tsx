import { Link } from 'react-router-dom'
import { LegalLayout } from '../components/LegalLayout'
import { paths } from '../lib/routes'

export function Terms() {
  return (
    <LegalLayout title="Terms of Service" eyebrow="Legal">
      <p>
        These terms cover the NewRecall client follow-up app at salon.newrecall.com.
        NewRecall is the product brand. The seller is Vhugala Budeli, trading as
        NewRecall. By creating an account, starting a trial, or using the app,
        you agree to them.
      </p>

      <h2>What NewRecall does</h2>
      <p>
        NewRecall helps salons keep client details, plan follow-ups, and contact
        clients when they may be ready to return. Salon data is stored online so
        invited team members can share one workspace. NewRecall does not source or
        provide prospective customers or contact lists. An internet connection is required.
      </p>

      <h2>Accounts</h2>
      <p>
        Create the salon account as its owner, or join through a staff invitation. You are
        responsible for the email and password you choose, and for activity
        under that account. The owner controls salon membership and billing;
        invited staff share the owner’s subscription.
      </p>

      <h2>Subscriptions and trials</h2>
      <p>
        The salon owner pays R200 per month after the 30-day free trial. Paystack
        charges R1.00 when the owner adds a card to verify it, then refunds that
        amount. Unless the owner cancels, monthly billing starts when the trial
        ends. Paystack processes card details and payments; NewRecall does not store full card numbers.
      </p>
      <p>
        The owner can cancel before or after the trial from <strong>Manage subscription</strong>
        in Settings. Cancellation stops future charges; it does not refund
        time already used unless required by law. See the{' '}
        <Link to={paths.refunds}>Refund Policy</Link>.
      </p>

      <h2>Payments</h2>
      <p>
        Card payments are processed in South African rand by Paystack Payments.
        Paystack charges the owner’s card on NewRecall’s behalf. Questions about a charge can go to{' '}
        <a href="mailto:support@newrecall.com">support@newrecall.com</a>
        {' '}or Paystack support.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Use the app for your salon’s own client follow-up work. Do not misuse the
        service, attempt to break access controls, or use someone else’s
        account without permission.
      </p>

      <h2>Your data</h2>
      <p>
        You remain responsible for the client records you enter and for having
        permission to use them. You can export a backup from Settings. How we handle personal information
        is in the{' '}
        <Link to={paths.privacy}>Privacy Policy</Link>.
      </p>

      <h2>Availability</h2>
      <p>
        We work to keep NewRecall available, but do not guarantee uninterrupted
        service. Follow-up dates, messages, and notifications depend on the data
        you enter, device permissions, and a working internet connection.
      </p>

      <h2>Contact</h2>
      <p>
        Questions:{' '}
        <a href="mailto:support@newrecall.com">support@newrecall.com</a>
      </p>
    </LegalLayout>
  )
}
