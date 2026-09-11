import { PageHeader } from '../components/PageHeader'
import { AppPage } from '../components/AppPage'
import { PeriodCard } from '../components/PeriodCard'
import { monthPreviewLabel } from '../lib/labels'
import { useClients } from '../hooks/useClients'
import { paths } from '../lib/routes'
import { futureRecallMonthSummaries } from '../lib/schedule'

export function CalendarOutlook() {
  const { clients } = useClients()
  const months = futureRecallMonthSummaries(clients)

  return (
    <AppPage wide>
      <PageHeader title="Calendar" />

      {months.length === 0 ? (
        <p className="rounded-2xl bg-ivory px-4 py-8 text-sm text-cocoa-soft ring-1 ring-line">
          No upcoming follow-ups.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {months.map((month) => (
            <PeriodCard
              key={month.label}
              eyebrow={monthPreviewLabel(month.offset)}
              title={month.label}
              total={month.total}
              empty="No follow-ups this month."
              rows={month.days.map((day) => ({
                key: `${month.label}-${day.dayOffset}`,
                to: paths.calendarDay(day.dayOffset),
                label: day.label,
                total: day.total,
              }))}
            />
          ))}
        </div>
      )}
    </AppPage>
  )
}
