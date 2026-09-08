import { useEffect, useState } from 'react'

export function useVisibleViewportHeight() {
  const [height, setHeight] = useState(
    () => window.visualViewport?.height ?? window.innerHeight,
  )

  useEffect(() => {
    const viewport = window.visualViewport

    function update() {
      setHeight(viewport?.height ?? window.innerHeight)
    }

    update()
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)

    return () => {
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return height
}
