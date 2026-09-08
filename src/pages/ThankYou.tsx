import { Link } from 'react-router-dom'
import { LandingHeader } from '../components/LandingHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { paths } from '../lib/routes'
import '../styles/landing.css'

export function ThankYou() {
  useDocumentTitle('Walkthrough request sent — NewRecall Salon')

  return (
    <div className="landing-page" data-page="salon">
      <LandingHeader />
      <main>
        <div className="wrap thanks">
          <div className="card">
            <p className="eyebrow">Thank you</p>
            <h1>We received your walkthrough request.</h1>
            <p className="lead">
              It is on its way to us. We will follow up by email to schedule a time.
            </p>
            <div className="cta-row">
              <Link className="btn btn-primary" to={paths.landing}>
                Back to NewRecall
              </Link>
              <Link className="btn btn-secondary" to={paths.login}>
                Log in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
