import type { ReactNode } from 'react'

type AppPageProps = {
  children: ReactNode
  /** Wider column for Clients table and Calendar month cards. */
  wide?: boolean
}

export function AppPage({ children, wide = false }: AppPageProps) {
  return (
    <div
      className={`mx-auto w-full px-4 py-4 md:px-8 md:py-7 ${
        wide ? 'max-w-5xl' : 'max-w-3xl'
      }`}
    >
      {children}
    </div>
  )
}
