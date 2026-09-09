import { Link } from 'react-router-dom'
import { LegalLayout } from '../components/LegalLayout'
import { paths } from '../lib/routes'

export function Refunds() {
  return (
    <LegalLayout title="Refund Policy" eyebrow="Legal">
      <p>
        This policy covers NewRecall at salon.newrecall.com. Billing
        is processed by Paystack in South African rand. NewRecall is the
        merchant. Refund requests are handled by us.
      </p>

      <h2>Free trial</h2>
      <p>
        New customers may start with a 30-day free trial. A payment method is
        collected when the trial starts. Paystack charges R1.00 to verify the
        card and refunds that amount. If you cancel before the trial ends,
        you will not be charged the R200 monthly fee. The R1.00 verification
        charge is refunded automatically.
      </p>

      <h2>Monthly subscription</h2>
      <p>
        When the trial ends, the plan renews monthly until you cancel. Cancel
        at any time through <strong>Manage subscription</strong> in Settings.
        Cancellation stops future charges. It does not automatically refund time
        already used in the current paid month, unless the law in your country
        requires it.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Email <a href="mailto:support@newrecall.com">support@newrecall.com</a>{' '}
        from the owner’s billing email. Include the charge date and reason for
        your request, but never send full card details. We review billing errors,
        duplicate charges, and requests required by law.
      </p>

      <h2>Pricing</h2>
      <p>
        Current prices are on the <Link to={paths.pricing}>pricing page</Link>.
      </p>
    </LegalLayout>
  )
}
