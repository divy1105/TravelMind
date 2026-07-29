import { Router } from 'express'
import type { PrismaClient, Prisma } from '@prisma/client'
import { requireAuth, getAuth } from '../middleware/auth'
import { generateTripPlan } from '../services/geminiTripPlanner'

const VALID_STATUSES = new Set(['draft', 'planning', 'active', 'completed'])

const tripInclude = {
  stops: {
    orderBy: { order: 'asc' as const },
    include: { activities: { orderBy: { order: 'asc' as const } } },
  },
}

type StopInput = {
  city: string
  country?: string | null
  order?: number
  arrivalDate?: string | null
  departureDate?: string | null
}

type ActivityRow = {
  id: string
  stopId: string
  name: string
  category: string | null
  cost: Prisma.Decimal | null
  startTime: string | null
  endTime: string | null
  notes: string | null
  order: number
  createdAt: Date
  updatedAt: Date
}

async function resolveDbUser(prisma: PrismaClient, externalId: string) {
  return prisma.user.findUnique({ where: { externalId } })
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

function serializeActivity(activity: ActivityRow) {
  return {
    ...activity,
    cost: activity.cost != null ? activity.cost.toString() : null,
  }
}

function serializeTrip(trip: {
  id: string
  userId: string
  title: string
  startDate: Date
  endDate: Date
  totalBudget: Prisma.Decimal
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
  }>
}) {
  return {
    ...trip,
    totalBudget: trip.totalBudget.toString(),
    stops: trip.stops?.map((stop) => ({
      ...stop,
      activities: (stop.activities ?? []).map(serializeActivity),
    })),
  }
}

