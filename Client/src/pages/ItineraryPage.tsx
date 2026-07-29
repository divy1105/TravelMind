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
import { ArrowLeft, GripVertical, ListOrdered, Sparkles } from 'lucide-react'
import {
  tripsApi,
  type Activity,
  type CreateActivityPayload,
  type Stop,
  type Trip,
  type UpdateActivityPayload,
} from '../lib/tripsApi'
import { TripToolNav } from '../components/trips/TripToolNav'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'

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
  'rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand focus:ring-2 focus:ring-ring/30'
const labelText = 'text-xs font-medium text-muted-fg'

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

function sortedStops(stops: Stop[] | undefined) {
  return [...(stops ?? [])].sort((a, b) => a.order - b.order)
}

function sortedActivities(activities: Activity[] | undefined) {
  return [...(activities ?? [])].sort((a, b) => a.order - b.order)
}

export default function ItineraryPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const { toast } = useToast()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const loadTrip = useCallback(async () => {
    if (!tripId) return
    try {
      const { trip: next } = await tripsApi.get(tripId)
      setTrip({ ...next, stops: next.stops ?? [] })
    } catch (err) {
      setTrip(null)
      toast({
        title: 'Could not load itinerary',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'danger',
      })
    } finally {
      setLoading(false)
    }
  }, [tripId, toast])

  useEffect(() => {
    if (!tripId) return
    void loadTrip()
  }, [tripId, loadTrip])

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true)
    try {
      return await fn()
    } catch (err) {
      toast({
        title: 'Request failed',
        description: err instanceof Error ? err.message : 'Try again',
        variant: 'danger',
      })
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

    const result = await run(() =>
      tripsApi.reorderStops(
        trip.id,
        reordered.map((s) => ({ id: s.id, order: s.order })),
      ),
    )
    if (result) setTrip({ ...result.trip, stops: result.trip.stops ?? [] })
    else await loadTrip()
  }

  async function handleReorderActivities(stopId: string, activeId: string, overId: string) {
    if (!trip || activeId === overId) return
    const stop = (trip.stops ?? []).find((s) => s.id === stopId)
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
      stops: (trip.stops ?? []).map((s) =>
        s.id === stopId ? { ...s, activities: reordered } : s,
      ),
    })

    const result = await run(() =>
      tripsApi.reorderActivities(
        trip.id,
        stopId,
        reordered.map((a) => ({ id: a.id, order: a.order })),
      ),
    )
    if (result) setTrip({ ...result.trip, stops: result.trip.stops ?? [] })
    else await loadTrip()
  }

  function onStopDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    void handleReorderStops(String(active.id), String(over.id))
  }

  async function handleAddStop(city: string, country: string) {
    if (!trip || !city.trim()) return
    const result = await run(() =>
      tripsApi.addStop(trip.id, {
        city: city.trim(),
        country: country.trim() || undefined,
      }),
    )
    if (!result) return
    setTrip({
      ...trip,
      stops: [
        ...(trip.stops ?? []),
        {
          ...result.stop,
          activities: result.stop.activities ?? [],
          hotels: result.stop.hotels ?? [],
        },
      ].sort((a, b) => a.order - b.order),
    })
    toast({ title: 'Stop added', variant: 'success' })
  }

  async function handleRemoveStop(stopId: string) {
    if (!trip) return
    if (!window.confirm('Remove this stop and its activities?')) return
    const ok = await run(() => tripsApi.removeStop(trip.id, stopId))
    if (!ok) return
    setTrip({ ...trip, stops: trip.stops.filter((s) => s.id !== stopId) })
    toast({ title: 'Stop removed', variant: 'success' })
  }

  async function handleAddActivity(stopId: string, payload: CreateActivityPayload) {
    if (!trip) return
    const result = await run(() => tripsApi.addActivity(trip.id, stopId, payload))
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
    toast({ title: 'Activity added', variant: 'success' })
  }

  async function handleUpdateActivity(activityId: string, payload: UpdateActivityPayload) {
    if (!trip) return
    const result = await run(() => tripsApi.updateActivity(trip.id, activityId, payload))
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
    const ok = await run(() => tripsApi.removeActivity(trip.id, activityId))
    if (!ok) return
    setTrip({
      ...trip,
      stops: trip.stops.map((s) => ({
        ...s,
        activities: (s.activities ?? []).filter((a) => a.id !== activityId),
      })),
    })
    toast({ title: 'Activity removed', variant: 'success' })
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 py-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
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
          icon={<ListOrdered className="h-8 w-8" />}
          title="Itinerary unavailable"
          description="Trip not found or could not be loaded."
        />
      </div>
    )
  }

  const stops = sortedStops(trip.stops ?? [])
  const activityCount = stops.reduce((n, s) => n + (s.activities?.length ?? 0), 0)

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4">
      <div className="space-y-3">
        <Link
          to={`/planner/${trip.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-fg hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Trip overview
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">{trip.title}</h1>
            <p className="mt-1 text-sm text-muted-fg">
              {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
              {' · '}
              {trip.totalBudget} {trip.currency}
              {' · '}
              <span className="capitalize">{trip.status}</span>
            </p>
            <p className="mt-1 text-sm text-muted-fg">
              Drag stops or activities to reorder. Add and edit details city by city.
            </p>
          </div>
          {busy && <span className="self-center text-xs text-muted-fg">Saving…</span>}
        </div>
        <TripToolNav tripId={trip.id} />
      </div>

      {stops.length > 0 && activityCount === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <p className="text-muted-fg">
            Stops are ready — add activities here, or generate a full draft with AI.
          </p>
          <Link
            to={`/planner/${trip.id}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-medium text-brand-fg hover:opacity-90"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Generate with AI
          </Link>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onStopDragEnd}>
        <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {stops.length === 0 ? (
              <EmptyState
                icon={<ListOrdered className="h-8 w-8" />}
                title="No stops yet"
                description="Activities attach to city stops. Add your first city below, then build the day-by-day plan or generate with AI from the overview."
                action={
                  <a
                    href="#add-stop"
                    className="inline-flex h-8 items-center rounded-md bg-brand px-3 text-xs font-medium text-brand-fg hover:opacity-90"
                  >
                    Add first stop
                  </a>
                }
              />
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

      <div id="add-stop">
        <AddStopForm onAdd={handleAddStop} disabled={busy} />
      </div>
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
      className={`overflow-hidden rounded-lg border border-border bg-surface ${isDragging ? 'opacity-70 shadow-lift' : ''}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 cursor-grab touch-none items-center justify-center rounded-md border border-border bg-bg text-muted-fg transition hover:border-brand/40 hover:text-fg active:cursor-grabbing"
            aria-label={`Drag stop ${stop.city}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0">
            <h2 className="truncate font-semibold">
              <span className="mr-1.5 text-xs font-normal text-muted-fg">{index + 1}.</span>
              {stop.city}
              {stop.country ? (
                <span className="font-normal text-muted-fg">, {stop.country}</span>
              ) : null}
            </h2>
            <p className="text-xs text-muted-fg">
              {activities.length} activit{activities.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-danger"
          onClick={onRemove}
        >
          Remove stop
        </Button>
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
              <p className="px-1 py-2 text-sm text-muted-fg">No activities yet.</p>
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
      className={`rounded-md border border-border bg-bg px-2.5 py-2 ${isDragging ? 'opacity-70 shadow-soft' : ''}`}
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
              className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-brand-fg disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="rounded border border-border px-3 py-1.5 text-xs"
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
            className="mt-0.5 inline-flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border border-border bg-muted/50 text-muted-fg transition hover:border-brand/40 hover:text-fg active:cursor-grabbing"
            aria-label={`Drag activity ${activity.name}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-medium">{activity.name}</span>
              {activity.category && (
                <span className="text-xs capitalize text-muted-fg">{activity.category}</span>
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
              className="rounded border border-border px-2 py-0.5 text-xs"
              onClick={startEdit}
            >
              Edit
            </button>
            <button
              type="button"
              className="rounded border border-border px-2 py-0.5 text-xs text-muted-fg hover:border-danger/40"
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
        className="w-full rounded border border-dashed border-border px-3 py-2 text-sm text-muted-fg hover:border-brand/40 hover:text-fg"
      >
        + Add activity
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-2 border border-border bg-bg p-3 sm:grid-cols-2">
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
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-fg disabled:opacity-50"
        >
          {saving ? 'Adding…' : 'Add'}
        </button>
        <button
          type="button"
          className="rounded border border-border px-3 py-1.5 text-sm"
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
      className="grid gap-2 border border-border bg-muted/50 p-4 sm:grid-cols-[1fr_1fr_auto]"
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
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg disabled:opacity-50"
      >
        {saving ? 'Adding…' : 'Add stop'}
      </button>
    </form>
  )
}
