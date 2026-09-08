import { useState, type ReactNode } from 'react'
import { useSalonName } from '../hooks/useSalonName'
import {
  clientCallingCode,
  formatClientPhone,
} from '../lib/callingCode'
import { guestSubtitle, clientServiceType } from '../lib/labels'
import { serviceTypeLabel } from '../lib/serviceCatalog'
import { latestMovement } from '../lib/notes'
import {
  callHref,
  DEFAULT_MESSAGE_TEMPLATE,
  fillMessageTemplate,
  smsHref,
  varsForClient,
  whatsappHref,
} from '../lib/messageTemplate'
import {
  daysUntil,
  formatRecall,
  recallDate,
  timeFrameLabel,
} from '../lib/schedule'
import type { Client } from '../types'
import { AddNoteModal } from './AddNoteModal'
import { ClientStatusEditors, NoteTimeline, fieldActionClassName, recallRowClassName } from './ClientUpdateFields'

const labelClassName =
  'text-xs font-bold tracking-wide text-cocoa-soft uppercase'

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className={labelClassName}>{label}</span>
      {children}
    </div>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <div className={recallRowClassName}>{children}</div>
}

type RecallCardProps = {
  client: Client
  onEdit?: (client: Client) => void
}

export function RecallCard({ client, onEdit }: RecallCardProps) {
  const [addingNote, setAddingNote] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const { salonName } = useSalonName()
  const today = new Date()
  const due = recallDate(client)
  const remaining = daysUntil(due, today)
  const overdue = remaining < 0
  const dueNow = remaining <= 0
  const guest = guestSubtitle(client)
  const message = dueNow
    ? fillMessageTemplate(
        DEFAULT_MESSAGE_TEMPLATE,
        varsForClient(client, salonName),
      )
    : ''

  return (
    <>
      <div className="flex flex-col gap-2">
      <Row>
        <Field label="Name">
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0">
              <span className="block truncate font-semibold">
                {client.clientName}
              </span>
              {guest ? (
                <span className="mt-0.5 block truncate text-cocoa-soft">
                  {guest}
                </span>
              ) : null}
            </span>
            {overdue ? (
              <span className="shrink-0 rounded-full bg-rose-mist px-2 py-0.5 text-[11px] font-medium text-overdue">
                {timeFrameLabel(due, today)}
              </span>
            ) : null}
          </span>
        </Field>
      </Row>
      <Row>
        <Field label="Phone">
          <span className="truncate text-cocoa-soft">
            {formatClientPhone(clientCallingCode(client), client.clientPhone)}
          </span>
        </Field>
      </Row>
      <Row>
        <Field label="Service type">
          <span className="text-cocoa-soft">
            {serviceTypeLabel(clientServiceType(client))}
          </span>
        </Field>
      </Row>
      {dueNow ? (
        <>
          <Row>
            <div className="flex items-center justify-between gap-2">
              <p className={labelClassName}>Message</p>
              <button
                type="button"
                aria-expanded={messageOpen}
                onClick={() => setMessageOpen((open) => !open)}
                className="text-sm font-medium text-blush-dark"
              >
                {messageOpen ? 'Hide' : 'Show'}
              </button>
            </div>
            {messageOpen ? (
              <p className="mt-2 whitespace-pre-wrap rounded-xl bg-cream px-3 py-2.5 leading-relaxed text-cocoa ring-1 ring-line">
                {message}
              </p>
            ) : null}
          </Row>
          <Row>
            <Field label="Contact client via">
              <div className="flex flex-wrap items-center gap-2">
                <a href={smsHref(client, message)} className={contactActionClassName}>
                  <SmsMark />
                  SMS
                </a>
                <a
                  href={whatsappHref(client, message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={contactActionClassName}
                >
                  <WhatsAppMark />
                  WhatsApp
                </a>
                <a href={callHref(client)} className={contactActionClassName}>
                  <CallMark />
                  Call
                </a>
              </div>
            </Field>
          </Row>
        </>
      ) : (
        <Row>
          <Field label="Time left">
            <span className="text-cocoa-soft">{timeFrameLabel(due, today)}</span>
          </Field>
        </Row>
      )}
      <Row>
        <Field label="Recall date">
          <span className="text-cocoa-soft">{formatRecall(due)}</span>
        </Field>
      </Row>
      <ClientStatusEditors client={client} />
      <Row>
        <div className="flex items-center justify-between gap-2">
          <p className={labelClassName}>Notes</p>
          <button
            type="button"
            onClick={() => setAddingNote(true)}
            className={fieldActionClassName}
          >
            Add note
          </button>
        </div>
        <div className="mt-2">
          <NoteTimeline client={client} />
        </div>
      </Row>
      {onEdit ? (
        <Row>
          <button
            type="button"
            onClick={() => onEdit(client)}
            className={fieldActionClassName}
          >
            Edit client details
          </button>
        </Row>
      ) : null}
      </div>
      {addingNote ? (
        <AddNoteModal
          client={client}
          attachTo={latestMovement(client.notes)}
          onClose={() => setAddingNote(false)}
        />
      ) : null}
    </>
  )
}

const contactActionClassName =
  'inline-flex items-center gap-1.5 rounded-lg bg-blush px-2.5 py-1.5 text-sm font-semibold text-ivory hover:bg-blush-dark'

function SmsMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 6.5h14A1.5 1.5 0 0 1 20.5 8v7A1.5 1.5 0 0 1 19 16.5H9.5L5 19.5V6.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WhatsAppMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 10a.5.5 0 0 0 1 0v-1a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CallMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
