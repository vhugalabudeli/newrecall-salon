import { useEffect, useState } from 'react'
import {
  alertPrefsEventName,
  readAlertPrefs,
  writeAlertPrefs,
  type AlertPrefs,
} from '../lib/alertPrefs'

export function useAlertPrefs() {
  const [prefs, setPrefsState] = useState(readAlertPrefs)

  useEffect(() => {
    function sync() {
      setPrefsState(readAlertPrefs())
    }

    window.addEventListener(alertPrefsEventName(), sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(alertPrefsEventName(), sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  function setPrefs(next: AlertPrefs) {
    setPrefsState(writeAlertPrefs(next))
  }

  return { prefs, setPrefs }
}
