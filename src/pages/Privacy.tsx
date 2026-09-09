import { LegalLayout } from '../components/LegalLayout'

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" eyebrow="Legal">
      <p>
        This policy explains what NewRecall collects and uses when you visit or use
        salon.newrecall.com.
      </p>

      <h2>Your salon workspace</h2>
      <p>
        Client details, services, visit dates, follow-up dates, statuses, and notes
        are stored securely using Supabase so the owner and invited staff can work
        from the same client list. NewRecall needs an internet connection.
      </p>

      <h2>Account and access</h2>
      <p>
        We keep your name, email address, salon name, role, and sign-in details so
        we can provide and secure your account. Staff join through an invitation;
        only the salon owner is responsible for billing.
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
        If you request a demo, we use the contact details and message you provide
        to reply and arrange it.
      </p>

      <h2>What we do not share</h2>
      <p>
        We do not sell salon or client information, and we do not use client names for advertising.
      </p>

      <h2>Notification alerts</h2>
      <p>
        If you turn on Due today or Overdue alerts, this device may show
        notifications while the app is open. To alert you when the app is
        closed, we store a push subscription and a small daily alert schedule
        (alert titles and bodies for due and overdue follow-ups, your timezone, and
        preference flags)—not your full client list—so a scheduled service can
        send the alert. You can turn alerts off in Settings.
      </p>

      <h2>How long data stays</h2>
      <p>
        Salon records remain until you delete them or ask us to close the salon
        account, subject to legal and operational retention requirements. Alert
        preferences stay on your device until you change them. Billing records
        are kept as long as needed for payments, accounting, disputes, and legal obligations.
      </p>

      <h2>Your choices</h2>
      <p>
        You can edit or delete clients, export or import a salon backup, turn off
        alerts, and sign out. Owners can manage billing and staff access. Contact
        us to request access to your personal information, correct it, or close a salon account.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions:{' '}
        <a href="mailto:support@newrecall.com">support@newrecall.com</a>
      </p>
    </LegalLayout>
  )
}
