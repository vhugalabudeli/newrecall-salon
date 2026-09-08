import { Link } from 'react-router-dom'
import { paths } from '../lib/routes'

export function LandingFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span>NewRecall — Salon CRM</span>
        <nav className="footer-legal" aria-label="Legal">
          <Link to={paths.pricing}>Pricing</Link>
          <Link to={paths.terms}>Terms</Link>
          <Link to={paths.privacy}>Privacy Policy</Link>
          <Link to={paths.refunds}>Refund Policy</Link>
          <a href="mailto:vhugalabudeli@gmail.com">Contact</a>
        </nav>
      </div>
    </footer>
  )
}
