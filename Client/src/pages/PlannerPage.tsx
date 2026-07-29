import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map, Plus } from 'lucide-react'
import {
  tripsApi,
  type CreateTripPayload,
  type Trip,
} from '../lib/tripsApi'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { TripCard, TripCardSkeleton } from '../components/trips/TripCard'

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
  'rounded-md border border-border bg-surface px-3 py-2 text-fg outline-none focus:border-brand focus:ring-2 focus:ring-ring/30'
const labelClass = 'flex flex-col gap-1.5'
const labelText = 'text-sm font-medium text-muted-fg'

type StopDraft = {
  key: string
  city: string
  country: string
}

function emptyStop(orderHint = 0): StopDraft {
  return { key: `new-${Date.now()}-${orderHint}`, city: '', country: '' }
}

export default function PlannerPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [totalBudget, setTotalBudget] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [interests, setInterests] = useState<string[]>([])
  const [stops, setStops] = useState<StopDraft[]>([emptyStop(0)])

  const loadTrips = useCallback(async () => {
    try {
      const { trips: list } = await tripsApi.list()
      setTrips(list)
    } catch (err) {
      toast({
        title: 'Could not load trips',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'danger',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadTrips()
  }, [loadTrips])

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

    const stopPayload = stops
      .filter((s) => s.city.trim())
      .map((s, idx) => ({
        city: s.city.trim(),
        country: s.country.trim() || undefined,
        order: idx,
      }))

    if (stopPayload.length === 0) {
      toast({
        title: 'Add at least one city',
        description: 'Stops unlock itinerary activities and hotels. Enter a city below.',
        variant: 'danger',
      })
      return
    }

    setSaving(true)

    const payload: CreateTripPayload = {
      title: title.trim(),
      startDate,
      endDate,
      totalBudget: Number(totalBudget),
      currency,
      interests,
      status: 'draft',
      stops: stopPayload,
    }

    try {
      const { trip } = await tripsApi.create(payload)
      toast({ title: 'Trip created', variant: 'success' })
      setShowForm(false)
      resetForm()
      navigate(`/planner/${trip.id}`)
    } catch (err) {
      toast({
        title: 'Could not create trip',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'danger',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Your trips</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Open a trip hub to plan itinerary, budget, and hotels.
          </p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          variant={showForm ? 'secondary' : 'primary'}
        >
          {showForm ? (
            'Cancel'
          ) : (
            <>
              <Plus className="h-4 w-4" aria-hidden />
              New trip
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-4 rounded-lg border border-border bg-muted/40 p-5"
        >
          <h2 className="font-display text-lg font-semibold">Create trip</h2>

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
                    className={`rounded-md border px-3 py-1 text-sm capitalize transition ${
                      active
                        ? 'border-brand bg-brand text-brand-fg'
                        : 'border-border text-muted-fg hover:border-brand/40'
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
              <div>
                <h3 className="text-sm font-medium text-muted-fg">Stops</h3>
                <p className="text-xs text-muted-fg">
                  At least one city is required for itinerary and hotels.
                </p>
              </div>
              <button
                type="button"
                className="text-sm text-muted-fg underline-offset-2 hover:underline"
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
                  required={idx === 0}
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
                  className="rounded-md border border-border px-3 py-2 text-sm text-muted-fg hover:border-brand/40"
                  onClick={() => setStops((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={stops.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : 'Create trip'}
          </Button>
        </form>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <TripCardSkeleton key={i} />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <EmptyState
          icon={<Map className="h-8 w-8" />}
          title="No trips yet"
          description="Create your first multi-city trip to generate an AI draft and build the itinerary."
          action={
            <Button
              size="sm"
              onClick={() => {
                setShowForm(true)
              }}
            >
              New trip
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  )
}
