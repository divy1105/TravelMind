import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BedDouble,
  ListOrdered,
  Sparkles,
  Trash2,
  Wallet,
} from 'lucide-react'
import {
  tripsApi,
  type Activity,
  type BudgetHint,
  type Trip,
} from '../lib/tripsApi'
import { destinationCoverUrl } from '../lib/destinationCover'
import { TripToolNav } from '../components/trips/TripToolNav'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'

const inputClass =
  'rounded-md border border-border bg-surface px-3 py-2 text-fg outline-none focus:border-brand focus:ring-2 focus:ring-ring/30'

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

function formatMoney(value: string | number, currency: string) {
  const n = Number(value)
  if (!Number.isFinite(n)) return `${value} ${currency}`
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${currency}`
}

export default function TripOverviewPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [budgetHint, setBudgetHint] = useState<BudgetHint | null>(null)
  const [remaining, setRemaining] = useState<string | null>(null)
  const [allocated, setAllocated] = useState<string | null>(null)

  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [adding, setAdding] = useState(false)

  const loadTrip = useCallback(async () => {
    if (!tripId) return
    try {
      const [{ trip: next }, budget] = await Promise.all([
        tripsApi.get(tripId),
        tripsApi.getBudget(tripId).catch(() => null),
      ])
      setTrip({ ...next, stops: next.stops ?? [] })
      setRemaining(budget?.remaining ?? null)
      setAllocated(budget?.allocated ?? null)
    } catch (err) {
      setTrip(null)
      toast({
        title: 'Could not load trip',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'danger',
      })
    } finally {
      setLoading(false)
    }
  }, [tripId, toast])

  useEffect(() => {
    void loadTrip()
  }, [loadTrip])

  async function handleDelete() {
    if (!trip || !window.confirm('Delete this trip?')) return
    try {
      await tripsApi.remove(trip.id)
      toast({ title: 'Trip deleted', variant: 'success' })
      navigate('/planner')
    } catch (err) {
      toast({
        title: 'Could not delete trip',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'danger',
      })
    }
  }

  async function handleAddStop(e: React.FormEvent) {
    e.preventDefault()
    if (!trip || !city.trim()) return
    setAdding(true)
    try {
      const { stop } = await tripsApi.addStop(trip.id, {
        city: city.trim(),
        country: country.trim() || undefined,
      })
      setTrip((prev) =>
        prev
          ? {
              ...prev,
              stops: [
                ...(prev.stops ?? []),
                {
                  ...stop,
                  activities: stop.activities ?? [],
                  hotels: stop.hotels ?? [],
                },
              ].sort((a, b) => a.order - b.order),
            }
          : prev,
      )
      setCity('')
      setCountry('')
      toast({ title: 'Stop added', variant: 'success' })
    } catch (err) {
      toast({
        title: 'Could not add stop',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'danger',
      })
    } finally {
      setAdding(false)
    }
  }

  async function handleRemoveStop(stopId: string) {
    if (!trip) return
    try {
      await tripsApi.removeStop(trip.id, stopId)
      setTrip((prev) =>
        prev ? { ...prev, stops: prev.stops.filter((s) => s.id !== stopId) } : prev,
      )
      toast({ title: 'Stop removed', variant: 'success' })
    } catch (err) {
      toast({
        title: 'Could not remove stop',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'danger',
      })
    }
  }

  async function moveStop(stopId: string, direction: -1 | 1) {
    if (!trip) return
    const sorted = [...(trip.stops ?? [])].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((s) => s.id === stopId)
    const swapIdx = idx + direction
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return

    const reordered = [...sorted]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]
    const payload = reordered.map((s, order) => ({ id: s.id, order }))

    try {
      const { trip: updated } = await tripsApi.reorderStops(trip.id, payload)
      setTrip({ ...updated, stops: updated.stops ?? [] })
    } catch (err) {
      toast({
        title: 'Could not reorder stops',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'danger',
      })
    }
  }

  async function handleGenerate() {
    if (!trip || (trip.stops ?? []).length === 0) return
    setGenerating(true)
    try {
      const { trip: updated, budgetHint: hint } = await tripsApi.generate(trip.id)
      setTrip({ ...updated, stops: updated.stops ?? [] })
      setBudgetHint(hint ?? null)
      const budget = await tripsApi.getBudget(trip.id).catch(() => null)
      setRemaining(budget?.remaining ?? null)
      setAllocated(budget?.allocated ?? null)
      toast({ title: 'AI plan generated', variant: 'success' })
    } catch (err) {
      toast({
        title: 'Generation failed',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'danger',
      })
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 py-4">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!trip || !tripId) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-4">
        <Link to="/planner" className="text-sm text-muted-fg underline-offset-2 hover:underline">
          ← Back to trips
        </Link>
        <EmptyState
          title="Trip not found"
          description="It may have been deleted, or the link is invalid."
          action={
            <Button size="sm" onClick={() => navigate('/planner')}>
              Back to trips
            </Button>
          }
        />
      </div>
    )
  }

  const sorted = [...(trip.stops ?? [])].sort((a, b) => a.order - b.order)
  const firstCity = sorted[0]?.city
  const cover = destinationCoverUrl(firstCity)
  const activityCount = sorted.reduce((n, s) => n + (s.activities?.length ?? 0), 0)
  const hotelCount = sorted.reduce((n, s) => n + (s.hotels?.length ?? 0), 0)
  const nothingSpent = allocated == null || Number(allocated) === 0

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4">
      <div className="relative overflow-hidden rounded-lg border border-border">
        <div className="relative aspect-[21/9] min-h-[12rem] bg-muted">
          <img src={cover} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-fg/70 via-fg/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 sm:p-6">
            <Link
              to="/planner"
              className="inline-flex items-center gap-1.5 text-sm text-brand-fg/85 hover:text-brand-fg"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              All trips
            </Link>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="font-display text-3xl font-semibold text-brand-fg drop-shadow">
                  {trip.title}
                </h1>
                <p className="mt-1 text-sm text-brand-fg/85">
                  {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                  {' · '}
                  {formatMoney(trip.totalBudget, trip.currency)}
                  {remaining != null && ` · ${formatMoney(remaining, trip.currency)} left`}
                </p>
              </div>
              <Badge variant="accent" className="capitalize">
                {trip.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <TripToolNav tripId={trip.id} />

      <div className="grid gap-3 sm:grid-cols-3">
        <ToolShortcut
          to={`/planner/${trip.id}/itinerary`}
          icon={<ListOrdered className="h-5 w-5" />}
          title="Itinerary"
          detail={`${sorted.length} stop${sorted.length === 1 ? '' : 's'} · ${activityCount} activit${activityCount === 1 ? 'y' : 'ies'}`}
          hint={
            sorted.length === 0
              ? 'Add a city to get started'
              : activityCount === 0
                ? 'Add activities or generate with AI'
                : undefined
          }
        />
        <ToolShortcut
          to={`/planner/${trip.id}/budget`}
          icon={<Wallet className="h-5 w-5" />}
          title="Budget"
          detail={
            nothingSpent
              ? `${formatMoney(trip.totalBudget, trip.currency)} ceiling · nothing spent`
              : remaining != null
                ? `${formatMoney(remaining, trip.currency)} remaining`
                : formatMoney(trip.totalBudget, trip.currency)
          }
          hint={nothingSpent ? 'Envelope from trip create' : undefined}
        />
        <ToolShortcut
          to={`/planner/${trip.id}/hotels`}
          icon={<BedDouble className="h-5 w-5" />}
          title="Hotels"
          detail={`${hotelCount} hotel${hotelCount === 1 ? '' : 's'}`}
          hint={
            sorted.length === 0
              ? 'Add a stop first'
              : hotelCount === 0
                ? 'Add lodging per stop'
                : undefined
          }
        />
      </div>

      <section className="space-y-3 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">AI draft</h2>
            <p className="text-sm text-muted-fg">
              Generate activities for every stop, then refine in the itinerary.
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating || sorted.length === 0}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {generating ? 'Generating…' : 'Generate with AI'}
          </Button>
        </div>
        {trip.interests.length > 0 && (
          <p className="text-sm text-muted-fg">
            Interests:{' '}
            <span className="capitalize text-fg">{trip.interests.join(', ')}</span>
          </p>
        )}
        {budgetHint && (
          <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-fg">
            <span className="font-medium text-fg">Budget hint</span>
            <ul className="mt-1 list-inside list-disc">
              {budgetHint.lodging != null && <li>Lodging: {budgetHint.lodging}</li>}
              {budgetHint.activities != null && <li>Activities: {budgetHint.activities}</li>}
              {budgetHint.food != null && <li>Food: {budgetHint.food}</li>}
              {budgetHint.transport != null && <li>Transport: {budgetHint.transport}</li>}
              {budgetHint.other != null && <li>Other: {budgetHint.other}</li>}
            </ul>
            {budgetHint.notes && <p className="mt-1">{budgetHint.notes}</p>}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Stops</h2>
        {sorted.length === 0 ? (
          <EmptyState
            title="Add a city stop"
            description="Stops unlock itinerary activities, hotels, and AI generation. Add a city below."
          />
        ) : (
          <ol className="space-y-2">
            {sorted.map((stop, idx) => {
              const activities = [...(stop.activities ?? [])].sort((a, b) => a.order - b.order)
              return (
                <li
                  key={stop.id}
                  className="rounded-lg border border-border bg-surface px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="mr-2 text-xs text-muted-fg">{idx + 1}.</span>
                      <span className="font-medium">{stop.city}</span>
                      {stop.country && (
                        <span className="text-muted-fg">, {stop.country}</span>
                      )}
                      {(stop.arrivalDate || stop.departureDate) && (
                        <div className="mt-0.5 text-xs text-muted-fg">
                          {stop.arrivalDate && `Arr ${toDateInputValue(stop.arrivalDate)}`}
                          {stop.arrivalDate && stop.departureDate && ' · '}
                          {stop.departureDate && `Dep ${toDateInputValue(stop.departureDate)}`}
                        </div>
                      )}
                      <p className="mt-0.5 text-xs text-muted-fg">
                        {activities.length} activit{activities.length === 1 ? 'y' : 'ies'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs disabled:opacity-30"
                        disabled={idx === 0}
                        onClick={() => moveStop(stop.id, -1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs disabled:opacity-30"
                        disabled={idx === sorted.length - 1}
                        onClick={() => moveStop(stop.id, 1)}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-border px-2 py-1 text-xs text-muted-fg hover:border-danger/40"
                        onClick={() => handleRemoveStop(stop.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {activities.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-border pt-2">
                      {activities.slice(0, 4).map((activity: Activity) => (
                        <li key={activity.id} className="text-sm text-muted-fg">
                          <span className="text-fg">{activity.name}</span>
                          {activity.category && (
                            <span className="ml-2 text-xs capitalize">{activity.category}</span>
                          )}
                        </li>
                      ))}
                      {activities.length > 4 && (
                        <li className="text-xs text-muted-fg">
                          +{activities.length - 4} more in itinerary
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              )
            })}
          </ol>
        )}

        <form
          onSubmit={handleAddStop}
          className="grid gap-2 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-[1fr_1fr_auto]"
        >
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
          <Button type="submit" disabled={adding}>
            {adding ? 'Adding…' : 'Add stop'}
          </Button>
        </form>
      </section>

      <div className="flex justify-end border-t border-border pt-4">
        <Button variant="danger" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" aria-hidden />
          Delete trip
        </Button>
      </div>
    </div>
  )
}

function ToolShortcut({
  to,
  icon,
  title,
  detail,
  hint,
}: {
  to: string
  icon: React.ReactNode
  title: string
  detail: string
  hint?: string
}) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-brand/40 hover:shadow-soft"
    >
      <div className="flex items-center gap-2 text-brand">{icon}</div>
      <div className="mt-2 font-medium">{title}</div>
      <div className="text-sm text-muted-fg">{detail}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-fg/80">{hint}</div>}
    </Link>
  )
}
