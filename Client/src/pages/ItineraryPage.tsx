import { useAuth } from '@clerk/clerk-react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isClerkConfigured } from '../lib/clerk'
import {
  tripsApi,
  type Activity,
  type CreateActivityPayload,
  type Stop,
  type Trip,
  type UpdateActivityPayload,
} from '../lib/tripsApi'

const CATEGORIES = [
  'sightseeing',
  'food',
  'culture',
  'nature',
  'nightlife',
  'adventure',
  'shopping',
  'history',
  'relaxation',
  'transport',
  'hotel',
  'other',
]

const inputClass =
  'rounded border border-fg/20 bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-fg/40'
const labelText = 'text-xs font-medium text-fg/70'

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

function sortedStops(stops: Stop[]) {
  return [...stops].sort((a, b) => a.order - b.order)
}

function sortedActivities(activities: Activity[] | undefined) {
  return [...(activities ?? [])].sort((a, b) => a.order - b.order)
}

export default function ItineraryPage() {
  if (!isClerkConfigured) {
    return (
      <div className="mx-auto max-w-3xl py-4">
        <h1 className="text-2xl font-bold">Itinerary builder</h1>
        <p className="mt-2 text-fg/70">
          Configure <code className="text-sm">VITE_CLERK_PUBLISHABLE_KEY</code> to edit itineraries.
        </p>
      </div>
    )
  }
  return <ClerkItineraryPage />
}

function ClerkItineraryPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const { getToken, isLoaded } = useAuth()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const loadTrip = useCallback(async () => {
    if (!tripId) return
    setError('')
    try {
      const token = await getToken()
      const { trip: next } = await tripsApi.get(token, tripId)
      setTrip(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trip')
      setTrip(null)
    } finally {
      setLoading(false)
    }
  }, [getToken, tripId])

  useEffect(() => {
    if (!isLoaded || !tripId) return
    loadTrip()
  }, [isLoaded, tripId, loadTrip])

  async function withToken<T>(fn: (token: string | null) => Promise<T>): Promise<T | null> {
    setError('')
    setBusy(true)
    try {
      const token = await getToken()
      return await fn(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
      return null
    } finally {
      setBusy(false)
    }
  }

  async function handleReorderStops(activeId: string, overId: string) {
    if (!trip || activeId === overId) return
    const stops = sortedStops(trip.stops)
    const oldIndex = stops.findIndex((s) => s.id === activeId)
    const newIndex = stops.findIndex((s) => s.id === overId)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(stops, oldIndex, newIndex).map((s, order) => ({
      ...s,
      order,
    }))
    const optimistic: Trip = { ...trip, stops: reordered }
    setTrip(optimistic)

    const result = await withToken((token) =>
      tripsApi.reorderStops(
        token,
        trip.id,
        reordered.map((s) => ({ id: s.id, order: s.order })),
      ),
    )
    if (result) setTrip(result.trip)
    else await loadTrip()
  }

  async function handleReorderActivities(stopId: string, activeId: string, overId: string) {
    if (!trip || activeId === overId) return
    const stop = trip.stops.find((s) => s.id === stopId)
    if (!stop) return

    const activities = sortedActivities(stop.activities)
    const oldIndex = activities.findIndex((a) => a.id === activeId)
    const newIndex = activities.findIndex((a) => a.id === overId)
    if (oldIndex < 0 || newIndex < 0) return

    const reordered = arrayMove(activities, oldIndex, newIndex).map((a, order) => ({
      ...a,
      order,
    }))
    setTrip({
      ...trip,
      stops: trip.stops.map((s) => (s.id === stopId ? { ...s, activities: reordered } : s)),
    })

    const result = await withToken((token) =>
      tripsApi.reorderActivities(
        token,
        trip.id,
        stopId,
        reordered.map((a) => ({ id: a.id, order: a.order })),
      ),
    )
    if (result) setTrip(result.trip)
    else await loadTrip()
  }

  function onStopDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    void handleReorderStops(String(active.id), String(over.id))
  }

  async function handleAddStop(city: string, country: string) {
    if (!trip || !city.trim()) return
    const result = await withToken((token) =>
      tripsApi.addStop(token, trip.id, {
        city: city.trim(),
        country: country.trim() || undefined,
      }),
    )
    if (!result) return
    setTrip({
      ...trip,
      stops: [...trip.stops, { ...result.stop, activities: [] }].sort(
        (a, b) => a.order - b.order,
      ),
    })
    setMessage('Stop added.')
  }

  async function handleRemoveStop(stopId: string) {
    if (!trip) return
    if (!window.confirm('Remove this stop and its activities?')) return
    const ok = await withToken((token) => tripsApi.removeStop(token, trip.id, stopId))
    if (!ok) return
    setTrip({ ...trip, stops: trip.stops.filter((s) => s.id !== stopId) })
    setMessage('Stop removed.')
  }

  async function handleAddActivity(stopId: string, payload: CreateActivityPayload) {
    if (!trip) return
    const result = await withToken((token) =>
      tripsApi.addActivity(token, trip.id, stopId, payload),
    )
    if (!result) return
    setTrip({
      ...trip,
      stops: trip.stops.map((s) =>
        s.id === stopId
          ? {
              ...s,
              activities: sortedActivities([...(s.activities ?? []), result.activity]),
            }
          : s,
      ),
    })
    setMessage('Activity added.')
  }

  async function handleUpdateActivity(activityId: string, payload: UpdateActivityPayload) {
    if (!trip) return
    const result = await withToken((token) =>
      tripsApi.updateActivity(token, trip.id, activityId, payload),
    )
    if (!result) return
    setTrip({
      ...trip,
      stops: trip.stops.map((s) => ({
        ...s,
        activities: (s.activities ?? []).map((a) =>
          a.id === activityId ? result.activity : a,
        ),
      })),
    })
  }

  async function handleRemoveActivity(activityId: string) {
    if (!trip) return
    const ok = await withToken((token) => tripsApi.removeActivity(token, trip.id, activityId))
    if (!ok) return
    setTrip({
      ...trip,
      stops: trip.stops.map((s) => ({
        ...s,
        activities: (s.activities ?? []).filter((a) => a.id !== activityId),
      })),
    })
    setMessage('Activity removed.')
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fg/20 border-t-fg" />
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-4">
        <Link to="/planner" className="text-sm text-fg/70 underline-offset-2 hover:underline">
          ← Back to planner
        </Link>
        <h1 className="text-2xl font-bold">Itinerary builder</h1>
        <p className="text-fg/70">{error || 'Trip not found.'}</p>
      </div>
    )
  }

  const stops = sortedStops(trip.stops)

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/planner"
            className="text-sm text-fg/70 underline-offset-2 hover:underline"
          >
            ← Back to planner
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{trip.title}</h1>
          <p className="mt-1 text-sm text-fg/60">
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
            {' · '}
            {trip.totalBudget} {trip.currency}
            {' · '}
            <span className="capitalize">{trip.status}</span>
          </p>
          <p className="mt-1 text-sm text-fg/70">
            Drag stops or activities to reorder. Add and edit details city by city.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/planner/${trip.id}/hotels`}
            className="rounded border border-fg/20 px-3 py-1.5 text-sm text-fg/80 hover:border-fg/40"
          >
            Hotels
          </Link>
          <Link
            to={`/planner/${trip.id}/budget`}
            className="rounded border border-fg/20 px-3 py-1.5 text-sm text-fg/80 hover:border-fg/40"
          >
            Budget
          </Link>
          {busy && <span className="self-center text-xs text-fg/50">Saving…</span>}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && !error && <p className="text-sm text-fg/70">{message}</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onStopDragEnd}>
        <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {stops.length === 0 ? (
              <p className="border border-dashed border-fg/20 px-4 py-8 text-center text-sm text-fg/60">
                No stops yet. Add a city below to start building.
              </p>
            ) : (
              stops.map((stop, idx) => (
                <SortableStopCard
                  key={stop.id}
                  stop={stop}
                  index={idx}
                  currency={trip.currency}
                  onRemove={() => handleRemoveStop(stop.id)}
                  onReorderActivities={(activeId, overId) =>
                    handleReorderActivities(stop.id, activeId, overId)
                  }
                  onAddActivity={(payload) => handleAddActivity(stop.id, payload)}
                  onUpdateActivity={handleUpdateActivity}
                  onRemoveActivity={handleRemoveActivity}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      <AddStopForm onAdd={handleAddStop} disabled={busy} />
    </div>
  )
}

function SortableStopCard({
  stop,
  index,
  currency,
  onRemove,
  onReorderActivities,
  onAddActivity,
  onUpdateActivity,
  onRemoveActivity,
}: {
  stop: Stop
  index: number
  currency: string
  onRemove: () => void
  onReorderActivities: (activeId: string, overId: string) => void
  onAddActivity: (payload: CreateActivityPayload) => Promise<void>
  onUpdateActivity: (activityId: string, payload: UpdateActivityPayload) => Promise<void>
  onRemoveActivity: (activityId: string) => Promise<void>
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const activities = sortedActivities(stop.activities)

  const activitySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onActivityDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    onReorderActivities(String(active.id), String(over.id))
  }

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`border border-fg/15 bg-fg/[0.02] ${isDragging ? 'opacity-70 shadow-lg' : ''}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-fg/10 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="cursor-grab touch-none rounded border border-fg/15 px-2 py-1 text-xs text-fg/50 active:cursor-grabbing"
            aria-label={`Drag stop ${stop.city}`}
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>
          <div className="min-w-0">
            <h2 className="truncate font-semibold">
              <span className="mr-1.5 text-xs font-normal text-fg/45">{index + 1}.</span>
              {stop.city}
              {stop.country ? (
                <span className="font-normal text-fg/60">, {stop.country}</span>
              ) : null}
            </h2>
            <p className="text-xs text-fg/50">
              {activities.length} activit{activities.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded border border-fg/15 px-2 py-1 text-xs text-fg/70 hover:border-red-500/40 hover:text-red-600"
        >
          Remove stop
        </button>
      </header>

      <div className="space-y-3 p-3">
        <DndContext
          sensors={activitySensors}
          collisionDetection={closestCenter}
          onDragEnd={onActivityDragEnd}
        >
          <SortableContext
            items={activities.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            {activities.length === 0 ? (
              <p className="px-1 py-2 text-sm text-fg/50">No activities yet.</p>
            ) : (
              <ul className="space-y-2">
                {activities.map((activity) => (
                  <SortableActivityRow
                    key={activity.id}
                    activity={activity}
                    currency={currency}
                    onUpdate={onUpdateActivity}
                    onRemove={() => onRemoveActivity(activity.id)}
                  />
                ))}
              </ul>
            )}
          </SortableContext>
        </DndContext>

        <AddActivityForm onAdd={onAddActivity} />
      </div>
    </section>
  )
}

