import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { format, isToday } from 'date-fns'
import { updateBookingStatus, updateContactStatus, deleteClientNote, deleteNoteVersion, clearClientNoteText } from '../lib/db'
import {
  bookingStatusLabels,
  bookingStatuses,
  contactStatusLabels,
  contactStatuses,
} from '../lib/labels'
import { groupNotesByDay, newestFirst } from '../lib/notes'
import type { BookingStatus, Client, ContactStatus, Note } from '../types'
import { AddNoteModal } from './AddNoteModal'
import { SelectSheet } from './SelectSheet'

export const fieldActionClassName =
  'inline-flex shrink-0 items-center rounded-lg bg-blush px-2.5 py-1.5 text-sm font-semibold text-ivory hover:bg-blush-dark'

export const recallRowClassName =
  'rounded-2xl bg-ivory px-4 py-3 text-sm ring-1 ring-line'

type EditingField = 'contact' | 'booking' | null

const contactOptions = contactStatuses.map((status) => ({
  value: status,
  label: contactStatusLabels[status],
}))

const bookingOptions = bookingStatuses.map((status) => ({
  value: status,
  label: bookingStatusLabels[status],
}))

export function ClientStatusEditors({ client }: { client: Client }) {
  const [editing, setEditing] = useState<EditingField>(null)
  const [draftContact, setDraftContact] = useState(client.contactStatus)
  const [draftBooking, setDraftBooking] = useState(client.bookingStatus)

  function startEdit(field: EditingField) {
    setDraftContact(client.contactStatus)
    setDraftBooking(client.bookingStatus)
    setEditing(field)
  }

  async function applyContact(status: ContactStatus) {
    setEditing(null)
    if (status === client.contactStatus) return
    await updateContactStatus(client.id, status)
  }

  async function applyBooking(status: BookingStatus) {
    setEditing(null)
    if (status === client.bookingStatus) return
    await updateBookingStatus(client.id, status)
  }

  async function saveContact() {
    await applyContact(draftContact)
  }

  async function saveBooking() {
    await applyBooking(draftBooking)
  }

  return (
    <>
      <div className={recallRowClassName}>
        <StatusField
          label="Contact"
          value={contactStatusLabels[client.contactStatus]}
          editing={editing === 'contact'}
          onChangeClick={() => startEdit('contact')}
          onCancel={() => setEditing(null)}
          onSave={() => void saveContact()}
          canSave={draftContact !== client.contactStatus}
          sheet={
            editing === 'contact' ? (
              <SelectSheet
                title="Contact"
                options={contactOptions}
                value={client.contactStatus}
                confirm
                onSelect={(status) => void applyContact(status)}
                onClose={() => setEditing(null)}
              />
            ) : null
          }
        >
          <select
            className="w-full min-w-0 rounded-lg border border-line bg-ivory px-2 py-2 text-base text-cocoa outline-none focus:border-blush md:text-sm"
            value={draftContact}
            onChange={(event) =>
              setDraftContact(event.target.value as ContactStatus)
            }
          >
            {contactStatuses.map((status) => (
              <option key={status} value={status}>
                {contactStatusLabels[status]}
              </option>
            ))}
          </select>
        </StatusField>
      </div>
      <div className={recallRowClassName}>
        <StatusField
          label="Booking status"
          value={bookingStatusLabels[client.bookingStatus]}
          editing={editing === 'booking'}
          onChangeClick={() => startEdit('booking')}
          onCancel={() => setEditing(null)}
          onSave={() => void saveBooking()}
          canSave={draftBooking !== client.bookingStatus}
          sheet={
            editing === 'booking' ? (
              <SelectSheet
                title="Booking status"
                options={bookingOptions}
                value={client.bookingStatus}
                confirm
                onSelect={(status) => void applyBooking(status)}
                onClose={() => setEditing(null)}
              />
            ) : null
          }
        >
          <select
            className="w-full min-w-0 rounded-lg border border-line bg-ivory px-2 py-2 text-base text-cocoa outline-none focus:border-blush md:text-sm"
            value={draftBooking}
            onChange={(event) =>
              setDraftBooking(event.target.value as BookingStatus)
            }
          >
            {bookingStatuses.map((status) => (
              <option key={status} value={status}>
                {bookingStatusLabels[status]}
              </option>
            ))}
          </select>
        </StatusField>
      </div>
    </>
  )
}

