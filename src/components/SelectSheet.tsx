import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'

export type SelectOption<T extends string | number> = {
  value: T
  label: string
  triggerLabel?: string
}

type SelectSheetProps<T extends string | number> = {
  title: string
  options: readonly SelectOption<T>[]
  value: T
  onSelect: (value: T) => void
  onClose: () => void
  /** Highlight on tap, apply with Save. Calling-code sheets omit this. */
  confirm?: boolean
  extraAction?: { label: string; onClick: () => void }
  emptyText?: string
}

export function SelectSheet<T extends string | number>({
  title,
  options,
  value,
  onSelect,
  onClose,
  confirm = false,
  extraAction,
  emptyText = 'No matching options.',
}: SelectSheetProps<T>) {
  const titleId = useId()
  const searchable = options.length > 12
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState(value)

  const filtered = searchable
    ? options.filter((option) => {
        const term = query.trim().toLowerCase()
        if (!term) return true
        return (
          option.label.toLowerCase().includes(term) ||
          String(option.value).toLowerCase().includes(term)
        )
      })
    : options

  const canSave = draft !== value

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(value), 0)
    return () => window.clearTimeout(timer)
  }, [value])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-cocoa/30"
        aria-label="Cancel selection"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(28rem,80dvh)] w-full flex-col rounded-t-2xl bg-ivory shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2
            id={titleId}
            className="font-display text-lg font-semibold"
          >
            {title}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-lg px-3 text-sm text-cocoa-soft hover:bg-cream"
            >
              Cancel
            </button>
            {confirm ? (
              <button
                type="button"
                onClick={() => onSelect(draft)}
                disabled={!canSave}
                className="min-h-11 rounded-lg bg-blush px-3 text-sm font-semibold text-ivory hover:bg-blush-dark disabled:opacity-40"
              >
                Save
              </button>
            ) : null}
          </div>
        </div>
        {searchable ? (
          <div className="border-b border-line px-5 py-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search country or code"
              className="box-border w-full rounded-lg border border-line bg-ivory px-3 py-2.5 text-base text-cocoa outline-none focus:border-blush"
            />
          </div>
        ) : null}
        <div className="overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {filtered.length === 0 ? (
            <p className="px-5 py-6 text-sm text-cocoa-soft">
              {emptyText}
            </p>
          ) : (
            filtered.map((option) => {
              const selected = option.value === (confirm ? draft : value)
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  autoFocus={!searchable && option.value === value}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => {
                    if (confirm) setDraft(option.value)
                    else onSelect(option.value)
                  }}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm ${
                    selected
                      ? 'bg-rose-mist/60 font-medium text-blush-dark'
                      : 'text-cocoa hover:bg-cream'
                  }`}
                >
                  <span>{option.label}</span>
                  {selected ? <CheckMark /> : null}
                </button>
              )
            })
          )}
          {extraAction ? (
            <button
              type="button"
              onClick={() => {
                extraAction.onClick()
                onClose()
              }}
              className="flex min-h-11 w-full items-center px-5 py-3 text-left text-sm font-medium text-blush-dark hover:bg-cream"
            >
              {extraAction.label}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

type SelectTriggerProps<T extends string | number> = {
  title: string
  options: readonly SelectOption<T>[]
  value: T
  onChange: (value: T) => void
  className: string
  placeholder?: string
  extraAction?: { label: string; onClick: () => void }
  emptyText?: string
}

/** Native select on desktop; button + bottom sheet on a phone. */
export function SelectTrigger<T extends string | number>({
  title,
  options,
  value,
  onChange,
  className,
  placeholder,
  extraAction,
  emptyText,
}: SelectTriggerProps<T>) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)
  const triggerText =
    selected?.triggerLabel ?? selected?.label ?? placeholder ?? String(value)

  return (
    <>
      <button
        type="button"
        className={`${className} flex min-h-11 items-center justify-between gap-2 text-left md:hidden`}
        aria-label={title}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className={`min-w-0 truncate ${selected ? '' : 'text-cocoa-soft'}`}>
          {triggerText}
        </span>
        <ChevronDown />
      </button>
      <select
        className={`${className} hidden md:block`}
        aria-label={title}
        value={selected ? String(value) : ''}
        onChange={(event) => {
          const match = options.find(
            (option) => String(option.value) === event.target.value,
          )
          if (match) onChange(match.value)
        }}
      >
        {placeholder && !selected ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={String(option.value)} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {open ? (
        <SelectSheet
          title={title}
          options={options}
          value={value}
          extraAction={extraAction}
          emptyText={emptyText}
          onSelect={(next) => {
            onChange(next)
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

function CheckMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M6.15 11.35 3.4 8.6l1.2-1.2 1.55 1.55 5.25-5.25 1.2 1.2z"
      />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4 shrink-0 text-cocoa-soft"
      aria-hidden="true"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M4 6.5 8 10.5 12 6.5"
      />
    </svg>
  )
}
