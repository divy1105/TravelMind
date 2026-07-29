import { and, asc, eq, inArray } from 'drizzle-orm'
import { Router } from 'express'
import { randomUUID } from 'crypto'
import { db } from '../db'
import {
  activity,
  aiGeneration,
  budgetLine,
  hotel,
  stop,
  trip,
} from '../db/schema'
import { requireAuth, getAuthUserId } from '../middleware/auth'
import { generateTripPlan } from '../services/geminiTripPlanner'

const VALID_STATUSES = new Set(['draft', 'planning', 'active', 'completed'])
const BUDGET_CATEGORIES = new Set([
  'lodging',
  'food',
  'transport',
  'activities',
  'other',
])

type StopInput = {
  city: string
  country?: string | null
  order?: number
  arrivalDate?: string | null
  departureDate?: string | null
}

type ActivityRow = typeof activity.$inferSelect
type HotelRow = typeof hotel.$inferSelect
type BudgetLineRow = typeof budgetLine.$inferSelect & {
  linkedActivity?: {
    id: string
    name: string
    cost: string | null
    category: string | null
  } | null
}

function parseDate(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || value === '') return null
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) {
    throw Object.assign(new Error(`Invalid ${field}`), { status: 400 })
  }
  return d
}

function requireDate(value: unknown, field: string): Date {
  const d = parseDate(value, field)
  if (!d) {
    throw Object.assign(new Error(`${field} is required`), { status: 400 })
  }
  return d
}

function amountToString(value: string | null | undefined): string | null {
  if (value == null) return null
  return value
}

function parseOptionalAmount(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    throw Object.assign(new Error(`${field} must be a non-negative number`), {
      status: 400,
    })
  }
  return String(value)
}

function parseAmount(value: unknown, field = 'amount'): string {
  if (value === undefined || value === null || value === '') {
    throw Object.assign(new Error(`${field} is required`), { status: 400 })
  }
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) {
    throw Object.assign(new Error(`${field} must be a non-negative number`), {
      status: 400,
    })
  }
  return String(value)
}

function parseOptionalNights(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0) {
    throw Object.assign(new Error('nights must be a non-negative integer'), {
      status: 400,
    })
  }
  return n
}

function decimalToFixed(value: string | number): string {
  return Number(value).toFixed(2)
}

function lodgingAmountFromHotel(h: {
  nightlyRate: string | null
  nights: number | null
}): string {
  if (h.nightlyRate == null) {
    throw Object.assign(new Error('nightlyRate is required to add lodging to budget'), {
      status: 400,
    })
  }
  if (h.nights == null) return h.nightlyRate
  return (Number(h.nightlyRate) * h.nights).toFixed(2)
}

function serializeActivity(a: ActivityRow) {
  return {
    ...a,
    cost: amountToString(a.cost),
  }
}

function serializeHotel(h: HotelRow) {
  return {
    ...h,
    nightlyRate: amountToString(h.nightlyRate),
  }
}

function serializeBudgetLine(line: BudgetLineRow) {
  return {
    id: line.id,
    tripId: line.tripId,
    category: line.category,
    label: line.label,
    amount: String(line.amount),
    linkedActivityId: line.linkedActivityId,
    createdAt: line.createdAt,
    updatedAt: line.updatedAt,
    linkedActivity: line.linkedActivity
      ? {
          id: line.linkedActivity.id,
          name: line.linkedActivity.name,
          cost: amountToString(line.linkedActivity.cost),
          category: line.linkedActivity.category,
        }
      : null,
  }
}

function serializeTrip(t: {
  id: string
  userId: string
  title: string
  startDate: Date
  endDate: Date
  totalBudget: string
  currency: string
  interests: string[]
  status: string
  createdAt: Date
  updatedAt: Date
  stops?: Array<{
    id: string
    tripId: string
    city: string
    country: string | null
    order: number
    arrivalDate: Date | null
    departureDate: Date | null
    createdAt: Date
    updatedAt: Date
    activities?: ActivityRow[]
    hotels?: HotelRow[]
  }>
}) {
  return {
    ...t,
    totalBudget: String(t.totalBudget),
    stops: (t.stops ?? []).map((s) => ({
      ...s,
      activities: (s.activities ?? []).map(serializeActivity),
      hotels: (s.hotels ?? []).map(serializeHotel),
    })),
  }
}

async function loadTripWithDetails(tripId: string, userId: string) {
  return db.query.trip.findFirst({
    where: and(eq(trip.id, tripId), eq(trip.userId, userId)),
    with: {
      stops: {
        orderBy: [asc(stop.order)],
        with: {
          activities: { orderBy: [asc(activity.order)] },
          hotels: { orderBy: [asc(hotel.createdAt)] },
        },
      },
    },
  })
}