export function NoteTimeline({ client }: { client: Client }) {
  const [editing, setEditing] = useState<Note | null>(null)
  const notesWithText = useMemo(
    () => newestFirst(client.notes).filter((note) => note.text.trim()),
    [client.notes],
  )
  const dayGroups = groupNotesByDay(notesWithText)

  if (dayGroups.length === 0) {
    return (
      <p className="text-sm text-cocoa-soft">
        No notes yet.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {dayGroups.map((group) => (
        <section key={group.key}>
          <h3 className="mb-2 text-[11px] font-normal text-cocoa-soft/80">
            {group.heading}
          </h3>
          <div className="space-y-2">
            {group.notes.map((note) => (
              <NoteCard
                key={note.id}
                clientId={client.id}
                note={note}
                onEdit={() => setEditing(note)}
              />
            ))}
          </div>
        </section>
      ))}
      {editing ? (
        <AddNoteModal
          client={client}
          note={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  )
}

function StatusField({
  label,
  value,
  editing,
  onChangeClick,
  onCancel,
  onSave,
  canSave,
  sheet,
  children,
}: {
  label: string
  value: string
  editing: boolean
  onChangeClick: () => void
  onCancel: () => void
  onSave: () => void
  canSave: boolean
  sheet: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-cocoa-soft uppercase">
            {label}
          </p>
          <p
            className={`mt-0.5 text-sm ${editing ? 'md:hidden' : ''}`}
          >
            {value}
          </p>
        </div>
        <button
          type="button"
          onClick={onChangeClick}
          className={`${fieldActionClassName} ${editing ? 'md:hidden' : ''}`}
        >
          Change
        </button>
      </div>
      {editing ? (
        <div className="mt-2 hidden space-y-2 md:block">
          {children}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-2 py-1 text-xs text-cocoa-soft hover:bg-cream"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="rounded-lg bg-blush px-2 py-1 text-xs font-semibold text-ivory hover:bg-blush-dark disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}
      {editing ? sheet : null}
    </div>
  )
}

const NOTE_SWIPE_CLOSE = 'salon-note-swipe-close'

function SwipeRow({
  surfaceClassName,
  actions,
  children,
}: {
  surfaceClassName: string
  actions: ReactNode
  children: ReactNode
}) {
  const id = useId()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const openRef = useRef(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onClose(event: Event) {
      if ((event as CustomEvent<string>).detail === id) return
      scrollerRef.current?.scrollTo({ left: 0 })
      openRef.current = false
      setOpen(false)
    }
    window.addEventListener(NOTE_SWIPE_CLOSE, onClose)
    return () => window.removeEventListener(NOTE_SWIPE_CLOSE, onClose)
  }, [id])

  function onScroll() {
    const node = scrollerRef.current
    if (!node) return
    const max = node.scrollWidth - node.clientWidth
    const revealed = max > 0 && node.scrollLeft >= max * 0.35
    if (node.scrollLeft > 4 && !openRef.current) {
      window.dispatchEvent(new CustomEvent(NOTE_SWIPE_CLOSE, { detail: id }))
    }
    openRef.current = revealed
    setOpen(revealed)
  }

  return (
    <div
      ref={scrollerRef}
      className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      onScroll={onScroll}
    >
      <div
        className={`relative w-full shrink-0 grow-0 basis-full snap-start snap-always ${surfaceClassName}`}
      >
        {children}
        {open ? (
          <button
            type="button"
            className="absolute inset-0 z-10"
            aria-label="Hide edit and delete"
            onClick={() =>
              scrollerRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
            }
          />
        ) : null}
      </div>
      <div
        aria-hidden={!open}
        className="flex shrink-0 snap-end snap-always items-center gap-3 px-3"
      >
        {actions}
      </div>
    </div>
  )
}

function NoteStampButton({ at }: { at: string }) {
  const [open, setOpen] = useState(false)
  const date = new Date(at)
  const stamp = isToday(date)
    ? format(date, 'HH:mm')
    : format(date, 'd MMM HH:mm')

  return (
    <button
      type="button"
      onClick={() => setOpen((value) => !value)}
      className="inline-flex h-8 min-w-8 items-center justify-center text-cocoa-soft"
      aria-label={open ? `Hide time ${stamp}` : 'Show time'}
      aria-expanded={open}
    >
      {open ? (
        <time dateTime={at} className="text-xs tabular-nums">
          {stamp}
        </time>
      ) : (
        <>
          <InfoMark />
          <span className="sr-only">Show time</span>
        </>
      )}
    </button>
  )
}

function InfoMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6.25"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M8 7.25V11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="5.15" r="0.85" fill="currentColor" />
    </svg>
  )
}

function NoteCard({
  clientId,
  note,
  onEdit,
}: {
  clientId: string
  note: Note
  onEdit: () => void
}) {
  const previous = [...(note.versions ?? [])]
    .map((version, index) => ({ version, index }))
    .reverse()
  const shownAt = note.editedAt ?? note.createdAt
  const [historyOpen, setHistoryOpen] = useState(false)

  async function onDeleteNote() {
    const confirmed = window.confirm('Remove this note?')
    if (!confirmed) return
    if (note.relatedTo === 'general') {
      await deleteClientNote(clientId, note.id)
      return
    }
    await clearClientNoteText(clientId, note.id)
  }

  async function onDeleteVersion(versionIndex: number) {
    const confirmed = window.confirm('Remove this previous version?')
    if (!confirmed) return
    await deleteNoteVersion(clientId, note.id, versionIndex)
  }

  return (
    <article className="overflow-hidden rounded-xl bg-cream text-sm">
      <SwipeRow
        surfaceClassName="bg-cream px-3 py-2"
        actions={
          <>
            <button
              type="button"
              onClick={onEdit}
              className="text-xs font-medium text-blush-dark"
              aria-label="Edit note"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => void onDeleteNote()}
              className="text-xs font-medium text-blush-dark"
              aria-label="Delete note"
            >
              Delete
            </button>
          </>
        }
      >
        <div className="flex items-start justify-between gap-2">
          {note.text ? (
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-cocoa-soft">
              {note.text}
            </p>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          <NoteStampButton at={shownAt} />
        </div>
      </SwipeRow>
      {previous.length > 0 ? (
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="mt-1 px-3 pb-2 text-xs text-cocoa-soft"
        >
          Edited
        </button>
      ) : null}
      {historyOpen && previous.length > 0 ? (
        <NoteHistorySheet
          currentText={note.text}
          currentAt={shownAt}
          previous={previous}
          onDeleteVersion={onDeleteVersion}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}
    </article>
  )
}

function NoteHistorySheet({
  currentText,
  currentAt,
  previous,
  onDeleteVersion,
  onClose,
}: {
  currentText: string
  currentAt: string
  previous: { version: { text: string; at: string }; index: number }[]
  onDeleteVersion: (index: number) => void | Promise<void>
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 md:items-center md:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-cocoa/30"
        aria-label="Close edit history"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-edit-history-title"
        className="relative flex max-h-[min(32rem,80dvh)] w-full max-w-md flex-col rounded-t-2xl bg-ivory shadow-2xl md:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <h2
            id="note-edit-history-title"
            className="font-display text-lg font-semibold"
          >
            Edit history
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-lg px-3 text-sm text-cocoa-soft hover:bg-cream"
          >
            Close
          </button>
        </div>
        <div className="space-y-3 overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div>
            <p className="text-xs text-cocoa-soft">
              {format(new Date(currentAt), 'HH:mm')} · Current
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm">{currentText}</p>
          </div>
          {previous.map(({ version, index }) => (
            <div key={`${version.at}-${index}`} className="border-t border-line pt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-cocoa-soft">
                  {format(new Date(version.at), 'HH:mm')}
                </p>
                <button
                  type="button"
                  onClick={() => void onDeleteVersion(index)}
                  className="text-xs font-medium text-overdue hover:underline"
                >
                  Delete
                </button>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-cocoa-soft">
                {version.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
