import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  tripsApi,
  type CreateHotelPayload,
  type Hotel,
  type Stop,
  type Trip,
  type UpdateHotelPayload,
} from '../lib/tripsApi'

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

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function formatMoney(value: string | number, currency: string) {
  const n = Number(value)
  if (!Number.isFinite(n)) return `${value} ${currency}`
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`
}

function lodgingTotal(hotel: Hotel): number | null {
  if (hotel.nightlyRate == null || hotel.nightlyRate === '') return null
  const rate = Number(hotel.nightlyRate)
  if (!Number.isFinite(rate)) return null
  if (hotel.nights == null) return rate
  return rate * hotel.nights
}

function sortedStops(stops: Stop[]) {
  return [...stops].sort((a, b) => a.order - b.order)
}

export default function HotelsPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const loadTrip = useCallback(async () => {
    if (!tripId) return
    setError('')
    setLoading(true)
    try {
      const { trip: data } = await tripsApi.get(tripId)
      setTrip(data)
    } catch (err) {
      setTrip(null)
      setError(err instanceof Error ? err.message : 'Failed to load trip')
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    void loadTrip()
  }, [loadTrip])

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  function upsertHotel(stopId: string, hotel: Hotel) {
    setTrip((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        stops: prev.stops.map((stop) => {
          if (stop.id !== stopId) return stop
          const hotels = stop.hotels ?? []
          const idx = hotels.findIndex((h) => h.id === hotel.id)
          const next =
            idx >= 0
              ? hotels.map((h) => (h.id === hotel.id ? hotel : h))
              : [...hotels, hotel]
          return { ...stop, hotels: next }
        }),
      }
    })
  }

  function removeHotelLocal(stopId: string, hotelId: string) {
    setTrip((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        stops: prev.stops.map((stop) =>
          stop.id === stopId
            ? { ...stop, hotels: (stop.hotels ?? []).filter((h) => h.id !== hotelId) }
            : stop,
        ),
      }
    })
  }

  async function handleAdd(stopId: string, payload: CreateHotelPayload) {
    if (!tripId) return
    await withBusy(async () => {
      const { hotel } = await tripsApi.addHotel(tripId, stopId, payload)
      upsertHotel(stopId, hotel)
      setMessage(`Added “${hotel.name}”.`)
    })
  }

  async function handleUpdate(hotelId: string, stopId: string, payload: UpdateHotelPayload) {
    if (!tripId) return
    await withBusy(async () => {
      const { hotel } = await tripsApi.updateHotel(tripId, hotelId, payload)
      upsertHotel(stopId, hotel)
      setMessage('Hotel updated.')
    })
  }

  async function handleRemove(hotelId: string, stopId: string) {
    if (!tripId || !window.confirm('Delete this hotel?')) return
    await withBusy(async () => {
      await tripsApi.removeHotel(tripId, hotelId)
      removeHotelLocal(stopId, hotelId)
      setMessage('Hotel deleted.')
    })
  }

  async function handleAddToBudget(hotel: Hotel) {
    if (!tripId) return
    await withBusy(async () => {
      const { line } = await tripsApi.addHotelToBudget(tripId, hotel.id)
      setMessage(`Added lodging line “${line.label}” (${line.amount}).`)
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-4">
        <Link to="/planner" className="text-sm text-muted-fg underline-offset-2 hover:underline">
          ← Back to planner
        </Link>
        <h1 className="font-display text-2xl font-semibold">Hotels</h1>
        <p className="text-muted-fg">{error || 'Trip not found.'}</p>
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
            className="text-sm text-muted-fg underline-offset-2 hover:underline"
          >
            ← Back to planner
          </Link>
          <h1 className="mt-2 font-display text-2xl font-semibold">{trip.title}</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Hotels · {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
          </p>
          <p className="mt-1 text-sm text-muted-fg">
            Save lodging notes per city. Add priced stays to the trip budget.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/planner/${trip.id}/itinerary`}
            className="rounded border border-border px-3 py-1.5 text-sm text-muted-fg hover:border-brand/40"
          >
            Itinerary
          </Link>
          <Link
            to={`/planner/${trip.id}/budget`}
            className="rounded border border-border px-3 py-1.5 text-sm text-muted-fg hover:border-brand/40"
          >
            Budget
          </Link>
          {busy && <span className="self-center text-xs text-muted-fg">Saving…</span>}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {message && !error && <p className="text-sm text-muted-fg">{message}</p>}

      {stops.length === 0 ? (
        <p className="border border-dashed border-border px-4 py-8 text-center text-sm text-muted-fg">
          No stops yet. Add cities in the planner or itinerary first.
        </p>
      ) : (
        <div className="space-y-4">
          {stops.map((stop, idx) => (
            <StopHotelsCard
              key={stop.id}
              stop={stop}
              index={idx}
              currency={trip.currency}
              disabled={busy}
              onAdd={(payload) => handleAdd(stop.id, payload)}
              onUpdate={(hotelId, payload) => handleUpdate(hotelId, stop.id, payload)}
              onRemove={(hotelId) => handleRemove(hotelId, stop.id)}
              onAddToBudget={handleAddToBudget}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function emptyHotelForm() {
  return {
    name: '',
    address: '',
    checkIn: '',
    checkOut: '',
    nightlyRate: '',
    nights: '',
    notes: '',
    bookingUrl: '',
  }
}

function StopHotelsCard({
  stop,
  index,
  currency,
  disabled,
  onAdd,
  onUpdate,
  onRemove,
  onAddToBudget,
}: {
  stop: Stop
  index: number
  currency: string
  disabled: boolean
  onAdd: (payload: CreateHotelPayload) => Promise<void>
  onUpdate: (hotelId: string, payload: UpdateHotelPayload) => Promise<void>
  onRemove: (hotelId: string) => Promise<void>
  onAddToBudget: (hotel: Hotel) => Promise<void>
}) {
  const hotels = stop.hotels ?? []
  const [form, setForm] = useState(emptyHotelForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edit, setEdit] = useState(emptyHotelForm)

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    await onAdd({
      name: form.name.trim(),
      address: form.address.trim() || null,
      checkIn: form.checkIn || null,
      checkOut: form.checkOut || null,
      nightlyRate: form.nightlyRate === '' ? null : Number(form.nightlyRate),
      nights: form.nights === '' ? null : Number(form.nights),
      notes: form.notes.trim() || null,
      bookingUrl: form.bookingUrl.trim() || null,
    })
    setForm(emptyHotelForm())
  }

  function startEdit(hotel: Hotel) {
    setEditingId(hotel.id)
    setEdit({
      name: hotel.name,
      address: hotel.address ?? '',
      checkIn: toDateInputValue(hotel.checkIn),
      checkOut: toDateInputValue(hotel.checkOut),
      nightlyRate: hotel.nightlyRate ?? '',
      nights: hotel.nights != null ? String(hotel.nights) : '',
      notes: hotel.notes ?? '',
      bookingUrl: hotel.bookingUrl ?? '',
    })
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId || !edit.name.trim()) return
    await onUpdate(editingId, {
      name: edit.name.trim(),
      address: edit.address.trim() || null,
      checkIn: edit.checkIn || null,
      checkOut: edit.checkOut || null,
      nightlyRate: edit.nightlyRate === '' ? null : Number(edit.nightlyRate),
      nights: edit.nights === '' ? null : Number(edit.nights),
      notes: edit.notes.trim() || null,
      bookingUrl: edit.bookingUrl.trim() || null,
    })
    setEditingId(null)
  }

  return (
    <section className="border border-border bg-muted/40">
      <header className="border-b border-border px-3 py-2.5">
        <span className="mr-2 text-xs text-muted-fg">{index + 1}.</span>
        <span className="font-medium">{stop.city}</span>
        {stop.country && <span className="text-muted-fg">, {stop.country}</span>}
        <span className="ml-2 text-xs text-muted-fg">
          {hotels.length} hotel{hotels.length === 1 ? '' : 's'}
        </span>
      </header>

      <div className="space-y-3 px-3 py-3">
        {hotels.length === 0 ? (
          <p className="text-sm text-muted-fg">No hotels saved for this stop.</p>
        ) : (
          <ul className="space-y-3">
            {hotels.map((hotel) => {
              const total = lodgingTotal(hotel)
              const isEditing = editingId === hotel.id
              return (
                <li key={hotel.id} className="border border-border px-3 py-2">
                  {isEditing ? (
                    <form onSubmit={submitEdit} className="grid gap-2 sm:grid-cols-2">
                      <HotelFields
                        values={edit}
                        onChange={setEdit}
                        disabled={disabled}
                      />
                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                        <button
                          type="submit"
                          disabled={disabled || !edit.name.trim()}
                          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-fg disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => setEditingId(null)}
                          className="rounded border border-border px-3 py-1.5 text-sm text-muted-fg"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">{hotel.name}</div>
                          {hotel.address && (
                            <div className="text-sm text-muted-fg">{hotel.address}</div>
                          )}
                          <div className="mt-1 text-xs text-muted-fg">
                            {(hotel.checkIn || hotel.checkOut) && (
                              <span>
                                {hotel.checkIn && `In ${formatDate(hotel.checkIn)}`}
                                {hotel.checkIn && hotel.checkOut && ' · '}
                                {hotel.checkOut && `Out ${formatDate(hotel.checkOut)}`}
                              </span>
                            )}
                            {hotel.nightlyRate != null && (
                              <span>
                                {(hotel.checkIn || hotel.checkOut) && ' · '}
                                {formatMoney(hotel.nightlyRate, currency)}/night
                                {hotel.nights != null &&
                                  ` × ${hotel.nights} = ${formatMoney(String(total ?? 0), currency)}`}
                              </span>
                            )}
                          </div>
                          {hotel.notes && (
                            <p className="mt-1 text-sm text-muted-fg">{hotel.notes}</p>
                          )}
                          {hotel.bookingUrl && (
                            <a
                              href={hotel.bookingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block text-sm text-muted-fg underline-offset-2 hover:underline"
                            >
                              Booking link
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {hotel.nightlyRate != null && (
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => onAddToBudget(hotel)}
                              className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-brand-fg disabled:opacity-50"
                            >
                              Add to budget
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => startEdit(hotel)}
                            className="rounded border border-border px-2.5 py-1 text-xs text-muted-fg"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onRemove(hotel.id)}
                            className="rounded border border-border px-2.5 py-1 text-xs text-muted-fg hover:border-danger/50 hover:text-danger"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <form onSubmit={submitAdd} className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2">
          <p className={`sm:col-span-2 ${labelText}`}>Add hotel</p>
          <HotelFields values={form} onChange={setForm} disabled={disabled} />
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={disabled || !form.name.trim()}
              className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-fg disabled:opacity-50"
            >
              Add hotel
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}

function HotelFields({
  values,
  onChange,
  disabled,
}: {
  values: ReturnType<typeof emptyHotelForm>
  onChange: (next: ReturnType<typeof emptyHotelForm>) => void
  disabled: boolean
}) {
  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    onChange({ ...values, [key]: value })
  }

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className={labelText}>Name</span>
        <input
          className={inputClass}
          value={values.name}
          disabled={disabled}
          onChange={(e) => set('name', e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelText}>Address</span>
        <input
          className={inputClass}
          value={values.address}
          disabled={disabled}
          onChange={(e) => set('address', e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelText}>Check-in</span>
        <input
          type="date"
          className={inputClass}
          value={values.checkIn}
          disabled={disabled}
          onChange={(e) => set('checkIn', e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelText}>Check-out</span>
        <input
          type="date"
          className={inputClass}
          value={values.checkOut}
          disabled={disabled}
          onChange={(e) => set('checkOut', e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelText}>Nightly rate</span>
        <input
          type="number"
          min="0"
          step="0.01"
          className={inputClass}
          value={values.nightlyRate}
          disabled={disabled}
          onChange={(e) => set('nightlyRate', e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelText}>Nights</span>
        <input
          type="number"
          min="0"
          step="1"
          className={inputClass}
          value={values.nights}
          disabled={disabled}
          onChange={(e) => set('nights', e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className={labelText}>Booking URL</span>
        <input
          type="url"
          className={inputClass}
          value={values.bookingUrl}
          disabled={disabled}
          placeholder="https://"
          onChange={(e) => set('bookingUrl', e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className={labelText}>Notes</span>
        <textarea
          className={`${inputClass} min-h-[4rem]`}
          value={values.notes}
          disabled={disabled}
          onChange={(e) => set('notes', e.target.value)}
        />
      </label>
    </>
  )
}
