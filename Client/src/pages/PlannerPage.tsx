import { useAuth } from '@clerk/clerk-react'
import { useCallback, useEffect, useState } from 'react'
import { isClerkConfigured } from '../lib/clerk'
import {
  tripsApi,
  type CreateTripPayload,
  type Trip,
} from '../lib/tripsApi'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD']
const INTEREST_OPTIONS = [
  'food',
  'culture',
  'nature',
  'nightlife',
  'adventure',
  'shopping',
  'history',
  'relaxation',
]

const inputClass =
  'rounded border border-fg/20 bg-bg px-3 py-2 text-fg outline-none focus:border-fg/40'
const labelClass = 'flex flex-col gap-1'
const labelText = 'text-sm font-medium text-fg/70'

type StopDraft = {
  key: string
  city: string
  country: string
}

function emptyStop(orderHint = 0): StopDraft {
  return { key: `new-${Date.now()}-${orderHint}`, city: '', country: '' }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function toDateInputValue(iso: string) {
  return iso.slice(0, 10)
}

export default function PlannerPage() {
  if (!isClerkConfigured) {
    return (
      <div className="mx-auto max-w-2xl py-4">
        <h1 className="text-2xl font-bold">Planner</h1>
        <p className="mt-2 text-fg/70">
          Configure <code className="text-sm">VITE_CLERK_PUBLISHABLE_KEY</code> to create and
          manage trips.
        </p>
      </div>
    )
  }
  return <ClerkPlannerPage />
}

function ClerkPlannerPage() {
  const { getToken, isLoaded } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [totalBudget, setTotalBudget] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [interests, setInterests] = useState<string[]>([])
  const [stops, setStops] = useState<StopDraft[]>([emptyStop(0)])

  const loadTrips = useCallback(async () => {
    setError('')
    try {
      const token = await getToken()
      const { trips: list } = await tripsApi.list(token)
      setTrips(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trips')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    if (!isLoaded) return
    loadTrips()
  }, [isLoaded, loadTrips])

  function resetForm() {
    setTitle('')
    setStartDate('')
    setEndDate('')
    setTotalBudget('')
    setCurrency('USD')
    setInterests([])
    setStops([emptyStop(0)])
  }

  function toggleInterest(value: string) {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value],
    )
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    const payload: CreateTripPayload = {
      title: title.trim(),
      startDate,
      endDate,
      totalBudget: Number(totalBudget),
      currency,
      interests,
      status: 'draft',
      stops: stops
        .filter((s) => s.city.trim())
        .map((s, idx) => ({
          city: s.city.trim(),
          country: s.country.trim() || undefined,
          order: idx,
        })),
    }

    try {
      const token = await getToken()
      const { trip } = await tripsApi.create(token, payload)
      setTrips((prev) => [...prev, trip].sort((a, b) => a.startDate.localeCompare(b.startDate)))
      setExpandedId(trip.id)
      setShowForm(false)
      resetForm()
      setMessage('Trip created.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this trip?')) return
    setError('')
    try {
      const token = await getToken()
      await tripsApi.remove(token, id)
      setTrips((prev) => prev.filter((t) => t.id !== id))
      if (expandedId === id) setExpandedId(null)
      setMessage('Trip deleted.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip')
    }
  }

  async function handleAddStop(tripId: string, city: string, country: string) {
    if (!city.trim()) return
    setError('')
    try {
      const token = await getToken()
      const { stop } = await tripsApi.addStop(token, tripId, {
        city: city.trim(),
        country: country.trim() || undefined,
      })
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? { ...t, stops: [...t.stops, stop].sort((a, b) => a.order - b.order) }
            : t,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stop')
    }
  }

  async function handleRemoveStop(tripId: string, stopId: string) {
    setError('')
    try {
      const token = await getToken()
      await tripsApi.removeStop(token, tripId, stopId)
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId ? { ...t, stops: t.stops.filter((s) => s.id !== stopId) } : t,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove stop')
    }
  }

  async function moveStop(trip: Trip, stopId: string, direction: -1 | 1) {
    const sorted = [...trip.stops].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((s) => s.id === stopId)
    const swapIdx = idx + direction
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return

    const reordered = [...sorted]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]
    const payload = reordered.map((s, order) => ({ id: s.id, order }))

    setError('')
    try {
      const token = await getToken()
      const { trip: updated } = await tripsApi.reorderStops(token, trip.id, payload)
      setTrips((prev) => prev.map((t) => (t.id === trip.id ? updated : t)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder stops')
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fg/20 border-t-fg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Planner</h1>
          <p className="mt-1 text-sm text-fg/70">
            Create trips and arrange multi-city stops.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v)
            setMessage('')
            setError('')
          }}
          className="shrink-0 rounded bg-fg px-4 py-2 text-sm font-medium text-bg transition hover:opacity-90"
        >
          {showForm ? 'Cancel' : 'New trip'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && !error && <p className="text-sm text-fg/70">{message}</p>}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-4 border border-fg/15 bg-fg/[0.03] p-4"
        >
          <h2 className="text-lg font-semibold">Create trip</h2>

          <label className={labelClass}>
            <span className={labelText}>Title</span>
            <input
              className={inputClass}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summer in Europe"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span className={labelText}>Start date</span>
              <input
                type="date"
                className={inputClass}
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className={labelClass}>
              <span className={labelText}>End date</span>
              <input
                type="date"
                className={inputClass}
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span className={labelText}>Total budget</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                required
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
              />
            </label>
            <label className={labelClass}>
              <span className={labelText}>Currency</span>
              <select
                className={inputClass}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset>
            <legend className={`mb-2 ${labelText}`}>Interests</legend>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((opt) => {
                const active = interests.includes(opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleInterest(opt)}
                    className={`rounded border px-3 py-1 text-sm capitalize transition ${
                      active
                        ? 'border-fg bg-fg text-bg'
                        : 'border-fg/20 text-fg/80 hover:border-fg/40'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-fg/70">Stops</h3>
              <button
                type="button"
                className="text-sm text-fg/70 underline-offset-2 hover:underline"
                onClick={() => setStops((prev) => [...prev, emptyStop(prev.length)])}
              >
                Add stop
              </button>
            </div>
            {stops.map((stop, idx) => (
              <div key={stop.key} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  className={inputClass}
                  placeholder="City"
                  value={stop.city}
                  onChange={(e) =>
                    setStops((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, city: e.target.value } : s)),
                    )
                  }
                />
                <input
                  className={inputClass}
                  placeholder="Country (optional)"
                  value={stop.country}
                  onChange={(e) =>
                    setStops((prev) =>
                      prev.map((s, i) => (i === idx ? { ...s, country: e.target.value } : s)),
                    )
                  }
                />
                <button
                  type="button"
                  className="rounded border border-fg/20 px-3 py-2 text-sm text-fg/70 hover:border-fg/40"
                  onClick={() => setStops((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={stops.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded bg-fg px-4 py-2 font-medium text-bg transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create trip'}
          </button>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your trips</h2>
        {trips.length === 0 ? (
          <p className="text-fg/70">No trips yet. Create one to get started.</p>
        ) : (
          <ul className="divide-y divide-fg/10 border border-fg/15">
            {trips.map((trip) => {
              const open = expandedId === trip.id
              return (
                <li key={trip.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setExpandedId(open ? null : trip.id)}
                    >
                      <div className="font-medium">{trip.title}</div>
                      <div className="mt-0.5 text-sm text-fg/60">
                        {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                        {' · '}
                        {trip.totalBudget} {trip.currency}
                        {' · '}
                        <span className="capitalize">{trip.status}</span>
                        {' · '}
                        {trip.stops.length} stop{trip.stops.length === 1 ? '' : 's'}
                      </div>
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded border border-fg/20 px-3 py-1.5 text-sm text-fg/80 hover:border-fg/40"
                        onClick={() => setExpandedId(open ? null : trip.id)}
                      >
                        {open ? 'Hide' : 'Details'}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-fg/20 px-3 py-1.5 text-sm text-fg/80 hover:border-red-500/50 hover:text-red-600"
                        onClick={() => handleDelete(trip.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {open && (
                    <TripDetail
                      trip={trip}
                      onAddStop={handleAddStop}
                      onRemoveStop={handleRemoveStop}
                      onMoveStop={moveStop}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function TripDetail({
  trip,
  onAddStop,
  onRemoveStop,
  onMoveStop,
}: {
  trip: Trip
  onAddStop: (tripId: string, city: string, country: string) => Promise<void>
  onRemoveStop: (tripId: string, stopId: string) => Promise<void>
  onMoveStop: (trip: Trip, stopId: string, direction: -1 | 1) => Promise<void>
}) {
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [adding, setAdding] = useState(false)

  const sorted = [...trip.stops].sort((a, b) => a.order - b.order)

  async function submitStop(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    try {
      await onAddStop(trip.id, city, country)
      setCity('')
      setCountry('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4 border-t border-fg/10 bg-fg/[0.02] px-4 py-4">
      {trip.interests.length > 0 && (
        <p className="text-sm text-fg/70">
          Interests:{' '}
          <span className="capitalize text-fg">{trip.interests.join(', ')}</span>
        </p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-fg/70">Itinerary stops</h3>
        {sorted.length === 0 ? (
          <p className="text-sm text-fg/60">No stops yet.</p>
        ) : (
          <ol className="space-y-2">
            {sorted.map((stop, idx) => (
              <li
                key={stop.id}
                className="flex flex-wrap items-center justify-between gap-2 border border-fg/10 px-3 py-2"
              >
                <div>
                  <span className="mr-2 text-xs text-fg/50">{idx + 1}.</span>
                  <span className="font-medium">{stop.city}</span>
                  {stop.country && (
                    <span className="text-fg/60">, {stop.country}</span>
                  )}
                  {(stop.arrivalDate || stop.departureDate) && (
                    <div className="mt-0.5 text-xs text-fg/50">
                      {stop.arrivalDate && `Arr ${toDateInputValue(stop.arrivalDate)}`}
                      {stop.arrivalDate && stop.departureDate && ' · '}
                      {stop.departureDate && `Dep ${toDateInputValue(stop.departureDate)}`}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded border border-fg/15 px-2 py-1 text-xs disabled:opacity-30"
                    disabled={idx === 0}
                    onClick={() => onMoveStop(trip, stop.id, -1)}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="rounded border border-fg/15 px-2 py-1 text-xs disabled:opacity-30"
                    disabled={idx === sorted.length - 1}
                    onClick={() => onMoveStop(trip, stop.id, 1)}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className="rounded border border-fg/15 px-2 py-1 text-xs text-fg/70 hover:border-red-500/40"
                    onClick={() => onRemoveStop(trip.id, stop.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <form onSubmit={submitStop} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className={inputClass}
          placeholder="Add city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
        />
        <input
          className={inputClass}
          placeholder="Country (optional)"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
        <button
          type="submit"
          disabled={adding}
          className="rounded bg-fg px-3 py-2 text-sm font-medium text-bg disabled:opacity-50"
        >
          {adding ? 'Adding…' : 'Add stop'}
        </button>
      </form>
    </div>
  )
}
