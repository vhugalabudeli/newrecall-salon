import { useEffect, useState } from 'react'

export type LiveAlertSection = { title: string; body: string }

export type LiveAlert = { sections: LiveAlertSection[] }

const EVENT = 'salon-live-alert'

type LiveAlertDetail = { alert: LiveAlert; durationMs: number }

export function showLiveAlert(alert: LiveAlert, durationMs = 8000) {
  window.dispatchEvent(
    new CustomEvent<LiveAlertDetail>(EVENT, {
      detail: { alert, durationMs },
    }),
  )
}

export function useLiveAlert() {
  const [alert, setAlert] = useState<LiveAlert | null>(null)

  useEffect(() => {
    let hideTimer = 0
    function onShow(event: Event) {
      const { alert: next, durationMs } = (event as CustomEvent<LiveAlertDetail>)
        .detail
      setAlert(next)
      window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => setAlert(null), durationMs)
    }
    window.addEventListener(EVENT, onShow)
    return () => {
      window.removeEventListener(EVENT, onShow)
      window.clearTimeout(hideTimer)
    }
  }, [])

  return alert
}
