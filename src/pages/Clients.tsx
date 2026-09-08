import { useState } from 'react'
import { AddClientPanel } from '../components/AddClientPanel'
import { AppPage } from '../components/AppPage'
import { ClientTable } from '../components/ClientTable'
import { PageHeader } from '../components/PageHeader'
import { RecallCard } from '../components/RecallCard'
import { useClients } from '../hooks/useClients'
import { resumeBookEditId, shouldResumeBookAdd } from '../lib/bookDraft'
import { paths } from '../lib/routes'
import { formatRecall, recallDate } from '../lib/schedule'

export function Clients() {
  const { clients, ready } = useClients()
  const [adding, setAdding] = useState(() => shouldResumeBookAdd(paths.clients))
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(() =>
    resumeBookEditId(paths.clients),
  )

  const viewing = clients.find((client) => client.id === viewingId) ?? null
  const editing = clients.find((client) => client.id === editingId) ?? null

  if (viewing) {
    return (
      <AppPage>
        <PageHeader
          title={viewing.clientName}
          subtitle={formatRecall(recallDate(viewing))}
          titleClassName="text-blush-dark"
          onBack={() => setViewingId(null)}
          backLabel="Back to clients"
        />

        <RecallCard
          client={viewing}
          onEdit={(client) => setEditingId(client.id)}
        />

        {editing ? (
          <AddClientPanel
            client={editing}
            onClose={() => setEditingId(null)}
          />
        ) : null}
      </AppPage>
    )
  }

  return (
    <AppPage wide>
      <PageHeader title="Clients" onAdd={() => setAdding(true)} />

      <ClientTable
        clients={clients}
        ready={ready}
        onAdd={() => setAdding(true)}
        onUpdate={(client) => setViewingId(client.id)}
      />

      {adding ? <AddClientPanel onClose={() => setAdding(false)} /> : null}
    </AppPage>
  )
}
