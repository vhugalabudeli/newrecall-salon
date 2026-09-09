import { Link } from 'react-router-dom'
import { LandingFooter } from '../components/LandingFooter'
import { LandingHeader } from '../components/LandingHeader'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { paths } from '../lib/routes'
import '../styles/landing.css'

const FORM_ACTION = 'https://formsubmit.co/support@newrecall.com'

export function Landing() {
  useDocumentTitle('NewRecall — Client follow-ups for salons')
  const { user, ready } = useAuth()
  const thankYouUrl =
    typeof window === 'undefined'
      ? paths.thankYou
      : new URL(paths.thankYou, window.location.origin).href

  return (
    <div className="landing-page" data-page="salon">
      <LandingHeader />

      <main>
        <div className="wrap">
          <section className="hero">
            <p className="eyebrow">Client follow-ups for salons</p>
            <h1>Know who is ready to come back — and when to get in touch.</h1>
            <p className="lead">
              NewRecall keeps your client follow-ups in one shared salon workspace.
              Add a client’s last visit, choose when they usually return, and see who
              needs a call or message next. Try it free for 30 days, then pay R200 per
              month.
            </p>
            <p className="muted">
              Your salon adds its own existing clients. NewRecall does not supply
              prospective customers or contact lists.
            </p>
            <div className="cta-row">
              {ready && user ? (
                <Link className="btn btn-primary" to={paths.dashboard}>
                  <span className="btn-full">Open the app</span>
                  <span className="btn-short">Open app</span>
                </Link>
              ) : (
                <>
                  <Link className="btn btn-primary" to={paths.register}>
                    Start your free trial
                  </Link>
                  <Link className="btn btn-secondary" to={paths.login}>
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </section>

          <section className="section" aria-labelledby="features-heading">
            <div className="section-head">
              <h2 id="features-heading">Simple follow-ups that bring clients back</h2>
              <p className="muted">
                Set each service’s usual return interval and NewRecall works out the next follow-up date.
              </p>
            </div>
            <div className="feature-grid">
              <article className="card feature-card">
                <span className="icon-pill" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 8.5h14M8 4.5v4M16 4.5v4M6.5 8.5V18A1.5 1.5 0 0 0 8 19.5h8a1.5 1.5 0 0 0 1.5-1.5V8.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <h3>Follow-up calendar</h3>
                <p>See who needs attention today, this week, and in the months ahead.</p>
              </article>
              <article className="card feature-card">
                <span className="icon-pill" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <h3>Flexible return times</h3>
                <p>
                  Choose how often clients usually return for each service. When a
                  client books, close the follow-up and start again after their next visit.
                </p>
              </article>
              <article className="card feature-card">
                <span className="icon-pill" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 11.5h10M8.5 15.5h7M12 4.5 5 8v3c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V8l-7-3.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <h3>Hair, nails, and more</h3>
                <p>
                  Organise hair, nails, waxing, lashes, massage, tanning, and facials
                  with return intervals that suit each treatment.
                </p>
              </article>
              <article className="card feature-card">
                <span className="icon-pill" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 7.5h14A1.5 1.5 0 0 1 20.5 9v7A1.5 1.5 0 0 1 19 17.5H9.5L5 20.5V7.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <h3>Ready-to-send messages</h3>
                <p>
                  One template. Wording switches when the booking is for someone else.
                  Send an SMS or WhatsApp message, or call from the follow-up card — everything opens on
                  this device.
                </p>
              </article>
            </div>
          </section>

          <section
            className="card panel"
            id="walkthrough"
            aria-labelledby="walkthrough-heading"
          >
            <h2 id="walkthrough-heading">Book a demo</h2>
            <p className="muted">
              Tell us about your salon and we’ll email you to arrange a time.
            </p>
            <form action={FORM_ACTION} method="POST">
              <input type="hidden" name="_subject" value="Walkthrough request: Salon" />
              <input type="hidden" name="product" value="Salon" />
              <input type="hidden" name="_template" value="table" />
              <input type="hidden" name="_captcha" value="false" />
              <input type="hidden" name="_next" value={thankYouUrl} />
              <input
                className="honey"
                type="text"
                name="_honey"
                tabIndex={-1}
                autoComplete="off"
              />
              <div className="fields">
                <label>
                  Name
                  <input type="text" name="name" autoComplete="name" required />
                </label>
                <label>
                  Email
                  <input type="email" name="email" autoComplete="email" required />
                </label>
                <label>
                  Phone
                  <input type="tel" name="phone" autoComplete="tel" />
                </label>
                <label>
                  Salon name
                  <input type="text" name="business" autoComplete="organization" />
                </label>
                <label className="full">
                  Message
                  <textarea
                    name="message"
                    rows={4}
                    placeholder="Tell us what you’d like to see in the demo"
                  />
                </label>
              </div>
              <button className="btn btn-primary" type="submit">
                Book my demo
              </button>
            </form>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
