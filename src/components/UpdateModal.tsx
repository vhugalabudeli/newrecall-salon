import { useEffect, useState } from 'react'
import { guestSubtitle, clientServiceType } from '../lib/labels'
import { serviceTypeLabel } from '../lib/serviceCatalog'
import { latestMovement } from '../lib/notes'
import type { Client } from '../types'
import { AddNoteModal } from './AddNoteModal'
import { ClientStatusEditors, NoteTimeline } from './ClientUpdateFields'

type UpdateModalProps = {
  client: Client
  onClose: () => void
  onEdit?: (client: Client) => void
}

export function UpdateModal({ client, onClose, onEdit }: UpdateModalProps) {
  const [addingNote, setAddingNote] = useState(false)
  const guest = guestSubtitle(client)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (addingNote) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, addingNote])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-cocoa/30"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex h-[100dvh] w-full max-w-lg flex-col rounded-none bg-ivory shadow-2xl md:h-auto md:max-h-[80vh] md:rounded-2xl">
        <div className="border-b border-line px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-blush-dark uppercase">
                Update
              </p>
              <h2 className="font-display text-xl font-semibold">
                {client.clientName}
              </h2>
              <p className="text-sm text-cocoa-soft">
                {serviceTypeLabel(clientServiceType(client))} · {client.service}
                {guest ? ` · ${guest}` : null}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAddingNote(true)}
                className="rounded-lg bg-blush px-3 py-1.5 text-sm font-semibold text-ivory hover:bg-blush-dark"
              >
                Add note
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-2 py-1 text-lg leading-none text-cocoa-soft hover:bg-cream"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
          {onEdit ? (
            <button
              type="button"
              onClick={() => onEdit(client)}
              className="mt-2 rounded-lg bg-blush px-2.5 py-1.5 text-sm font-semibold text-ivory hover:bg-blush-dark"
            >
              Edit client details
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 px-5 py-3">
          <ClientStatusEditors client={client} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <NoteTimeline client={client} />
        </div>
      </div>

      {addingNote ? (
        <AddNoteModal
          client={client}
          attachTo={latestMovement(client.notes)}
          onClose={() => setAddingNote(false)}
        />
      ) : null}
    </div>
  )
}
