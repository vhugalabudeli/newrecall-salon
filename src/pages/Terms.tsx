import { Link } from 'react-router-dom'
import { LegalLayout } from '../components/LegalLayout'
import { paths } from '../lib/routes'

export function Terms() {
  return (
    <LegalLayout title="Terms of Service" eyebrow="Legal">
      <p>
        These terms cover NewRecall Salon CRM (the “app”) at salon.newrecall.com.
        NewRecall is the product brand. The seller is Vhugala Budeli, trading as
        NewRecall. By creating an account, starting a trial, or using the app,
        you agree to them.
      </p>

      <h2>The app</h2>
      <p>
        NewRecall is a salon recall book: you track who to contact when their
        last visit is due to lapse. The client book is stored in the NewRecall
        cloud so staff in the same salon can share it. A network connection is
        required.
      </p>

      <h2>Accounts</h2>
      <p>
        Register as the salon owner, or join from an invite as staff. You are
        responsible for the email and password you choose, and for activity
        under that account. Staff must not start a second subscription for the
        same salon.
      </p>

      <h2>Subscriptions and trials</h2>
      <p>
        Paid access is sold as a monthly subscription billed to the salon
        owner. New customers may start with a free trial. A payment method is
        collected at the start of the trial. We charge R1.00 to verify the card
        and refund that amount. When the trial ends, the subscription renews
        monthly until you cancel. Billing is processed by Paystack. NewRecall
        is the merchant. We do not host a card form ourselves.
      </p>
      <p>
        Cancel anytime before the trial converts, or later, through
        Manage subscription in Settings (Paystack billing page). That control
        is for the owner. Cancellation stops future charges; it does not refund
        time already used unless required by law. See the{' '}
        <Link to={paths.refunds}>Refund Policy</Link>.
      </p>

      <h2>Payments</h2>
      <p>
        Card payments are processed in South African rand by Paystack
        Payments, a licensed payment service provider. Paystack charges your
        card on NewRecall’s behalf. Buyer questions about a charge can go to{' '}
        <a href="mailto:vhugalabudeli@gmail.com">vhugalabudeli@gmail.com</a>
        {' '}or Paystack support.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Use the app for your salon’s own recall work. Do not misuse the
        service, attempt to break access controls, or use someone else’s
        account without permission.
      </p>

      <h2>Your data</h2>
      <p>
        You own the client records you enter. Export a JSON backup from
        Settings if you want a file copy. How we handle personal information
        is in the{' '}
        <Link to={paths.privacy}>Privacy Policy</Link>.
      </p>

      <h2>Availability</h2>
      <p>
        We provide the app as-is. We do not guarantee uninterrupted access.
        Recall dates, messages, and notifications depend on data you enter and
        on a working connection to the salon book.
      </p>

      <h2>Contact</h2>
      <p>
        Questions:{' '}
        <a href="mailto:vhugalabudeli@gmail.com">vhugalabudeli@gmail.com</a>
      </p>
    </LegalLayout>
  )
}
