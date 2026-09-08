# NewRecall — Salon CRM

Salon CRM. You track who to contact when their last visit is due to lapse.

The book lives in Supabase (one salon, many staff). Billing is Paystack on the salon owner’s email (30-day free trial, then R200 / month).

```bash
npm install
cp .env.example .env.local
```

Put your Paystack **secret key** (`sk_test_…` or `sk_live_…`) in `.env.local` as `PAYSTACK_SECRET_KEY`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. For invites and the operator desk, set `SUPABASE_SERVICE_ROLE_KEY` (never `VITE_`). Optionally set `PAYSTACK_PLAN_CODE` to an existing monthly ZAR R200 plan.

Apply `supabase/migrations/` to the Supabase project. Leave email confirmation off so register → trial still works.

```bash
npm run dev
```

Open http://localhost:5173/. Register or log in, then start the free trial to open the book.

On Vercel, set `PAYSTACK_SECRET_KEY` (and optional `PAYSTACK_PLAN_CODE`) as project environment variables. Production checkout needs the **live** secret key.

The operator desk is at `/admin` (`salon.newrecall.com/admin`). Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` on Vercel (and in `.env.local` for development). Support notes and the audit log use the same Upstash Redis as closed-app alerts when those variables are set. Tenant export/restore uses the service role.

To work on the CRM without Paystack, set `VITE_PAYWALL_BYPASS=true` in `.env.local`.

Installable as a PWA (`npm run build && npm run preview`). The live app is meant to serve on salon.newrecall.com.

### Closed-app notification alerts

Local alerts still fire while the app is open. For alerts when the PWA is closed (including iPhone installed to Home Screen), set:

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (from `npx web-push generate-vapid-keys`)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- optional `CRON_SECRET` for `/api/alerts/dispatch`

Vercel runs a daily cron at 06:00 UTC against `/api/alerts/dispatch` (Hobby plan limit). The app uploads only a minimal daily schedule (titles/bodies + prefs), not the full client book.

### Agent docs (Context7 / Docs7)

This repo is set up so coding agents can read current library docs and NewRecall’s own guides.

- **Context7 MCP** is in `.cursor/mcp.json` (OAuth). In Cursor, open **Customize → MCP**, enable `context7`, and complete the sign-in prompt if it appears.
- Product docs for Docs7 live in `docs/` (`docs.json` + MDX: overview, setup, book, billing, alerts, operator desk). Connect this GitHub repo at [context7.com/docs7](https://context7.com/docs7). Each Docs7 deploy refreshes the Context7 library.
- `context7.json` tells Context7 to index `docs/` and to keep the cloud book, Paystack, and `/admin` rules.
