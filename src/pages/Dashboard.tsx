import { useState } from 'react'
import { AddClientPanel } from '../components/AddClientPanel'
import { AppPage } from '../components/AppPage'
import { NearDayCards } from '../components/NearDayCards'
import { PageHeader } from '../components/PageHeader'
import { RecallCard } from '../components/RecallCard'
import { ScheduleCards } from '../components/ScheduleCards'
import { useClients } from '../hooks/useClients'
import { resumeBookEditId, shouldResumeBookAdd } from '../lib/bookDraft'
import { paths } from '../lib/routes'
import { formatRecall, recallDate } from '../lib/schedule'

export function Dashboard() {
  const { clients } = useClients()
  const [adding, setAdding] = useState(() => shouldResumeBookAdd(paths.dashboard))
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(() =>
    resumeBookEditId(paths.dashboard),
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
          backLabel="Back to upcoming recalls"
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
    <AppPage>
      <PageHeader
        title="Upcoming recalls"
        titleClassName="text-blush-dark"
        onAdd={() => setAdding(true)}
      />

      <div className="space-y-8">
        <NearDayCards
          clients={clients}
          onSelectClient={(client) => setViewingId(client.id)}
        />
        <ScheduleCards />
      </div>

      {adding ? <AddClientPanel onClose={() => setAdding(false)} /> : null}
    </AppPage>
  )
}
