import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { paths } from '../lib/routes'
import { supabase } from '../lib/supabase'
import { OPEN_WELCOME_EVENT, welcomeCopy } from '../lib/welcome'

export function WelcomeDialog() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const copy = user ? welcomeCopy(user.role, user.salonName) : null

  useEffect(() => {
    if (!user || location.pathname !== paths.dashboard) return
    if (user.welcomeCompletedAt) return
    const timer = window.setTimeout(() => setOpen(true), 0)
    return () => window.clearTimeout(timer)
  }, [location.pathname, user])

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(OPEN_WELCOME_EVENT, show)
    return () => window.removeEventListener(OPEN_WELCOME_EVENT, show)
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function dismiss(destination?: string) {
    if (!user || saving) return
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ welcome_completed_at: new Date().toISOString() })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      setSaveError('The welcome guide could not be dismissed. Please try again.')
      return
    }
    setOpen(false)
    if (destination) navigate(destination)
  }

  if (!user || !copy) return null

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="welcome-title"
      aria-describedby="welcome-description"
      className="fixed inset-0 mt-auto mb-0 max-h-[min(88svh,42rem)] w-full max-w-none overflow-y-auto rounded-t-3xl bg-ivory p-0 text-cocoa shadow-2xl backdrop:bg-cocoa/45 sm:m-auto sm:w-[calc(100%-2rem)] sm:max-w-lg sm:rounded-3xl"
      onCancel={(event) => {
        event.preventDefault()
        void dismiss()
      }}
    >
      <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7">
        <p className="text-xs font-semibold tracking-[0.16em] text-blush-dark">
          {copy.eyebrow}
        </p>
        <h2 id="welcome-title" className="mt-2 font-display text-3xl font-semibold">
          {copy.title}
        </h2>
        <p id="welcome-description" className="mt-3 text-sm leading-6 text-cocoa-soft">
          {copy.body}
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {user.role === 'owner' ? (
            <>
              <button className="rounded-xl bg-blush px-4 py-3 text-sm font-semibold text-ivory" type="button" disabled={saving} onClick={() => void dismiss(paths.clients)}>
                Add first client
              </button>
              <button className="rounded-xl border border-line px-4 py-3 text-sm font-semibold" type="button" disabled={saving} onClick={() => void dismiss(paths.serviceTypes)}>
                Set up services
              </button>
              <button className="rounded-xl border border-line px-4 py-3 text-sm font-semibold" type="button" disabled={saving} onClick={() => void dismiss(`${paths.settings}#staff`)}>
                Invite staff
              </button>
            </>
          ) : (
            <>
              <button className="rounded-xl bg-blush px-4 py-3 text-sm font-semibold text-ivory" type="button" disabled={saving} onClick={() => void dismiss(paths.clients)}>
                View clients
              </button>
              <button className="rounded-xl border border-line px-4 py-3 text-sm font-semibold" type="button" disabled={saving} onClick={() => void dismiss(paths.calendar)}>
                Open calendar
              </button>
            </>
          )}
          <button className="rounded-xl px-4 py-3 text-sm font-medium text-cocoa-soft sm:col-span-2" type="button" disabled={saving} onClick={() => void dismiss()}>
            {saving ? 'Saving…' : user.role === 'owner' ? 'Not now' : 'Got it'}
          </button>
        </div>
        {saveError ? (
          <p className="mt-3 text-sm text-overdue" role="alert">{saveError}</p>
        ) : null}
      </div>
    </dialog>
  )
}
