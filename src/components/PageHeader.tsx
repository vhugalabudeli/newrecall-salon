import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  subtitle?: string
  subtitleSticky?: boolean
  eyebrow?: ReactNode
  titleClassName?: string
  onAdd?: () => void
  addLabel?: string
  actions?: ReactNode
  onBack?: () => void
  backLabel?: string
}

export function PageHeader({
  title,
  subtitle,
  subtitleSticky = true,
  eyebrow,
  titleClassName,
  onAdd,
  addLabel = 'Add client',
  actions,
  onBack,
  backLabel = 'Back',
}: PageHeaderProps) {
  const subtitleEl = subtitle ? (
    <p className="text-sm text-cocoa-soft">{subtitle}</p>
  ) : null

  return (
    <>
      <header
        className={`${
          onBack ? 'sticky' : 'static md:sticky'
        } top-0 z-20 -mx-4 -mt-4 border-b border-line bg-cream px-4 pt-4 pb-3 md:-mx-8 md:-mt-7 md:px-8 md:pt-7 md:pb-4 ${
          subtitle && !subtitleSticky ? 'mb-2' : 'mb-6'
        } md:mb-8`}
      >
        {onBack ? null : eyebrow}
        <div
          className={`flex gap-3 md:gap-4 ${
            onBack || onAdd || actions ? 'items-center justify-between' : 'flex-col items-start'
          }`}
        >
          <div
            className={`flex min-w-0 flex-1 gap-2 ${
              subtitle && onBack ? 'items-start' : 'items-center'
            }`}
          >
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label={backLabel}
                className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-blush-dark hover:bg-rose-mist"
              >
                <BackMark />
              </button>
            ) : null}
            <div className="min-w-0 flex-1">
              <h1
                className={`font-display text-2xl font-semibold whitespace-nowrap md:text-3xl ${
                  onBack ? 'truncate' : ''
                } ${!onBack && eyebrow ? 'mt-2' : ''} ${titleClassName ?? ''}`}
              >
                {title}
              </h1>
              {subtitleSticky ? (
                <div className="mt-1">{subtitleEl}</div>
              ) : null}
            </div>
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              className="shrink-0 rounded-lg bg-blush px-3 py-2 text-sm font-semibold text-ivory hover:bg-blush-dark md:px-4 md:py-2.5"
            >
              {addLabel}
            </button>
          ) : null}
        </div>
      </header>
      {subtitle && !subtitleSticky ? (
        <p className="mb-6 text-sm text-cocoa-soft md:mb-8">{subtitle}</p>
      ) : null}
    </>
  )
}

function BackMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 5.5 8.5 12 15 18.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
