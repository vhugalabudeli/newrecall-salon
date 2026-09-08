import { useEffect, useState } from 'react'
import { readSalonName, writeSalonName } from '../lib/settings'

export function useSalonName() {
  const [salonName, setSalonNameState] = useState(readSalonName)

  useEffect(() => {
    function sync() {
      setSalonNameState(readSalonName())
    }

    window.addEventListener('salon-name-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('salon-name-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  function setSalonName(name: string) {
    setSalonNameState(writeSalonName(name))
  }

  return { salonName, setSalonName }
}