async function assertActivityOnTrip(tripId: string, activityId: string) {
  const act = await db.query.activity.findFirst({
    where: eq(activity.id, activityId),
    with: { stop: true },
  })
  if (!act || act.stop.tripId !== tripId) {
    throw Object.assign(
      new Error('linkedActivityId must belong to an activity on this trip'),
      { status: 400 },
    )
  }
  return act
}

export function tripsRouter() {
  const router = Router()

  router.post('/api/trips', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const {
        title,
        startDate,
        endDate,
        totalBudget,
        currency,
        interests,
        status,
        stops,
      } = req.body as {
        title?: string
        startDate?: string
        endDate?: string
        totalBudget?: number | string
        currency?: string
        interests?: string[]
        status?: string
        stops?: StopInput[]
      }

      if (!title?.trim()) {
        res.status(400).json({ error: 'title is required' })
        return
      }
      if (totalBudget === undefined || totalBudget === null || totalBudget === '') {
        res.status(400).json({ error: 'totalBudget is required' })
        return
      }

      const start = requireDate(startDate, 'startDate')
      const end = requireDate(endDate, 'endDate')
      if (end < start) {
        res.status(400).json({ error: 'endDate must be on or after startDate' })
        return
      }

      const tripStatus = status && VALID_STATUSES.has(status) ? status : 'draft'
      const interestList = Array.isArray(interests)
        ? interests.map((i) => String(i).trim()).filter(Boolean)
        : []

      const tripId = randomUUID()
      await db.insert(trip).values({
        id: tripId,
        userId,
        title: title.trim(),
        startDate: start,
        endDate: end,
        totalBudget: String(totalBudget),
        currency: currency?.trim() || 'USD',
        interests: interestList,
        status: tripStatus,
      })

      if (Array.isArray(stops) && stops.length > 0) {
        const stopRows = stops
          .filter((s) => s.city?.trim())
          .map((s, idx) => ({
            id: randomUUID(),
            tripId,
            city: s.city.trim(),
            country: s.country?.trim() || null,
            order: typeof s.order === 'number' ? s.order : idx,
            arrivalDate: parseDate(s.arrivalDate, 'arrivalDate'),
            departureDate: parseDate(s.departureDate, 'departureDate'),
          }))
        if (stopRows.length > 0) {
          await db.insert(stop).values(stopRows)
        }
      }

      const created = await loadTripWithDetails(tripId, userId)
      if (!created) {
        res.status(500).json({ error: 'Trip created but could not be reloaded' })
        return
      }
      res.status(201).json({ trip: serializeTrip(created) })
    } catch (err) {
      const statusCode = (err as { status?: number }).status
      if (statusCode === 400) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
      console.error('[trips POST]', err)
      res.status(500).json({ error: 'Failed to create trip' })
    }
  })

  router.get('/api/trips', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const trips = await db.query.trip.findMany({
        where: eq(trip.userId, userId),
        orderBy: [asc(trip.startDate)],
        with: {
          stops: {
            orderBy: [asc(stop.order)],
            with: {
              activities: { orderBy: [asc(activity.order)] },
              hotels: { orderBy: [asc(hotel.createdAt)] },
            },
          },
        },
      })

      res.json({ trips: trips.map(serializeTrip) })
    } catch (err) {
      console.error('[trips GET]', err)
      res.status(500).json({ error: 'Failed to list trips' })
    }
  })

  router.get('/api/trips/:id', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await loadTripWithDetails(req.params.id, userId)
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      res.json({ trip: serializeTrip(found) })
    } catch (err) {
      console.error('[trips/:id GET]', err)
      res.status(500).json({ error: 'Failed to fetch trip' })
    }
  })

  router.patch('/api/trips/:id', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const existing = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
      })
      if (!existing) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const {
        title,
        startDate,
        endDate,
        totalBudget,
        currency,
        interests,
        status: tripStatus,
      } = req.body as {
        title?: string
        startDate?: string
        endDate?: string
        totalBudget?: number | string
        currency?: string
        interests?: string[]
        status?: string
      }

      const patch: Partial<typeof trip.$inferInsert> = {}

      if (title !== undefined) {
        if (!title.trim()) {
          res.status(400).json({ error: 'title cannot be empty' })
          return
        }
        patch.title = title.trim()
      }
      if (startDate !== undefined) patch.startDate = requireDate(startDate, 'startDate')
      if (endDate !== undefined) patch.endDate = requireDate(endDate, 'endDate')
      if (totalBudget !== undefined) patch.totalBudget = String(totalBudget)
      if (currency !== undefined) patch.currency = currency.trim() || existing.currency
      if (interests !== undefined) {
        patch.interests = Array.isArray(interests)
          ? interests.map((i) => String(i).trim()).filter(Boolean)
          : []
      }
      if (tripStatus !== undefined) {
        if (!VALID_STATUSES.has(tripStatus)) {
          res.status(400).json({ error: 'Invalid status' })
          return
        }
        patch.status = tripStatus
      }

      const nextStart = (patch.startDate as Date | undefined) ?? existing.startDate
      const nextEnd = (patch.endDate as Date | undefined) ?? existing.endDate
      if (nextEnd < nextStart) {
        res.status(400).json({ error: 'endDate must be on or after startDate' })
        return
      }

      await db.update(trip).set(patch).where(eq(trip.id, existing.id))
      const updated = await loadTripWithDetails(existing.id, userId)
      res.json({ trip: serializeTrip(updated!) })
    } catch (err) {
      const statusCode = (err as { status?: number }).status
      if (statusCode === 400) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
      console.error('[trips/:id PATCH]', err)
      res.status(500).json({ error: 'Failed to update trip' })
    }
  })

  router.delete('/api/trips/:id', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const existing = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
      })
      if (!existing) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      await db.delete(trip).where(eq(trip.id, existing.id))
      res.json({ ok: true })
    } catch (err) {
      console.error('[trips/:id DELETE]', err)
      res.status(500).json({ error: 'Failed to delete trip' })
    }
  })

  router.post('/api/trips/:id/stops', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
        with: { stops: true },
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const { city, country, order, arrivalDate, departureDate } = req.body as StopInput
      if (!city?.trim()) {
        res.status(400).json({ error: 'city is required' })
        return
      }

      const nextOrder =
        typeof order === 'number'
          ? order
          : found.stops.reduce((max, s) => Math.max(max, s.order), -1) + 1

      const [created] = await db
        .insert(stop)
        .values({
          id: randomUUID(),
          tripId: found.id,
          city: city.trim(),
          country: country?.trim() || null,
          order: nextOrder,
          arrivalDate: parseDate(arrivalDate, 'arrivalDate'),
          departureDate: parseDate(departureDate, 'departureDate'),
        })
        .returning()

      res.status(201).json({
        stop: {
          ...created,
          activities: [],
          hotels: [],
        },
      })
    } catch (err) {
      const statusCode = (err as { status?: number }).status
      if (statusCode === 400) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
      console.error('[trips/:id/stops POST]', err)
      res.status(500).json({ error: 'Failed to add stop' })
    }
  })

  router.patch('/api/trips/:id/stops/reorder', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
        with: { stops: true },
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const { stops: orderList } = req.body as {
        stops?: Array<{ id: string; order: number }>
      }

      if (!Array.isArray(orderList) || orderList.length === 0) {
        res.status(400).json({ error: 'stops array of {id, order} is required' })
        return
      }

      const ownedIds = new Set(found.stops.map((s) => s.id))
      for (const item of orderList) {
        if (!item.id || typeof item.order !== 'number') {
          res.status(400).json({ error: 'Each item needs id and numeric order' })
          return
        }
        if (!ownedIds.has(item.id)) {
          res.status(400).json({ error: `Stop ${item.id} does not belong to this trip` })
          return
        }
      }

      await db.transaction(async (tx) => {
        for (const item of orderList) {
          await tx.update(stop).set({ order: item.order }).where(eq(stop.id, item.id))
        }
      })

      const updated = await loadTripWithDetails(found.id, userId)
      res.json({ trip: serializeTrip(updated!) })
    } catch (err) {
      console.error('[trips/:id/stops/reorder PATCH]', err)
      res.status(500).json({ error: 'Failed to reorder stops' })
    }
  })

  router.patch('/api/trips/:id/stops/:stopId', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const existing = await db.query.stop.findFirst({
        where: and(eq(stop.id, req.params.stopId), eq(stop.tripId, found.id)),
      })
      if (!existing) {
        res.status(404).json({ error: 'Stop not found' })
        return
      }

      const { city, country, order, arrivalDate, departureDate } = req.body as StopInput & {
        order?: number
      }

      const patch: Partial<typeof stop.$inferInsert> = {}
      if (city !== undefined) {
        if (!city.trim()) {
          res.status(400).json({ error: 'city cannot be empty' })
          return
        }
        patch.city = city.trim()
      }
      if (country !== undefined) patch.country = country?.trim() || null
      if (order !== undefined) patch.order = order
      if (arrivalDate !== undefined) patch.arrivalDate = parseDate(arrivalDate, 'arrivalDate')
      if (departureDate !== undefined) {
        patch.departureDate = parseDate(departureDate, 'departureDate')
      }

      const [updated] = await db
        .update(stop)
        .set(patch)
        .where(eq(stop.id, existing.id))
        .returning()

      res.json({ stop: updated })
    } catch (err) {
      const statusCode = (err as { status?: number }).status
      if (statusCode === 400) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
      console.error('[trips/:id/stops/:stopId PATCH]', err)
      res.status(500).json({ error: 'Failed to update stop' })
    }
  })

  router.delete('/api/trips/:id/stops/:stopId', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const existing = await db.query.stop.findFirst({
        where: and(eq(stop.id, req.params.stopId), eq(stop.tripId, found.id)),
      })
      if (!existing) {
        res.status(404).json({ error: 'Stop not found' })
        return
      }

      await db.delete(stop).where(eq(stop.id, existing.id))
      res.json({ ok: true })
    } catch (err) {
      console.error('[trips/:id/stops/:stopId DELETE]', err)
      res.status(500).json({ error: 'Failed to delete stop' })
    }
  })

  router.post('/api/trips/:id/stops/:stopId/activities', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const stopRow = await db.query.stop.findFirst({
        where: and(eq(stop.id, req.params.stopId), eq(stop.tripId, found.id)),
        with: { activities: true },
      })
      if (!stopRow) {
        res.status(404).json({ error: 'Stop not found' })
        return
      }

      const { name, category, cost, startTime, endTime, notes, order } = req.body as {
        name?: string
        category?: string | null
        cost?: number | string | null
        startTime?: string | null
        endTime?: string | null
        notes?: string | null
        order?: number
      }

      if (!name?.trim()) {
        res.status(400).json({ error: 'name is required' })
        return
      }

      const nextOrder =
        typeof order === 'number'
          ? order
          : stopRow.activities.reduce((max, a) => Math.max(max, a.order), -1) + 1

      const [created] = await db
        .insert(activity)
        .values({
          id: randomUUID(),
          stopId: stopRow.id,
          name: name.trim(),
          category: category?.trim() || null,
          cost:
            cost === '' || cost === null || cost === undefined ? null : String(cost),
          startTime: startTime?.trim() || null,
          endTime: endTime?.trim() || null,
          notes: notes?.trim() || null,
          order: nextOrder,
        })
        .returning()

      res.status(201).json({ activity: serializeActivity(created) })
    } catch (err) {
      console.error('[trips/:id/stops/:stopId/activities POST]', err)
      res.status(500).json({ error: 'Failed to add activity' })
    }
  })

  router.patch(
    '/api/trips/:id/stops/:stopId/activities/reorder',
    requireAuth,
    async (req, res) => {
      try {
        const userId = getAuthUserId(req)
        if (!userId) {
          res.status(401).json({ error: 'Unauthorized' })
          return
        }

        const found = await db.query.trip.findFirst({
          where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
        })
        if (!found) {
          res.status(404).json({ error: 'Trip not found' })
          return
        }

        const stopRow = await db.query.stop.findFirst({
          where: and(eq(stop.id, req.params.stopId), eq(stop.tripId, found.id)),
          with: { activities: true },
        })
        if (!stopRow) {
          res.status(404).json({ error: 'Stop not found' })
          return
        }

        const { activities: orderList } = req.body as {
          activities?: Array<{ id: string; order: number }>
        }

        if (!Array.isArray(orderList) || orderList.length === 0) {
          res.status(400).json({ error: 'activities array of {id, order} is required' })
          return
        }

        const ownedIds = new Set(stopRow.activities.map((a) => a.id))
        for (const item of orderList) {
          if (!item.id || typeof item.order !== 'number') {
            res.status(400).json({ error: 'Each item needs id and numeric order' })
            return
          }
          if (!ownedIds.has(item.id)) {
            res
              .status(400)
              .json({ error: `Activity ${item.id} does not belong to this stop` })
            return
          }
        }

        await db.transaction(async (tx) => {
          for (const item of orderList) {
            await tx
              .update(activity)
              .set({ order: item.order })
              .where(eq(activity.id, item.id))
          }
        })

        const updated = await loadTripWithDetails(found.id, userId)
        res.json({ trip: serializeTrip(updated!) })
      } catch (err) {
        console.error('[trips/:id/stops/:stopId/activities/reorder PATCH]', err)
        res.status(500).json({ error: 'Failed to reorder activities' })
      }
    },
  )

  router.post('/api/trips/:id/generate', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
        with: {
          stops: {
            orderBy: [asc(stop.order)],
            with: { hotels: true },
          },
        },
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }
      if (found.stops.length === 0) {
        res.status(400).json({ error: 'Add at least one stop before generating a plan' })
        return
      }

      const { prompt, plan, rawJson } = await generateTripPlan({
        id: found.id,
        title: found.title,
        startDate: found.startDate,
        endDate: found.endDate,
        totalBudget: String(found.totalBudget),
        currency: found.currency,
        interests: found.interests,
        stops: found.stops,
      })

      const stopIds = found.stops.map((s) => s.id)
      const stopsWithHotels = new Set(
        found.stops.filter((s) => s.hotels.length > 0).map((s) => s.id),
      )

      await db.transaction(async (tx) => {
        if (stopIds.length > 0) {
          await tx.delete(activity).where(inArray(activity.stopId, stopIds))
        }

        await tx.insert(aiGeneration).values({
          id: randomUUID(),
          tripId: found.id,
          prompt,
          rawJson,
        })

        for (const planned of plan.stops) {
          const rows: (typeof activity.$inferInsert)[] = []

          planned.activities.forEach((act, idx) => {
            rows.push({
              id: randomUUID(),
              stopId: planned.stopId,
              name: act.name,
              category: act.category ?? null,
              cost: act.cost != null ? String(act.cost) : null,
              startTime: act.startTime ?? null,
              endTime: act.endTime ?? null,
              notes: act.notes ?? null,
              order: idx,
            })
          })

          if (rows.length > 0) {
            await tx.insert(activity).values(rows)
          }

          // Persist lodging on the Hotels page (not as itinerary activities).
          // Skip stops that already have user-saved hotels so regenerate is safe.
          if (planned.hotelSuggestion?.name && !stopsWithHotels.has(planned.stopId)) {
            const nightly = planned.hotelSuggestion.estimatedNightlyCost
            const hotelNotes = planned.hotelSuggestion.notes?.trim() || null
            await tx.insert(hotel).values({
              id: randomUUID(),
              stopId: planned.stopId,
              name: planned.hotelSuggestion.name.trim(),
              nightlyRate: nightly != null ? String(nightly) : null,
              notes: hotelNotes,
            })
          }
        }

        if (found.status === 'draft') {
          await tx.update(trip).set({ status: 'planning' }).where(eq(trip.id, found.id))
        }
      })

      const updated = await loadTripWithDetails(found.id, userId)
      res.json({
        trip: serializeTrip(updated!),
        budgetHint: plan.budgetHint ?? null,
      })
    } catch (err) {
      const statusCode = (err as { status?: number }).status
      if (statusCode === 400 || statusCode === 503 || statusCode === 502) {
        res.status(statusCode).json({ error: (err as Error).message })
        return
      }
      console.error('[trips/:id/generate POST]', err)
      res.status(500).json({ error: 'Failed to generate trip plan' })
    }
  })

  router.patch('/api/trips/:id/activities/:activityId', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
        with: { stops: true },
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const stopIds = new Set(found.stops.map((s) => s.id))
      const existing = await db.query.activity.findFirst({
        where: eq(activity.id, req.params.activityId),
      })
      if (!existing || !stopIds.has(existing.stopId)) {
        res.status(404).json({ error: 'Activity not found' })
        return
      }

      const { name, category, cost, startTime, endTime, notes, order } = req.body as {
        name?: string
        category?: string | null
        cost?: number | string | null
        startTime?: string | null
        endTime?: string | null
        notes?: string | null
        order?: number
      }

      const patch: Partial<typeof activity.$inferInsert> = {}
      if (name !== undefined) {
        if (!name.trim()) {
          res.status(400).json({ error: 'name cannot be empty' })
          return
        }
        patch.name = name.trim()
      }
      if (category !== undefined) patch.category = category?.trim() || null
      if (cost !== undefined) patch.cost = cost === '' || cost === null ? null : String(cost)
      if (startTime !== undefined) patch.startTime = startTime?.trim() || null
      if (endTime !== undefined) patch.endTime = endTime?.trim() || null
      if (notes !== undefined) patch.notes = notes?.trim() || null
      if (order !== undefined) patch.order = order

      const [updated] = await db
        .update(activity)
        .set(patch)
        .where(eq(activity.id, existing.id))
        .returning()

      res.json({ activity: serializeActivity(updated) })
    } catch (err) {
      const statusCode = (err as { status?: number }).status
      if (statusCode === 400) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
      console.error('[trips/:id/activities/:activityId PATCH]', err)
      res.status(500).json({ error: 'Failed to update activity' })
    }
  })

  router.delete('/api/trips/:id/activities/:activityId', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
        with: { stops: true },
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const stopIds = new Set(found.stops.map((s) => s.id))
      const existing = await db.query.activity.findFirst({
        where: eq(activity.id, req.params.activityId),
      })
      if (!existing || !stopIds.has(existing.stopId)) {
        res.status(404).json({ error: 'Activity not found' })
        return
      }

      await db.delete(activity).where(eq(activity.id, existing.id))
      res.json({ ok: true })
    } catch (err) {
      console.error('[trips/:id/activities/:activityId DELETE]', err)
      res.status(500).json({ error: 'Failed to delete activity' })
    }
  })

  router.get('/api/trips/:id/budget', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
        with: {
          budgetLines: {
            orderBy: [asc(budgetLine.createdAt)],
            with: {
              linkedActivity: {
                columns: { id: true, name: true, cost: true, category: true },
              },
            },
          },
          stops: {
            orderBy: [asc(stop.order)],
            with: {
              activities: { orderBy: [asc(activity.order)] },
            },
          },
        },
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const totalsByCategory: Record<string, string> = {
        lodging: '0.00',
        food: '0.00',
        transport: '0.00',
        activities: '0.00',
        other: '0.00',
      }
      let allocated = 0
      for (const line of found.budgetLines) {
        allocated += Number(line.amount)
        const key = BUDGET_CATEGORIES.has(line.category) ? line.category : 'other'
        totalsByCategory[key] = decimalToFixed(
          Number(totalsByCategory[key]) + Number(line.amount),
        )
      }

      const remaining = Number(found.totalBudget) - allocated

      let plannedFromActivities = 0
      const activityCosts: Array<{
        id: string
        stopId: string
        stopCity: string
        name: string
        category: string | null
        cost: string
      }> = []

      for (const s of found.stops) {
        for (const a of s.activities) {
          if (a.cost == null) continue
          plannedFromActivities += Number(a.cost)
          activityCosts.push({
            id: a.id,
            stopId: s.id,
            stopCity: s.city,
            name: a.name,
            category: a.category,
            cost: String(a.cost),
          })
        }
      }

      res.json({
        tripId: found.id,
        title: found.title,
        currency: found.currency,
        totalBudget: String(found.totalBudget),
        allocated: decimalToFixed(allocated),
        remaining: decimalToFixed(remaining),
        totalsByCategory,
        plannedFromActivities: decimalToFixed(plannedFromActivities),
        lines: found.budgetLines.map(serializeBudgetLine),
        activityCosts,
      })
    } catch (err) {
      console.error('[trips/:id/budget GET]', err)
      res.status(500).json({ error: 'Failed to load budget' })
    }
  })

  router.post('/api/trips/:id/budget-lines', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const { category, label, amount, linkedActivityId } = req.body as {
        category?: string
        label?: string
        amount?: number | string
        linkedActivityId?: string | null
      }

      if (!category?.trim() || !BUDGET_CATEGORIES.has(category.trim())) {
        res.status(400).json({
          error: 'category must be lodging, food, transport, activities, or other',
        })
        return
      }
      if (!label?.trim()) {
        res.status(400).json({ error: 'label is required' })
        return
      }

      const parsedAmount = parseAmount(amount)
      let linkedId: string | null = null
      if (linkedActivityId) {
        await assertActivityOnTrip(found.id, linkedActivityId)
        linkedId = linkedActivityId
      }

      const [created] = await db
        .insert(budgetLine)
        .values({
          id: randomUUID(),
          tripId: found.id,
          category: category.trim(),
          label: label.trim(),
          amount: parsedAmount,
          linkedActivityId: linkedId,
        })
        .returning()

      const withLink = await db.query.budgetLine.findFirst({
        where: eq(budgetLine.id, created.id),
        with: {
          linkedActivity: {
            columns: { id: true, name: true, cost: true, category: true },
          },
        },
      })

      res.status(201).json({ line: serializeBudgetLine(withLink!) })
    } catch (err) {
      const statusCode = (err as { status?: number }).status
      if (statusCode === 400) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
      console.error('[trips/:id/budget-lines POST]', err)
      res.status(500).json({ error: 'Failed to create budget line' })
    }
  })

  router.patch('/api/trips/:id/budget-lines/:lineId', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const existing = await db.query.budgetLine.findFirst({
        where: and(eq(budgetLine.id, req.params.lineId), eq(budgetLine.tripId, found.id)),
      })
      if (!existing) {
        res.status(404).json({ error: 'Budget line not found' })
        return
      }

      const { category, label, amount, linkedActivityId } = req.body as {
        category?: string
        label?: string
        amount?: number | string
        linkedActivityId?: string | null
      }

      const patch: Partial<typeof budgetLine.$inferInsert> = {}
      if (category !== undefined) {
        if (!category.trim() || !BUDGET_CATEGORIES.has(category.trim())) {
          res.status(400).json({
            error: 'category must be lodging, food, transport, activities, or other',
          })
          return
        }
        patch.category = category.trim()
      }
      if (label !== undefined) {
        if (!label.trim()) {
          res.status(400).json({ error: 'label cannot be empty' })
          return
        }
        patch.label = label.trim()
      }
      if (amount !== undefined) {
        patch.amount = parseAmount(amount)
      }
      if (linkedActivityId !== undefined) {
        if (linkedActivityId === null || linkedActivityId === '') {
          patch.linkedActivityId = null
        } else {
          await assertActivityOnTrip(found.id, linkedActivityId)
          patch.linkedActivityId = linkedActivityId
        }
      }

      await db.update(budgetLine).set(patch).where(eq(budgetLine.id, existing.id))

      const withLink = await db.query.budgetLine.findFirst({
        where: eq(budgetLine.id, existing.id),
        with: {
          linkedActivity: {
            columns: { id: true, name: true, cost: true, category: true },
          },
        },
      })

      res.json({ line: serializeBudgetLine(withLink!) })
    } catch (err) {
      const statusCode = (err as { status?: number }).status
      if (statusCode === 400) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
      console.error('[trips/:id/budget-lines/:lineId PATCH]', err)
      res.status(500).json({ error: 'Failed to update budget line' })
    }
  })

  router.delete('/api/trips/:id/budget-lines/:lineId', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const existing = await db.query.budgetLine.findFirst({
        where: and(eq(budgetLine.id, req.params.lineId), eq(budgetLine.tripId, found.id)),
      })
      if (!existing) {
        res.status(404).json({ error: 'Budget line not found' })
        return
      }

      await db.delete(budgetLine).where(eq(budgetLine.id, existing.id))
      res.json({ ok: true })
    } catch (err) {
      console.error('[trips/:id/budget-lines/:lineId DELETE]', err)
      res.status(500).json({ error: 'Failed to delete budget line' })
    }
  })

  router.get('/api/trips/:id/hotels', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
        with: {
          stops: {
            orderBy: [asc(stop.order)],
            with: { hotels: { orderBy: [asc(hotel.createdAt)] } },
          },
        },
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const hotels = found.stops.flatMap((s) =>
        s.hotels.map((h) => ({
          ...serializeHotel(h),
          stopCity: s.city,
          stopCountry: s.country,
          stopOrder: s.order,
        })),
      )

      res.json({
        tripId: found.id,
        title: found.title,
        currency: found.currency,
        hotels,
      })
    } catch (err) {
      console.error('[trips/:id/hotels GET]', err)
      res.status(500).json({ error: 'Failed to load hotels' })
    }
  })

  router.post('/api/trips/:id/stops/:stopId/hotels', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const stopRow = await db.query.stop.findFirst({
        where: and(eq(stop.id, req.params.stopId), eq(stop.tripId, found.id)),
      })
      if (!stopRow) {
        res.status(404).json({ error: 'Stop not found' })
        return
      }

      const { name, address, checkIn, checkOut, nightlyRate, nights, notes, bookingUrl } =
        req.body as {
          name?: string
          address?: string | null
          checkIn?: string | null
          checkOut?: string | null
          nightlyRate?: number | string | null
          nights?: number | string | null
          notes?: string | null
          bookingUrl?: string | null
        }

      if (!name?.trim()) {
        res.status(400).json({ error: 'name is required' })
        return
      }

      const [created] = await db
        .insert(hotel)
        .values({
          id: randomUUID(),
          stopId: stopRow.id,
          name: name.trim(),
          address: address?.trim() || null,
          checkIn: parseDate(checkIn, 'checkIn'),
          checkOut: parseDate(checkOut, 'checkOut'),
          nightlyRate: parseOptionalAmount(nightlyRate, 'nightlyRate'),
          nights: parseOptionalNights(nights),
          notes: notes?.trim() || null,
          bookingUrl: bookingUrl?.trim() || null,
        })
        .returning()

      res.status(201).json({ hotel: serializeHotel(created) })
    } catch (err) {
      const statusCode = (err as { status?: number }).status
      if (statusCode === 400) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
      console.error('[trips/:id/stops/:stopId/hotels POST]', err)
      res.status(500).json({ error: 'Failed to add hotel' })
    }
  })

  router.patch('/api/trips/:id/hotels/:hotelId', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
        with: { stops: true },
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const stopIds = new Set(found.stops.map((s) => s.id))
      const existing = await db.query.hotel.findFirst({
        where: eq(hotel.id, req.params.hotelId),
      })
      if (!existing || !stopIds.has(existing.stopId)) {
        res.status(404).json({ error: 'Hotel not found' })
        return
      }

      const { name, address, checkIn, checkOut, nightlyRate, nights, notes, bookingUrl } =
        req.body as {
          name?: string
          address?: string | null
          checkIn?: string | null
          checkOut?: string | null
          nightlyRate?: number | string | null
          nights?: number | string | null
          notes?: string | null
          bookingUrl?: string | null
        }

      const patch: Partial<typeof hotel.$inferInsert> = {}
      if (name !== undefined) {
        if (!name.trim()) {
          res.status(400).json({ error: 'name cannot be empty' })
          return
        }
        patch.name = name.trim()
      }
      if (address !== undefined) patch.address = address?.trim() || null
      if (checkIn !== undefined) patch.checkIn = parseDate(checkIn, 'checkIn')
      if (checkOut !== undefined) patch.checkOut = parseDate(checkOut, 'checkOut')
      if (nightlyRate !== undefined) {
        patch.nightlyRate = parseOptionalAmount(nightlyRate, 'nightlyRate')
      }
      if (nights !== undefined) patch.nights = parseOptionalNights(nights)
      if (notes !== undefined) patch.notes = notes?.trim() || null
      if (bookingUrl !== undefined) patch.bookingUrl = bookingUrl?.trim() || null

      const [updated] = await db
        .update(hotel)
        .set(patch)
        .where(eq(hotel.id, existing.id))
        .returning()

      res.json({ hotel: serializeHotel(updated) })
    } catch (err) {
      const statusCode = (err as { status?: number }).status
      if (statusCode === 400) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
      console.error('[trips/:id/hotels/:hotelId PATCH]', err)
      res.status(500).json({ error: 'Failed to update hotel' })
    }
  })

  router.delete('/api/trips/:id/hotels/:hotelId', requireAuth, async (req, res) => {
    try {
      const userId = getAuthUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const found = await db.query.trip.findFirst({
        where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
        with: { stops: true },
      })
      if (!found) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const stopIds = new Set(found.stops.map((s) => s.id))
      const existing = await db.query.hotel.findFirst({
        where: eq(hotel.id, req.params.hotelId),
      })
      if (!existing || !stopIds.has(existing.stopId)) {
        res.status(404).json({ error: 'Hotel not found' })
        return
      }

      await db.delete(hotel).where(eq(hotel.id, existing.id))
      res.json({ ok: true })
    } catch (err) {
      console.error('[trips/:id/hotels/:hotelId DELETE]', err)
      res.status(500).json({ error: 'Failed to delete hotel' })
    }
  })

  router.post(
    '/api/trips/:id/hotels/:hotelId/add-to-budget',
    requireAuth,
    async (req, res) => {
      try {
        const userId = getAuthUserId(req)
        if (!userId) {
          res.status(401).json({ error: 'Unauthorized' })
          return
        }

        const found = await db.query.trip.findFirst({
          where: and(eq(trip.id, req.params.id), eq(trip.userId, userId)),
          with: { stops: true },
        })
        if (!found) {
          res.status(404).json({ error: 'Trip not found' })
          return
        }

        const stopIds = new Set(found.stops.map((s) => s.id))
        const hotelRow = await db.query.hotel.findFirst({
          where: eq(hotel.id, req.params.hotelId),
          with: { stop: { columns: { city: true } } },
        })
        if (!hotelRow || !stopIds.has(hotelRow.stopId)) {
          res.status(404).json({ error: 'Hotel not found' })
          return
        }

        const amount = lodgingAmountFromHotel(hotelRow)
        const nightsLabel =
          hotelRow.nights != null
            ? ` · ${hotelRow.nights} night${hotelRow.nights === 1 ? '' : 's'}`
            : ''
        const label = `${hotelRow.name} (${hotelRow.stop.city})${nightsLabel}`

        const [created] = await db
          .insert(budgetLine)
          .values({
            id: randomUUID(),
            tripId: found.id,
            category: 'lodging',
            label,
            amount,
          })
          .returning()

        const withLink = await db.query.budgetLine.findFirst({
          where: eq(budgetLine.id, created.id),
          with: {
            linkedActivity: {
              columns: { id: true, name: true, cost: true, category: true },
            },
          },
        })

        res.status(201).json({ line: serializeBudgetLine(withLink!) })
      } catch (err) {
        const statusCode = (err as { status?: number }).status
        if (statusCode === 400) {
          res.status(400).json({ error: (err as Error).message })
          return
        }
        console.error('[trips/:id/hotels/:hotelId/add-to-budget POST]', err)
        res.status(500).json({ error: 'Failed to add hotel to budget' })
      }
    },
  )

  return router
}