export function tripsRouter(prisma: PrismaClient) {
  const router = Router()

  // POST /api/trips — create trip (optional stops)
  router.post('/api/trips', requireAuth(), async (req, res) => {
    try {
      const { userId: externalId } = getAuth(req)
      if (!externalId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const user = await resolveDbUser(prisma, externalId)
      if (!user) {
        res.status(404).json({ error: 'User not found. Sync auth first.' })
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

      const stopCreates =
        Array.isArray(stops) && stops.length > 0
          ? stops
              .filter((s) => s.city?.trim())
              .map((s, idx) => ({
                city: s.city.trim(),
                country: s.country?.trim() || null,
                order: typeof s.order === 'number' ? s.order : idx,
                arrivalDate: parseDate(s.arrivalDate, 'arrivalDate'),
                departureDate: parseDate(s.departureDate, 'departureDate'),
              }))
          : []

      const trip = await prisma.trip.create({
        data: {
          userId: user.id,
          title: title.trim(),
          startDate: start,
          endDate: end,
          totalBudget,
          currency: currency?.trim() || 'USD',
          interests: interestList,
          status: tripStatus,
          ...(stopCreates.length > 0 && {
            stops: { create: stopCreates },
          }),
        },
        include: tripInclude,
      })

      res.status(201).json({ trip: serializeTrip(trip) })
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 400) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
      console.error('[trips POST]', err)
      res.status(500).json({ error: 'Failed to create trip' })
    }
  })

  // GET /api/trips — list current user's trips
  router.get('/api/trips', requireAuth(), async (req, res) => {
    try {
      const { userId: externalId } = getAuth(req)
      if (!externalId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const user = await resolveDbUser(prisma, externalId)
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      const trips = await prisma.trip.findMany({
        where: { userId: user.id },
        include: tripInclude,
        orderBy: { startDate: 'asc' },
      })

      res.json({ trips: trips.map(serializeTrip) })
    } catch (err) {
      console.error('[trips GET]', err)
      res.status(500).json({ error: 'Failed to list trips' })
    }
  })

  // GET /api/trips/:id — get trip + stops (owner only)
  router.get('/api/trips/:id', requireAuth(), async (req, res) => {
    try {
      const { userId: externalId } = getAuth(req)
      if (!externalId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const user = await resolveDbUser(prisma, externalId)
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      const trip = await prisma.trip.findFirst({
        where: { id: req.params.id, userId: user.id },
        include: tripInclude,
      })

      if (!trip) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      res.json({ trip: serializeTrip(trip) })
    } catch (err) {
      console.error('[trips/:id GET]', err)
      res.status(500).json({ error: 'Failed to fetch trip' })
    }
  })

  // PATCH /api/trips/:id — update trip metadata
  router.patch('/api/trips/:id', requireAuth(), async (req, res) => {
    try {
      const { userId: externalId } = getAuth(req)
      if (!externalId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const user = await resolveDbUser(prisma, externalId)
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      const existing = await prisma.trip.findFirst({
        where: { id: req.params.id, userId: user.id },
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
        status,
      } = req.body as {
        title?: string
        startDate?: string
        endDate?: string
        totalBudget?: number | string
        currency?: string
        interests?: string[]
        status?: string
      }

      const data: Prisma.TripUpdateInput = {}

      if (title !== undefined) {
        if (!title.trim()) {
          res.status(400).json({ error: 'title cannot be empty' })
          return
        }
        data.title = title.trim()
      }
      if (startDate !== undefined) data.startDate = requireDate(startDate, 'startDate')
      if (endDate !== undefined) data.endDate = requireDate(endDate, 'endDate')
      if (totalBudget !== undefined) data.totalBudget = totalBudget
      if (currency !== undefined) data.currency = currency.trim() || existing.currency
      if (interests !== undefined) {
        data.interests = Array.isArray(interests)
          ? interests.map((i) => String(i).trim()).filter(Boolean)
          : []
      }
      if (status !== undefined) {
        if (!VALID_STATUSES.has(status)) {
          res.status(400).json({ error: 'Invalid status' })
          return
        }
        data.status = status
      }

      const nextStart = (data.startDate as Date | undefined) ?? existing.startDate
      const nextEnd = (data.endDate as Date | undefined) ?? existing.endDate
      if (nextEnd < nextStart) {
        res.status(400).json({ error: 'endDate must be on or after startDate' })
        return
      }

      const trip = await prisma.trip.update({
        where: { id: existing.id },
        data,
        include: tripInclude,
      })

      res.json({ trip: serializeTrip(trip) })
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 400) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
      console.error('[trips/:id PATCH]', err)
      res.status(500).json({ error: 'Failed to update trip' })
    }
  })

  // DELETE /api/trips/:id
  router.delete('/api/trips/:id', requireAuth(), async (req, res) => {
    try {
      const { userId: externalId } = getAuth(req)
      if (!externalId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const user = await resolveDbUser(prisma, externalId)
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      const existing = await prisma.trip.findFirst({
        where: { id: req.params.id, userId: user.id },
      })
      if (!existing) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      await prisma.trip.delete({ where: { id: existing.id } })
      res.json({ ok: true })
    } catch (err) {
      console.error('[trips/:id DELETE]', err)
      res.status(500).json({ error: 'Failed to delete trip' })
    }
  })

  // POST /api/trips/:id/stops — add stop
  router.post('/api/trips/:id/stops', requireAuth(), async (req, res) => {
    try {
      const { userId: externalId } = getAuth(req)
      if (!externalId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const user = await resolveDbUser(prisma, externalId)
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      const trip = await prisma.trip.findFirst({
        where: { id: req.params.id, userId: user.id },
        include: { stops: true },
      })
      if (!trip) {
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
          : trip.stops.reduce((max, s) => Math.max(max, s.order), -1) + 1

      const stop = await prisma.stop.create({
        data: {
          tripId: trip.id,
          city: city.trim(),
          country: country?.trim() || null,
          order: nextOrder,
          arrivalDate: parseDate(arrivalDate, 'arrivalDate'),
          departureDate: parseDate(departureDate, 'departureDate'),
        },
      })

      res.status(201).json({ stop })
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 400) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
      console.error('[trips/:id/stops POST]', err)
      res.status(500).json({ error: 'Failed to add stop' })
    }
  })

  // PATCH /api/trips/:id/stops/reorder — reorder stops
  router.patch('/api/trips/:id/stops/reorder', requireAuth(), async (req, res) => {
    try {
      const { userId: externalId } = getAuth(req)
      if (!externalId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const user = await resolveDbUser(prisma, externalId)
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      const trip = await prisma.trip.findFirst({
        where: { id: req.params.id, userId: user.id },
        include: { stops: true },
      })
      if (!trip) {
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

      const ownedIds = new Set(trip.stops.map((s) => s.id))
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

      await prisma.$transaction(
        orderList.map((item) =>
          prisma.stop.update({
            where: { id: item.id },
            data: { order: item.order },
          }),
        ),
      )

      const updated = await prisma.trip.findUnique({
        where: { id: trip.id },
        include: tripInclude,
      })

      res.json({ trip: serializeTrip(updated!) })
    } catch (err) {
      console.error('[trips/:id/stops/reorder PATCH]', err)
      res.status(500).json({ error: 'Failed to reorder stops' })
    }
  })

  // PATCH /api/trips/:id/stops/:stopId — update stop
  router.patch('/api/trips/:id/stops/:stopId', requireAuth(), async (req, res) => {
    try {
      const { userId: externalId } = getAuth(req)
      if (!externalId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const user = await resolveDbUser(prisma, externalId)
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      const trip = await prisma.trip.findFirst({
        where: { id: req.params.id, userId: user.id },
      })
      if (!trip) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const existing = await prisma.stop.findFirst({
        where: { id: req.params.stopId, tripId: trip.id },
      })
      if (!existing) {
        res.status(404).json({ error: 'Stop not found' })
        return
      }

      const { city, country, order, arrivalDate, departureDate } = req.body as StopInput & {
        order?: number
      }

      const data: Prisma.StopUpdateInput = {}
      if (city !== undefined) {
        if (!city.trim()) {
          res.status(400).json({ error: 'city cannot be empty' })
          return
        }
        data.city = city.trim()
      }
      if (country !== undefined) data.country = country?.trim() || null
      if (order !== undefined) data.order = order
      if (arrivalDate !== undefined) data.arrivalDate = parseDate(arrivalDate, 'arrivalDate')
      if (departureDate !== undefined) data.departureDate = parseDate(departureDate, 'departureDate')

      const stop = await prisma.stop.update({
        where: { id: existing.id },
        data,
      })

      res.json({ stop })
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 400) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
      console.error('[trips/:id/stops/:stopId PATCH]', err)
      res.status(500).json({ error: 'Failed to update stop' })
    }
  })

  // DELETE /api/trips/:id/stops/:stopId
  router.delete('/api/trips/:id/stops/:stopId', requireAuth(), async (req, res) => {
    try {
      const { userId: externalId } = getAuth(req)
      if (!externalId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const user = await resolveDbUser(prisma, externalId)
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      const trip = await prisma.trip.findFirst({
        where: { id: req.params.id, userId: user.id },
      })
      if (!trip) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const existing = await prisma.stop.findFirst({
        where: { id: req.params.stopId, tripId: trip.id },
      })
      if (!existing) {
        res.status(404).json({ error: 'Stop not found' })
        return
      }

      await prisma.stop.delete({ where: { id: existing.id } })
      res.json({ ok: true })
    } catch (err) {
      console.error('[trips/:id/stops/:stopId DELETE]', err)
      res.status(500).json({ error: 'Failed to delete stop' })
    }
  })

  /**
   * POST /api/trips/:id/generate — AI itinerary draft (owner only).
   * Replace strategy: deletes ALL existing activities on every stop for this trip,
   * then inserts the newly generated activities (hotels stored as category "hotel").
   */
  router.post('/api/trips/:id/generate', requireAuth(), async (req, res) => {
    try {
      const { userId: externalId } = getAuth(req)
      if (!externalId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const user = await resolveDbUser(prisma, externalId)
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      const trip = await prisma.trip.findFirst({
        where: { id: req.params.id, userId: user.id },
        include: { stops: { orderBy: { order: 'asc' } } },
      })
      if (!trip) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }
      if (trip.stops.length === 0) {
        res.status(400).json({ error: 'Add at least one stop before generating a plan' })
        return
      }

      const { prompt, plan, rawJson } = await generateTripPlan({
        id: trip.id,
        title: trip.title,
        startDate: trip.startDate,
        endDate: trip.endDate,
        totalBudget: trip.totalBudget.toString(),
        currency: trip.currency,
        interests: trip.interests,
        stops: trip.stops,
      })

      const stopIds = trip.stops.map((s) => s.id)

      await prisma.$transaction(async (tx) => {
        await tx.activity.deleteMany({ where: { stopId: { in: stopIds } } })

        await tx.aiGeneration.create({
          data: {
            tripId: trip.id,
            prompt,
            rawJson: rawJson as Prisma.InputJsonValue,
          },
        })

        for (const planned of plan.stops) {
          const rows: Prisma.ActivityCreateManyInput[] = []

          if (planned.hotelSuggestion?.name) {
            const nightly = planned.hotelSuggestion.estimatedNightlyCost
            const hotelNotes = [
              nightly != null ? `Est. ${nightly} ${trip.currency}/night` : null,
              planned.hotelSuggestion.notes,
            ]
              .filter(Boolean)
              .join(' · ')

            rows.push({
              stopId: planned.stopId,
              name: planned.hotelSuggestion.name,
              category: 'hotel',
              cost: nightly ?? null,
              notes: hotelNotes || null,
              order: 0,
            })
          }

          planned.activities.forEach((act, idx) => {
            rows.push({
              stopId: planned.stopId,
              name: act.name,
              category: act.category ?? null,
              cost: act.cost ?? null,
              startTime: act.startTime ?? null,
              endTime: act.endTime ?? null,
              notes: act.notes ?? null,
              order: idx + 1,
            })
          })

          if (rows.length > 0) {
            await tx.activity.createMany({ data: rows })
          }
        }

        if (trip.status === 'draft') {
          await tx.trip.update({
            where: { id: trip.id },
            data: { status: 'planning' },
          })
        }
      })

      const updated = await prisma.trip.findUnique({
        where: { id: trip.id },
        include: tripInclude,
      })

      res.json({
        trip: serializeTrip(updated!),
        budgetHint: plan.budgetHint ?? null,
      })
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 400 || status === 503 || status === 502) {
        res.status(status).json({ error: (err as Error).message })
        return
      }
      console.error('[trips/:id/generate POST]', err)
      res.status(500).json({ error: 'Failed to generate trip plan' })
    }
  })

  // PATCH /api/trips/:id/activities/:activityId — edit activity
  router.patch('/api/trips/:id/activities/:activityId', requireAuth(), async (req, res) => {
    try {
      const { userId: externalId } = getAuth(req)
      if (!externalId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const user = await resolveDbUser(prisma, externalId)
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      const trip = await prisma.trip.findFirst({
        where: { id: req.params.id, userId: user.id },
        include: { stops: true },
      })
      if (!trip) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const stopIds = new Set(trip.stops.map((s) => s.id))
      const existing = await prisma.activity.findFirst({
        where: { id: req.params.activityId },
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

      const data: Prisma.ActivityUpdateInput = {}
      if (name !== undefined) {
        if (!name.trim()) {
          res.status(400).json({ error: 'name cannot be empty' })
          return
        }
        data.name = name.trim()
      }
      if (category !== undefined) data.category = category?.trim() || null
      if (cost !== undefined) data.cost = cost === '' || cost === null ? null : cost
      if (startTime !== undefined) data.startTime = startTime?.trim() || null
      if (endTime !== undefined) data.endTime = endTime?.trim() || null
      if (notes !== undefined) data.notes = notes?.trim() || null
      if (order !== undefined) data.order = order

      const activity = await prisma.activity.update({
        where: { id: existing.id },
        data,
      })

      res.json({ activity: serializeActivity(activity) })
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 400) {
        res.status(400).json({ error: (err as Error).message })
        return
      }
      console.error('[trips/:id/activities/:activityId PATCH]', err)
      res.status(500).json({ error: 'Failed to update activity' })
    }
  })

  // DELETE /api/trips/:id/activities/:activityId
  router.delete('/api/trips/:id/activities/:activityId', requireAuth(), async (req, res) => {
    try {
      const { userId: externalId } = getAuth(req)
      if (!externalId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const user = await resolveDbUser(prisma, externalId)
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      const trip = await prisma.trip.findFirst({
        where: { id: req.params.id, userId: user.id },
        include: { stops: true },
      })
      if (!trip) {
        res.status(404).json({ error: 'Trip not found' })
        return
      }

      const stopIds = new Set(trip.stops.map((s) => s.id))
      const existing = await prisma.activity.findFirst({
        where: { id: req.params.activityId },
      })
      if (!existing || !stopIds.has(existing.stopId)) {
        res.status(404).json({ error: 'Activity not found' })
        return
      }

      await prisma.activity.delete({ where: { id: existing.id } })
      res.json({ ok: true })
    } catch (err) {
      console.error('[trips/:id/activities/:activityId DELETE]', err)
      res.status(500).json({ error: 'Failed to delete activity' })
    }
  })

  return router
}
