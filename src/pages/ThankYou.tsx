import { Link } from 'react-router-dom'
import { LandingHeader } from '../components/LandingHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { paths } from '../lib/routes'
import '../styles/landing.css'

export function ThankYou() {
  useDocumentTitle('Demo request sent — NewRecall')

  return (
    <div className="landing-page" data-page="salon">
      <LandingHeader />
      <main>
        <div className="wrap thanks">
          <div className="card">
            <p className="eyebrow">Thank you</p>
            <h1>Your demo request is on its way.</h1>
            <p className="lead">
              Thanks for getting in touch. We’ll email you soon to arrange a time that works.
            </p>
            <div className="cta-row">
              <Link className="btn btn-primary" to={paths.landing}>
                Back to NewRecall
              </Link>
              <Link className="btn btn-secondary" to={paths.login}>
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
