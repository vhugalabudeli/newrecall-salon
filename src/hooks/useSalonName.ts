import { useEffect, useState } from 'react'
import { readSalonName, SALON_NAME_CHANGED, writeSalonName } from '../lib/settings'
import { useAuth } from './useAuth'

export function useSalonName() {
  const { user } = useAuth()
  const [salonName, setSalonNameState] = useState(readSalonName)

  useEffect(() => {
    setSalonNameState(user?.salonName || readSalonName())
  }, [user?.salonName])

  useEffect(() => {
    function sync() {
      setSalonNameState(readSalonName())
    }
    window.addEventListener(SALON_NAME_CHANGED, sync)
    return () => window.removeEventListener(SALON_NAME_CHANGED, sync)
  }, [])

  async function setSalonName(name: string) {
    const next = await writeSalonName(name)
    setSalonNameState(next)
  }

  return { salonName, setSalonName }
}
