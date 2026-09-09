import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useClients } from '../hooks/useClients'
import { importParsedBook } from '../lib/bookBackup'
import { buildBookBackup } from '../lib/bookShape'
import {
  readLegacyCatalog,
  readLegacyDeviceClients,
  readLegacySalonName,
} from '../lib/legacyBook'

export function ImportDeviceBook() {
  const { user } = useAuth()
  const { clients, ready } = useClients()
  const [legacyCount, setLegacyCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (user?.role !== 'owner') return
    void readLegacyDeviceClients().then((rows) => setLegacyCount(rows.length))
  }, [user?.role])

  if (!ready || dismissed || user?.role !== 'owner') return null
  if (clients.length > 0 || legacyCount === 0) return null

  async function onImport() {
    setBusy(true)
    setNote(null)
    try {
      const backup = buildBookBackup({
        salonName: readLegacySalonName(),
        clients: await readLegacyDeviceClients(),
        catalog: readLegacyCatalog() ?? undefined,
      })
      const result = await importParsedBook(backup)
      setNote(result.error ?? 'This device’s client list has been added to the salon workspace.')
      if (!result.error) setDismissed(true)
    } catch (error) {
      setNote(error instanceof Error ? error.message : 'The saved client list could not be imported. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mb-6 rounded-2xl bg-rose-mist/50 px-4 py-3 ring-1 ring-line">
      <p className="text-sm font-medium">Import this device’s client list</p>
      <p className="mt-1 text-sm text-cocoa-soft">
        This browser still has {legacyCount} client
        {legacyCount === 1 ? '' : 's'} saved in an older version of NewRecall. The
        shared salon workspace is currently empty.
      </p>
      {note ? <p className="mt-2 text-sm text-cocoa-soft">{note}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-blush px-3 py-2 text-sm font-semibold text-ivory hover:bg-blush-dark disabled:opacity-40"
          disabled={busy}
          onClick={() => void onImport()}
        >
          {busy ? 'Importing client list…' : 'Import client list'}
        </button>
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-sm font-medium text-cocoa-soft hover:bg-cream"
          onClick={() => setDismissed(true)}
        >
          Not now
        </button>
      </div>
    </section>
  )
}
