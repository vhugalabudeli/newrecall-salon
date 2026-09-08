import { useEffect, useState } from 'react'
import {
  CATALOG_CHANGED,
  readCatalog,
  type ServiceCatalog,
} from '../lib/serviceCatalog'

export function useServiceCatalog(): ServiceCatalog {
  const [catalog, setCatalog] = useState(readCatalog)

  useEffect(() => {
    function sync() {
      setCatalog(readCatalog())
    }
    window.addEventListener(CATALOG_CHANGED, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CATALOG_CHANGED, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return catalog
}
