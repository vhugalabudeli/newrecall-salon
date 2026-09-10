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
        Salon records remain until the owner deletes the salon account or asks us
        to close it, subject to billing records that must be retained for accounting,
        disputes, and legal obligations. Server-side notification subscriptions and
        schedules expire after 90 days without an update and are removed when alerts
        are turned off or the salon account is deleted. Support notes and administrative
        audit history are limited to the latest 200 records and expire after 365 days.
      </p>

      <h2>Your choices</h2>
      <p>
        You can edit or delete clients, export or import a salon backup, turn off
        alerts, and sign out. Owners can manage billing and staff access or permanently
        delete the salon account from Settings. Contact us to request access to or
        correction of your personal information, or for help closing an account.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions:{' '}
        <a href="mailto:support@newrecall.com">support@newrecall.com</a>
      </p>
    </LegalLayout>
  )
}
