import { useSalonName } from '../hooks/useSalonName'
import { shopMarkLabel } from '../lib/settings'

export function NotificationBanner({
  sections,
}: {
  sections: { title: string; body: string }[]
}) {
  const { salonName } = useSalonName()

  return (
    <article className="rounded-[1.25rem] bg-ivory px-3 py-2.5 ring-1 ring-line">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blush text-ivory">
          <ScissorsMark />
        </span>
        <p className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-wide text-cocoa-soft uppercase">
          {shopMarkLabel(salonName)}
        </p>
        <p className="shrink-0 text-[11px] text-cocoa-soft">now</p>
      </div>
      {sections.map((section) => (
        <div key={section.title} className="mt-1.5">
          <p className="text-sm font-semibold">{section.title}</p>
          <p className="mt-0.5 text-sm text-cocoa-soft">{section.body}</p>
        </div>
      ))}
    </article>
  )
}

function ScissorsMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="6.5"
        cy="17.5"
        r="2.4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle
        cx="17.5"
        cy="17.5"
        r="2.4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.4 16.1 19 5.5M15.6 16.1 5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
