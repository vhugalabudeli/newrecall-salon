# Public copy inventory

This checklist is the source of truth for NewRecall’s public-launch wording review.

## Product voice

- Positioning: salon follow-ups.
- Tone: friendly and casual for salon owners and staff; direct and professional for billing, privacy, security, destructive actions, and operations.
- Preferred terms: salon follow-ups, follow-up date, how many weeks the service usually lasts (weeks until they’re due), last visit, lead time, booking status, client list, salon workspace / shared salon list.
- Avoid on public surfaces: usual return interval, return intervals, and bare “how long the service lasts” without “weeks” (easy to misread as appointment length).
- Internal names such as `recallDate`, `lifespan` (Postgres `lifespan_weeks`), database columns, API actions, and legacy routes stay unchanged. Backups may still contain the older `lifespanWeeks` key; import maps it to `lifespan`.

## Route coverage

- Public: landing, pricing, registration, sign-in, trial checkout, invitation completion, demo confirmation, terms, privacy, and refunds.
- App: dashboard, clients, client details and forms, calendar, services, settings, staff, subscription, backups, alerts, and loading/empty/error states.
- Operations: sign-in, overview, account lookup, subscriptions, trials, verification, transactions, refunds, disputes, renewals, incomplete checkouts, revenue, access repair, health, legal checks, salons, backups, support, and audit log.
- Metadata: HTML title and description, PWA description, document titles, navigation, footer, and accessible labels.

## Launch checks

- `support@newrecall.com` is active or forwards to a monitored mailbox before deployment.
- Rewritten legal policies receive qualified legal review before public launch.
- `npm run copy:check` passes with no deprecated public wording.