function SortableActivityRow({
  activity,
  currency,
  onUpdate,
  onRemove,
}: {
  activity: Activity
  currency: string
  onUpdate: (activityId: string, payload: UpdateActivityPayload) => Promise<void>
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(activity.name)
  const [category, setCategory] = useState(activity.category ?? '')
  const [cost, setCost] = useState(activity.cost ?? '')
  const [startTime, setStartTime] = useState(activity.startTime ?? '')
  const [endTime, setEndTime] = useState(activity.endTime ?? '')
  const [notes, setNotes] = useState(activity.notes ?? '')
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setName(activity.name)
    setCategory(activity.category ?? '')
    setCost(activity.cost ?? '')
    setStartTime(activity.startTime ?? '')
    setEndTime(activity.endTime ?? '')
    setNotes(activity.notes ?? '')
    setEditing(true)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onUpdate(activity.id, {
        name: name.trim(),
        category: category.trim() || null,
        cost: cost === '' ? null : cost,
        startTime: startTime.trim() || null,
        endTime: endTime.trim() || null,
        notes: notes.trim() || null,
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`border border-fg/10 bg-bg px-2.5 py-2 ${isDragging ? 'opacity-70 shadow-md' : ''}`}
    >
      {editing ? (
        <form onSubmit={saveEdit} className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={labelText}>Name</span>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelText}>Category</span>
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">None</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelText}>Cost ({currency})</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelText}>Start time</span>
            <input
              className={inputClass}
              placeholder="09:00"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelText}>End time</span>
            <input
              className={inputClass}
              placeholder="11:00"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={labelText}>Notes</span>
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-fg px-3 py-1.5 text-xs font-medium text-bg disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="rounded border border-fg/20 px-3 py-1.5 text-xs"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="mt-0.5 cursor-grab touch-none rounded border border-fg/15 px-1.5 py-0.5 text-xs text-fg/45 active:cursor-grabbing"
            aria-label={`Drag activity ${activity.name}`}
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-medium">{activity.name}</span>
              {activity.category && (
                <span className="text-xs capitalize text-fg/50">{activity.category}</span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-fg/55">
              {[
                activity.startTime || activity.endTime
                  ? [activity.startTime, activity.endTime].filter(Boolean).join('–')
                  : null,
                activity.cost != null ? `${activity.cost} ${currency}` : null,
                activity.notes,
              ]
                .filter(Boolean)
                .join(' · ') || 'No details yet'}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              className="rounded border border-fg/15 px-2 py-0.5 text-xs"
              onClick={startEdit}
            >
              Edit
            </button>
            <button
              type="button"
              className="rounded border border-fg/15 px-2 py-0.5 text-xs text-fg/70 hover:border-red-500/40"
              onClick={onRemove}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

function AddActivityForm({
  onAdd,
}: {
  onAdd: (payload: CreateActivityPayload) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [cost, setCost] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onAdd({
        name: name.trim(),
        category: category.trim() || null,
        cost: cost === '' ? null : cost,
        startTime: startTime.trim() || null,
        endTime: endTime.trim() || null,
        notes: notes.trim() || null,
      })
      setName('')
      setCategory('')
      setCost('')
      setStartTime('')
      setEndTime('')
      setNotes('')
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded border border-dashed border-fg/20 px-3 py-2 text-sm text-fg/70 hover:border-fg/40 hover:text-fg"
      >
        + Add activity
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-2 border border-fg/10 bg-bg p-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className={labelText}>Name</span>
        <input
          className={inputClass}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Museum visit"
          autoFocus
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelText}>Category</span>
        <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">None</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelText}>Cost</span>
        <input
          type="number"
          min="0"
          step="0.01"
          className={inputClass}
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelText}>Start</span>
        <input
          className={inputClass}
          placeholder="09:00"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelText}>End</span>
        <input
          className={inputClass}
          placeholder="11:00"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className={labelText}>Notes</span>
        <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-fg px-3 py-1.5 text-sm font-medium text-bg disabled:opacity-50"
        >
          {saving ? 'Adding…' : 'Add'}
        </button>
        <button
          type="button"
          className="rounded border border-fg/20 px-3 py-1.5 text-sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function AddStopForm({
  onAdd,
  disabled,
}: {
  onAdd: (city: string, country: string) => Promise<void>
  disabled?: boolean
}) {
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onAdd(city, country)
      setCity('')
      setCountry('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 border border-fg/15 bg-fg/[0.03] p-4 sm:grid-cols-[1fr_1fr_auto]"
    >
      <input
        className={inputClass}
        placeholder="City"
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
        disabled={disabled || saving}
        className="rounded bg-fg px-4 py-2 text-sm font-medium text-bg disabled:opacity-50"
      >
        {saving ? 'Adding…' : 'Add stop'}
      </button>
    </form>
  )
}
