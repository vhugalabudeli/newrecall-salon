import { useState } from 'react'
import { Link } from 'react-router-dom'

export type PeriodRow = {
  key: string
  to?: string
  onSelect?: () => void
  label: string
  total?: number
}

type PeriodCardProps = {
  eyebrow: string
  eyebrowClassName?: string
  title?: string
  titleClassName?: string
  total: number
  empty?: string
  rows: PeriodRow[]
}

const PREVIEW_LIMIT = 3

function recallCountLabel(total: number) {
  return total === 1 ? '1 follow-up' : `${total} follow-ups`
}

const rowClassName =
  'flex w-full min-w-0 items-center justify-between gap-2 rounded-xl bg-cream px-3 py-2 text-left text-sm transition hover:bg-rose-mist'

function PeriodRowContent({ row }: { row: PeriodRow }) {
  return (
    <>
      <span className="min-w-0 truncate">{row.label}</span>
      {row.total != null ? (
        <span className="text-cocoa-soft">{row.total}</span>
      ) : null}
    </>
  )
}

function PeriodRowItem({ row }: { row: PeriodRow }) {
  if (row.to) {
    return (
      <Link to={row.to} className={rowClassName}>
        <PeriodRowContent row={row} />
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={row.onSelect}
      className={rowClassName}
    >
      <PeriodRowContent row={row} />
    </button>
  )
}

export function PeriodCard({
  eyebrow,
  eyebrowClassName,
  title,
  titleClassName,
  total,
  empty,
  rows,
}: PeriodCardProps) {
  const [expanded, setExpanded] = useState(false)
  const canCollapse = rows.length > PREVIEW_LIMIT
  const visibleRows =
    canCollapse && !expanded ? rows.slice(0, PREVIEW_LIMIT) : rows
  const remaining = rows.length - PREVIEW_LIMIT

  const count = (
    <span
      aria-label={recallCountLabel(total)}
      className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none ${
        total > 0 ? 'bg-blush text-ivory' : 'bg-line text-cocoa-soft'
      }`}
    >
      {total > 99 ? '99+' : total}
    </span>
  )

  return (
    <article className="rounded-2xl bg-ivory p-4 ring-1 ring-line">
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-xs font-medium tracking-wide uppercase ${
            eyebrowClassName ?? 'text-cocoa-soft'
          }`}
        >
          {eyebrow}
        </p>
        {count}
      </div>
      {title ? (
        <h2
          className={`font-display mt-1 min-w-0 text-2xl font-semibold ${titleClassName ?? ''}`}
        >
          {title}
        </h2>
      ) : null}
      {rows.length === 0 ? (
        empty ? (
          <p className="mt-4 text-sm text-cocoa-soft">{empty}</p>
        ) : null
      ) : (
        <div className="mt-4 space-y-2">
          {visibleRows.map((row) => (
            <PeriodRowItem key={row.key} row={row} />
          ))}
          {canCollapse ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-sm text-cocoa-soft">
                {expanded ? '' : `+${remaining} more`}
              </p>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((open) => !open)}
                className="shrink-0 text-sm font-medium text-blush-dark"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </article>
  )
}
