import { LegalLayout } from '../components/LegalLayout'

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" eyebrow="Legal">
      <p>
        This policy explains what NewRecall Salon CRM collects when you use
        salon.newrecall.com.
      </p>

      <h2>Your salon book</h2>
      <p>
        Your salon client book is stored in NewRecall’s cloud (Supabase) so
        the owner and invited staff can share the same clients. The app needs
        a network connection. We do not use your salon’s client names for
        advertising.
      </p>

      <h2>Account and access</h2>
      <p>
        If you register, we keep your name, email, salon name, and login so you
        can sign in. Staff join a salon from an invite. Paystack bills the
        salon owner’s email, not each staff login.
      </p>

      <h2>Payments</h2>
      <p>
        Trials and monthly billing are processed by Paystack. They collect the
        payment details needed to verify a card, start a trial, and charge the
        monthly fee. NewRecall does not store full card numbers. See{' '}
        <a href="https://paystack.com/privacy" rel="noreferrer">
          Paystack’s privacy policy
        </a>{' '}
        for how they handle payment data.
      </p>

      <h2>Walkthrough requests</h2>
      <p>
        If you send the walkthrough form, the name, email, phone, salon name,
        and message you type are emailed to us so we can reply and book a time.
      </p>

      <h2>What we do not share</h2>
      <p>
        We do not sell your client book. We do not use your salon’s client
        names for advertising.
      </p>

      <h2>Notification alerts</h2>
      <p>
        If you turn on Due today or Overdue alerts, this device may show
        notifications while the app is open. To alert you when the app is
        closed, we store a push subscription and a small daily alert schedule
        (alert titles and bodies for due and overdue, your timezone, and
        preference flags)—not your full client book—so a scheduled job can
        send the alert. You can turn alerts off in Settings.
      </p>

      <h2>How long data stays</h2>
      <p>
        Salon records remain until you delete clients or the salon account is
        closed. Alert preferences stay on this device until you change them.
        Subscription records remain with Paystack and NewRecall for as long as
        they need them to bill and for legal accounting.
      </p>

      <h2>Your choices</h2>
      <p>
        You can edit or delete clients in the app, export or import a book
        file in Settings, log out, and cancel a subscription in the customer
        portal (owners). You can also ask us to help close a salon.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions:{' '}
        <a href="mailto:vhugalabudeli@gmail.com">vhugalabudeli@gmail.com</a>
      </p>
    </LegalLayout>
  )
}
