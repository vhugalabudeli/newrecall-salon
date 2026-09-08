import { Link } from 'react-router-dom'
import { LandingFooter } from '../components/LandingFooter'
import { LandingHeader } from '../components/LandingHeader'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { paths } from '../lib/routes'
import '../styles/landing.css'

const FORM_ACTION = 'https://formsubmit.co/vhugalabudeli@gmail.com'

export function Landing() {
  useDocumentTitle('NewRecall — Salon CRM')
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
            <p className="eyebrow">Salon CRM</p>
            <h1>You track who to contact when their last visit is due to lapse.</h1>
            <p className="lead">
              Recall clients when hair, nails, waxing, lashes, massage, tanning, or
              facials are due — after the last visit’s lifespan. Register or log in
              to open the book, or request a walkthrough for your salon. The plan
              is R200 per month after a 30-day free trial.
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
                    Register
                  </Link>
                  <Link className="btn btn-secondary" to={paths.login}>
                    Log in
                  </Link>
                </>
              )}
            </div>
          </section>

          <section className="section" aria-labelledby="features-heading">
            <div className="section-head">
              <h2 id="features-heading">Built for salon recall calls</h2>
              <p className="muted">
                Each visit sets the next recall from that service’s lifespan.
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
                <h3>Recall calendar</h3>
                <p>See who is due this week, this month, and further out.</p>
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
                <h3>Lifespan</h3>
                <p>
                  Each service lasts a set number of weeks after the last visit. Call
                  on or before it lapses. Booking closes this recall; the next starts
                  when you enter a new last visit.
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
                  Pick a service type — hair, nail, waxing, eyelash, massage, tanning,
                  or facials — then track the lifespan that fits that treatment.
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
                <h3>Recall SMS</h3>
                <p>
                  One template. Wording switches when the booking is for someone else.
                  SMS, WhatsApp, or call from the recall card — messages send from
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
            <h2 id="walkthrough-heading">Request a walkthrough</h2>
            <p className="muted">
              Tell us a little about the salon. We will email you to pick a time.
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
                    placeholder="When would you like a walkthrough?"
                  />
                </label>
              </div>
              <button className="btn btn-primary" type="submit">
                Send walkthrough request
              </button>
            </form>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
