import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { AppPage } from '../components/AppPage'
import { useServiceCatalog } from '../hooks/useServiceCatalog'
import { peekBookDraft } from '../lib/bookDraft'
import { addServiceType } from '../lib/serviceCatalog'
import { paths } from '../lib/routes'

export function ServiceTypes() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fromBook = params.get('from') === 'book'
  const { types } = useServiceCatalog()
  const [adding, setAdding] = useState(fromBook)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function goBack() {
    if (fromBook) {
      navigate(peekBookDraft()?.returnTo ?? paths.clients)
      return
    }
    navigate(paths.settings)
  }

  async function onAdd(event: FormEvent) {
    event.preventDefault()
    const result = await addServiceType(name)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setName('')
    setError('')
    setAdding(false)
    navigate(
      fromBook
        ? `${paths.serviceType(result.id)}?from=book`
        : paths.serviceType(result.id),
    )
  }

  return (
    <AppPage>
      <PageHeader
        title="Service types"
        onBack={goBack}
        backLabel={fromBook ? 'Back to the book' : 'Back to settings'}
        onAdd={() => {
          setAdding(true)
          setError('')
        }}
        addLabel="Add type"
      />

      {fromBook ? (
        <p className="mb-4 rounded-2xl bg-rose-mist/50 px-4 py-3 text-sm text-cocoa">
          Add the type and service, then return to the client form.
        </p>
      ) : null}

      <div className="space-y-3">
        {adding ? (
          <form
            onSubmit={(event) => void onAdd(event)}
            className="rounded-2xl bg-ivory p-4 ring-1 ring-line"
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium">
                New service type
              </span>
              <input
                autoFocus
                className={inputClass}
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setError('')
                }}
                placeholder="e.g. Braids"
              />
            </label>
            {error ? (
              <p className="mt-2 text-sm text-overdue">{error}</p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-blush px-3 py-2 text-sm font-semibold text-ivory hover:bg-blush-dark"
              >
                Save type
              </button>
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm font-medium text-cocoa-soft hover:bg-cream"
                onClick={() => {
                  setAdding(false)
                  setName('')
                  setError('')
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {types.length === 0 ? (
          <p className="rounded-2xl bg-ivory p-4 text-sm text-cocoa-soft ring-1 ring-line">
            No service types yet. Add one to start listing services.
          </p>
        ) : (
          types.map((type) => (
            <Link
              key={type.id}
              to={
                fromBook
                  ? `${paths.serviceType(type.id)}?from=book`
                  : paths.serviceType(type.id)
              }
              className="flex items-center justify-between gap-3 rounded-2xl bg-ivory p-4 ring-1 ring-line"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{type.name}</span>
                <span className="mt-0.5 block text-sm text-cocoa-soft">
                  {type.services.length === 0
                    ? 'No services yet'
                    : type.services.length === 1
                      ? '1 service'
                      : `${type.services.length} services`}
                </span>
              </span>
              <Chevron />
            </Link>
          ))
        )}
      </div>
    </AppPage>
  )
}

function Chevron() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-4 w-4 shrink-0 text-cocoa-soft"
      aria-hidden="true"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M6 4.5 10.5 8 6 11.5"
      />
    </svg>
  )
}

const inputClass =
  'w-full min-w-0 rounded-lg border border-line bg-ivory px-3 py-2.5 text-base outline-none focus:border-blush md:text-sm'
