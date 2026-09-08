import { LegalLayout } from '../components/LegalLayout'

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" eyebrow="Legal">
      <p>
        This policy explains what NewRecall Salon CRM collects when you use
        salon.newrecall.com.
      </p>

      <h2>On this device</h2>
      <p>
        Your salon client book stays on this device, in this browser. Your
        login stays here too. We do not operate a NewRecall server that stores
        your client list.
      </p>

      <h2>Account and access</h2>
      <p>
        If you register, we keep on this device the name, email, optional salon
        name, and login needed to sign you in here. Paystack uses your email so
        the subscription is tied to you.
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
        Local data remains until you delete clients, log out and clear site
        data, or uninstall the app / clear the browser. Subscription records
        remain with Paystack and NewRecall for as long as they need them to
        bill and for legal accounting.
      </p>

      <h2>Your choices</h2>
      <p>
        You can edit or delete clients in the app, log out in Settings, and
        cancel a subscription in the customer portal. You can also clear this
        site’s data in the browser, which removes the local book and login on
        that device.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions:{' '}
        <a href="mailto:vhugalabudeli@gmail.com">vhugalabudeli@gmail.com</a>
      </p>
    </LegalLayout>
  )
}
