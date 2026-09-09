import type { ReactNode } from 'react'
import { LandingFooter } from './LandingFooter'
import { LandingHeader } from './LandingHeader'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import '../styles/landing.css'

export function LegalLayout({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow: string
  children: ReactNode
}) {
  useDocumentTitle(`${title} — NewRecall`)

  return (
    <div className="landing-page" data-page="salon">
      <LandingHeader />
      <main>
        <article className="wrap legal">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="muted">Last updated 9 September 2026</p>
          {children}
        </article>
      </main>
      <LandingFooter />
    </div>
  )
}
