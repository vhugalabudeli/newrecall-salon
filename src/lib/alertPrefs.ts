export type AlertPrefs = {
  dueToday: boolean
  overdue: boolean
}

const KEY = 'salon-app-alert-prefs'
const EVENT = 'alert-prefs-changed'

export const DEFAULT_ALERT_PREFS: AlertPrefs = {
  dueToday: false,
  overdue: false,
}

export function readAlertPrefs(): AlertPrefs {
  const stored = localStorage.getItem(KEY)
  if (!stored) return { ...DEFAULT_ALERT_PREFS }
  try {
    const parsed = JSON.parse(stored) as Partial<AlertPrefs>
    return {
      dueToday: parsed.dueToday === true,
      overdue: parsed.overdue === true,
    }
  } catch {
    return { ...DEFAULT_ALERT_PREFS }
  }
}

export function writeAlertPrefs(prefs: AlertPrefs): AlertPrefs {
  const next = {
    dueToday: prefs.dueToday === true,
    overdue: prefs.overdue === true,
  }
  localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new Event(EVENT))
  return next
}

export function alertPrefsEventName(): string {
  return EVENT
}
