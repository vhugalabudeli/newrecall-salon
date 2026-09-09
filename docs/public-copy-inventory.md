# Public copy inventory

This checklist is the source of truth for NewRecall’s public-launch wording review.

## Product voice

- Positioning: client follow-ups for salons.
- Tone: friendly and casual for salon owners and staff; direct and professional for billing, privacy, security, destructive actions, and operations.
- Preferred terms: client list, salon workspace, follow-up date, usual return time, booking status.
- Internal names such as `recallDate`, `lifespanWeeks`, database columns, API actions, and legacy routes stay unchanged.

## Route coverage

- Public: landing, pricing, registration, sign-in, trial checkout, invitation completion, demo confirmation, terms, privacy, and refunds.
- App: dashboard, clients, client details and forms, calendar, services, settings, staff, subscription, backups, alerts, and loading/empty/error states.
- Operations: sign-in, overview, account lookup, subscriptions, trials, verification, transactions, refunds, disputes, renewals, incomplete checkouts, revenue, access repair, health, legal checks, salons, backups, support, and audit log.
- Metadata: HTML title and description, PWA description, document titles, navigation, footer, and accessible labels.

## Launch checks

- `support@newrecall.com` is active or forwards to a monitored mailbox before deployment.
- Rewritten legal policies receive qualified legal review before public launch.
- `npm run copy:check` passes with no deprecated public wording.

