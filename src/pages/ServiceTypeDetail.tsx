import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { AppPage } from '../components/AppPage'
import { SelectTrigger } from '../components/SelectSheet'
import { useClients } from '../hooks/useClients'
import { useServiceCatalog } from '../hooks/useServiceCatalog'
import { peekBookDraft, saveBookDraft } from '../lib/bookDraft'
import {
  clientServiceType,
  DEFAULT_LIFESPAN_WEEKS,
  lifespanWeekOptions,
} from '../lib/labels'
import { formatLifespan } from '../lib/schedule'
import {
  addService,
  deleteService,
  deleteServiceType,
  renameServiceType,
  updateService,
  isGeneralService,
  type CatalogService,
} from '../lib/serviceCatalog'
import { paths } from '../lib/routes'

export function ServiceTypeDetail() {
  const navigate = useNavigate()
  const { typeId = '' } = useParams()
  const [params] = useSearchParams()
  const fromBook = params.get('from') === 'book'
  const id = decodeURIComponent(typeId)
  const catalog = useServiceCatalog()
  const type = catalog.types.find((item) => item.id === id) ?? null
  const { clients } = useClients()
  const inUse = clients.some((client) => clientServiceType(client) === id)
  const [nameDraft, setNameDraft] = useState(type?.name ?? '')
  const [adding, setAdding] = useState(fromBook)
  const [serviceName, setServiceName] = useState('')
  const [weeks, setWeeks] = useState(DEFAULT_LIFESPAN_WEEKS)
  const [error, setError] = useState('')
  const [typeError, setTypeError] = useState('')
  const [updating, setUpdating] = useState(false)
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null)
  const [serviceDraftName, setServiceDraftName] = useState('')
  const [serviceDraftWeeks, setServiceDraftWeeks] = useState(DEFAULT_LIFESPAN_WEEKS)
  const [serviceEditError, setServiceEditError] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNameDraft(type?.name ?? '')
      setAdding(fromBook)
      setError('')
      setTypeError('')
      setUpdating(false)
      setEditingServiceId(null)
      setServiceEditError('')
    }, 0)
    return () => window.clearTimeout(timer)
  }, [fromBook, id, type?.name])

  useEffect(() => {
    if (!updating) return
    nameInputRef.current?.focus()
    nameInputRef.current?.select()
  }, [updating])

  function typesPath() {
    return fromBook ? `${paths.serviceTypes}?from=book` : paths.serviceTypes
  }

  function goBack() {
    navigate(typesPath())
  }

  function startUpdate() {
    if (!type) return
    setAdding(false)
    setEditingServiceId(null)
    setNameDraft(type.name)
    setTypeError('')
    setUpdating(true)
  }

  function startServiceUpdate(service: CatalogService) {
    setAdding(false)
    setUpdating(false)
    setEditingServiceId(service.id)
    setServiceDraftName(service.name)
    setServiceDraftWeeks(service.lifespanWeeks)
    setServiceEditError('')
  }

  function cancelServiceUpdate() {
    setEditingServiceId(null)
    setServiceEditError('')
  }

  async function saveServiceUpdate() {
    if (!type || !editingServiceId) return
    const result = await updateService(type.id, editingServiceId, {
      name: serviceDraftName,
      lifespanWeeks: serviceDraftWeeks,
    })
    setServiceEditError(result.error ?? '')
    if (result.error) return
    setEditingServiceId(null)
  }

  async function onDeleteService(service: CatalogService) {
    if (!type) return
    const confirmed = window.confirm(
      `Remove ${service.name} from ${type.name}?`,
    )
    if (!confirmed) return
    await deleteService(type.id, service.id)
    if (editingServiceId === service.id) cancelServiceUpdate()
  }

  function cancelUpdate() {
    setNameDraft(type?.name ?? '')
    setTypeError('')
    setUpdating(false)
  }

  async function saveTypeName() {
    if (!type) return
    const result = await renameServiceType(type.id, nameDraft)
    setTypeError(result.error ?? '')
    if (result.error) return
    setNameDraft(nameDraft.trim())
    setUpdating(false)
  }

  async function onAddService(event: FormEvent) {
    event.preventDefault()
    if (!type) return
    const result = await addService(type.id, serviceName, weeks)
    if ('error' in result) {
      setError(result.error)
      return
    }
    if (fromBook) {
      const pending = peekBookDraft()
      if (pending) {
        saveBookDraft({
          ...pending,
          draft: {
            ...pending.draft,
            serviceType: type.id,
            service: result.name,
            lifespanWeeks: result.lifespanWeeks,
          },
        })
        navigate(pending.returnTo)
        return
      }
    }
    setServiceName('')
    setWeeks(DEFAULT_LIFESPAN_WEEKS)
    setError('')
    setAdding(false)
  }

  async function onDeleteType() {
    if (!type) return
    if (inUse) {
      setTypeError('This service type is assigned to clients. Update those client records before removing it.')
      return
    }
    const confirmed = window.confirm(`Remove ${type.name} and its services?`)
    if (!confirmed) return
    const result = await deleteServiceType(type.id)
    if (result.error) {
      setTypeError(result.error)
      return
    }
    navigate(typesPath())
  }

  if (!type) {
    return (
      <AppPage>
        <PageHeader
          title="Service type"
          onBack={goBack}
          backLabel="Back to service types"
        />
        <p className="rounded-2xl bg-ivory p-4 text-sm text-cocoa-soft ring-1 ring-line">
          This service type is no longer available. Return to Service types to choose another one.
        </p>
      </AppPage>
    )
  }

  return (
    <AppPage>
      <PageHeader
        title={type.name}
        onBack={goBack}
        backLabel="Back to service types"
        actions={
          <>
            <button
              type="button"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-semibold text-blush-dark hover:bg-rose-mist md:h-10 md:px-4"
              onClick={startUpdate}
            >
              Update
            </button>
            <button
              type="button"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-blush px-3 text-sm font-semibold text-ivory hover:bg-blush-dark md:h-10 md:px-4"
              onClick={() => {
                cancelUpdate()
                cancelServiceUpdate()
                setAdding(true)
                setError('')
              }}
            >
              Add service
            </button>
          </>
        }
      />

      {fromBook ? (
        <p className="mb-4 rounded-2xl bg-rose-mist/50 px-4 py-3 text-sm text-cocoa">
          Add the service, then return to the client form.
        </p>
      ) : null}

      <div className="space-y-3">
        {updating ? (
          <section className="rounded-2xl bg-ivory p-4 ring-1 ring-line">
            <p className="text-sm font-medium">Type name</p>
            <input
              ref={nameInputRef}
              className={`${inputClass} mt-2`}
              value={nameDraft}
              aria-label="Type name"
              onChange={(event) => {
                setNameDraft(event.target.value)
                setTypeError('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                    saveTypeName()
                }
                if (event.key === 'Escape') {
                  event.preventDefault()
                  cancelUpdate()
                }
              }}
            />
            {typeError ? (
              <p className="mt-2 text-sm text-overdue">{typeError}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-blush px-3 py-2 text-sm font-semibold text-ivory hover:bg-blush-dark"
                onClick={() => void saveTypeName()}
              >
                Save
              </button>
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm font-medium text-cocoa-soft hover:bg-cream"
                onClick={cancelUpdate}
              >
                Cancel
              </button>
            </div>
            <button
              type="button"
              className="mt-3 text-sm text-overdue hover:underline"
              onClick={() => void onDeleteType()}
            >
              Remove type
            </button>
          </section>
        ) : null}

        {adding ? (
          <form
            onSubmit={(event) => void onAddService(event)}
            className="rounded-2xl bg-ivory p-4 ring-1 ring-line"
          >
            <h2 className="text-sm font-medium">New service</h2>
            <label className="mt-3 block">
              <span className="mb-1 block text-sm font-medium">Name</span>
              <input
                autoFocus
                className={inputClass}
                value={serviceName}
                onChange={(event) => {
                  setServiceName(event.target.value)
                  setError('')
                }}
                placeholder="e.g. Cut"
              />
            </label>
            <div className="mt-3">
              <span className="mb-1 block text-sm font-medium">Usual return time</span>
              <SelectTrigger
                title="Usual return time"
                className={inputClass}
                value={weeks}
                options={lifespanWeekOptions.map((option) => ({
                  value: option,
                  label: formatLifespan(option),
                }))}
                onChange={setWeeks}
              />
            </div>
            {error ? (
              <p className="mt-2 text-sm text-overdue">{error}</p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-blush px-3 py-2 text-sm font-semibold text-ivory hover:bg-blush-dark"
              >
                Save service
              </button>
              {fromBook ? null : (
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-cocoa-soft hover:bg-cream"
                  onClick={() => {
                    setAdding(false)
                    setServiceName('')
                    setError('')
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : null}

        {type.services.length === 0 && !adding ? (
          <p className="rounded-2xl bg-ivory p-4 text-sm text-cocoa-soft ring-1 ring-line">
            No services in {type.name} yet.
          </p>
        ) : (
          type.services.map((service) =>
            editingServiceId === service.id ? (
              <form
                key={service.id}
                onSubmit={(event) => {
                  event.preventDefault()
                  void saveServiceUpdate()
                }}
                className="rounded-2xl bg-ivory p-4 ring-1 ring-line"
              >
                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Name</span>
                  {isGeneralService(service) ? (
                    <p className={`${inputClass} border-transparent bg-cream text-cocoa-soft`}>
                      {service.name}
                    </p>
                  ) : (
                    <input
                      autoFocus
                      className={inputClass}
                      value={serviceDraftName}
                      onChange={(event) => {
                        setServiceDraftName(event.target.value)
                        setServiceEditError('')
                      }}
                    />
                  )}
                </label>
                <div className="mt-3">
                  <span className="mb-1 block text-sm font-medium">Usual return time</span>
                  <SelectTrigger
                    title="Usual return time"
                    className={inputClass}
                    value={serviceDraftWeeks}
                    options={lifespanWeekOptions.map((option) => ({
                      value: option,
                      label: formatLifespan(option),
                    }))}
                    onChange={setServiceDraftWeeks}
                  />
                </div>
                {serviceEditError ? (
                  <p className="mt-2 text-sm text-overdue">{serviceEditError}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-blush px-3 py-2 text-sm font-semibold text-ivory hover:bg-blush-dark"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-cocoa-soft hover:bg-cream"
                    onClick={cancelServiceUpdate}
                  >
                    Cancel
                  </button>
                </div>
                {isGeneralService(service) ? null : (
                  <button
                    type="button"
                    className="mt-3 text-sm text-overdue hover:underline"
                    onClick={() => void onDeleteService(service)}
                  >
                    Remove
                  </button>
                )}
              </form>
            ) : (
              <article
                key={service.id}
                className="rounded-2xl bg-ivory p-4 ring-1 ring-line"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{service.name}</p>
                    <p className="mt-0.5 text-sm text-cocoa-soft">
                      {formatLifespan(service.lifespanWeeks)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-sm font-medium text-blush-dark hover:underline"
                    onClick={() => startServiceUpdate(service)}
                  >
                    Update
                  </button>
                </div>
              </article>
            ),
          )
        )}
      </div>
    </AppPage>
  )
}

const inputClass =
  'box-border w-full min-w-0 max-w-full rounded-lg border border-line bg-ivory px-3 py-2.5 text-base text-cocoa outline-none focus:border-blush md:py-2 md:text-sm'
