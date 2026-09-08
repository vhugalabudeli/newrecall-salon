import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { fieldActionClassName } from './ClientUpdateFields'

export function SwUpdateHost() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const updateRef = useRef<((reload?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true)
      },
      onRegisteredSW(_url, registration) {
        if (registration?.waiting) setNeedRefresh(true)
      },
    })
    updateRef.current = updateSW
  }, [])

  if (!needRefresh) return null

  return (
    <div
      className="absolute inset-x-3 z-[310] bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.75rem))] md:bottom-auto md:top-[max(0.5rem,env(safe-area-inset-top,0px))]"
      role="status"
    >
      <div className="flex items-center justify-between gap-3 rounded-[1.25rem] bg-ivory px-3 py-2.5 shadow-lg ring-1 ring-line">
        <p className="text-sm text-cocoa">Update available</p>
        <button
          type="button"
          className={fieldActionClassName}
          onClick={() => {
            void updateRef.current?.(true)
          }}
        >
          Reload
        </button>
      </div>
    </div>
  )
}
