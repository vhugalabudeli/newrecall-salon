import { Link } from 'react-router-dom'
import { LegalLayout } from '../components/LegalLayout'
import { paths } from '../lib/routes'

export function Refunds() {
  return (
    <LegalLayout title="Refund Policy" eyebrow="Legal">
      <p>
        This policy covers NewRecall Salon CRM at salon.newrecall.com. Billing
        is processed by Paystack in South African rand. NewRecall is the
        merchant. Refund requests are handled by us.
      </p>

      <h2>Free trial</h2>
      <p>
        New customers may start with a 30-day free trial. A payment method is
        collected when the trial starts. Paystack charges R1.00 to verify the
        card and refunds that amount. If you cancel before the trial ends,
        you are not charged R200. There is nothing to refund for an unused
        trial beyond the R1.00 verification, which is refunded.
      </p>

      <h2>Monthly subscription</h2>
      <p>
        When the trial ends, the plan renews monthly until you cancel. Cancel
        anytime in Settings through Manage subscription (Paystack billing
        page). Cancellation stops future charges. It does not refund time
        already used in the current paid month, unless the law in your country
        requires it.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Use Manage subscription in Settings, or email{' '}
        <a href="mailto:vhugalabudeli@gmail.com">vhugalabudeli@gmail.com</a>{' '}
        with the email on the account. We will review requests in good faith,
        including billing errors and cases required by law.
      </p>

      <h2>Pricing</h2>
      <p>
        Current prices are on the <Link to={paths.pricing}>pricing page</Link>.
      </p>
    </LegalLayout>
  )
}
