import { NotificationBanner } from './NotificationBanner'
import { useLiveAlert } from '../lib/liveAlert'

export function LiveAlertHost() {
  const alert = useLiveAlert()
  if (!alert) return null

  return (
    <div
      className="absolute inset-x-3 z-[300] top-[max(0.5rem,env(safe-area-inset-top,0px))]"
      role="status"
      aria-live="polite"
    >
      <div className="shadow-lg">
        <NotificationBanner sections={alert.sections} />
      </div>
    </div>
  )
}
