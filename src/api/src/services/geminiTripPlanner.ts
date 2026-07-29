import { GoogleGenAI, Type } from '@google/genai'

export type PlannedActivity = {
  name: string
  category?: string | null
  cost?: number | null
  startTime?: string | null
  endTime?: string | null
  notes?: string | null
}

export type PlannedStop = {
  stopId: string
  hotelSuggestion?: {
    name: string
    estimatedNightlyCost?: number | null
    notes?: string | null
  } | null
  activities: PlannedActivity[]
}

export type TripPlanResult = {
  stops: PlannedStop[]
  budgetHint?: {
    lodging?: number | null
    activities?: number | null
    food?: number | null
    transport?: number | null
    other?: number | null
    notes?: string | null
  } | null
}

export type TripForPlanning = {
  id: string
  title: string
  startDate: Date
  endDate: Date
  totalBudget: string
  currency: string
  interests: string[]
  stops: Array<{
    id: string
    city: string
    country: string | null
    order: number
    arrivalDate: Date | null
    departureDate: Date | null
  }>
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    stops: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stopId: { type: Type.STRING },
          hotelSuggestion: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              estimatedNightlyCost: { type: Type.NUMBER },
              notes: { type: Type.STRING },
            },
            required: ['name'],
          },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                cost: { type: Type.NUMBER },
                startTime: { type: Type.STRING },
                endTime: { type: Type.STRING },
                notes: { type: Type.STRING },
              },
              required: ['name'],
            },
          },
        },
        required: ['stopId', 'activities'],
      },
    },
    budgetHint: {
      type: Type.OBJECT,
      properties: {
        lodging: { type: Type.NUMBER },
        activities: { type: Type.NUMBER },
        food: { type: Type.NUMBER },
        transport: { type: Type.NUMBER },
        other: { type: Type.NUMBER },
        notes: { type: Type.STRING },
      },
    },
  },
  required: ['stops'],
}

function buildPrompt(trip: TripForPlanning): string {
  const stopLines = trip.stops
    .map((s) => {
      const dates =
        s.arrivalDate || s.departureDate
          ? ` (${s.arrivalDate ? `arrive ${s.arrivalDate.toISOString().slice(0, 10)}` : ''}${
              s.arrivalDate && s.departureDate ? ' – ' : ''
            }${s.departureDate ? `depart ${s.departureDate.toISOString().slice(0, 10)}` : ''})`
          : ''
      return `- stopId="${s.id}" order=${s.order}: ${s.city}${s.country ? `, ${s.country}` : ''}${dates}`
    })
    .join('\n')

  return `You are a travel planner. Create a practical draft itinerary for this trip.

Trip: ${trip.title}
Dates: ${trip.startDate.toISOString().slice(0, 10)} to ${trip.endDate.toISOString().slice(0, 10)}
Total budget: ${trip.totalBudget} ${trip.currency}
Interests: ${trip.interests.length ? trip.interests.join(', ') : 'general sightseeing'}

Stops (use these exact stopId values):
${stopLines}

Requirements:
- For each stop, suggest 3–6 activities matching the interests and budget.
- Include category when useful (e.g. food, culture, nature, nightlife, sightseeing).
- Estimate cost in ${trip.currency} as a number when reasonable; use 0 for free activities.
- Include flexible time windows as "HH:MM" strings when helpful.
- For each stop, include one light hotelSuggestion (name + estimatedNightlyCost + brief notes). Do not invent booking links.
- Include budgetHint with a rough split of the total budget across lodging, activities, food, transport, other (numbers in ${trip.currency}).
- Keep notes short and actionable.
- Only return JSON matching the schema. Every stopId in the response must match one of the provided stopIds.`
}

export async function generateTripPlan(trip: TripForPlanning): Promise<{
  prompt: string
  plan: TripPlanResult
  rawJson: unknown
}> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw Object.assign(new Error('GEMINI_API_KEY is not configured'), { status: 503 })
  }

  if (trip.stops.length === 0) {
    throw Object.assign(new Error('Add at least one stop before generating a plan'), {
      status: 400,
    })
  }

  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash'
  const prompt = buildPrompt(trip)
  const ai = new GoogleGenAI({ apiKey })

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_SCHEMA,
      temperature: 0.7,
    },
  })

  const text = response.text
  if (!text?.trim()) {
    throw Object.assign(new Error('Gemini returned an empty response'), { status: 502 })
  }

  let rawJson: unknown
  try {
    rawJson = JSON.parse(text)
  } catch {
    throw Object.assign(new Error('Gemini returned invalid JSON'), { status: 502 })
  }

  const plan = normalizePlan(rawJson, trip)
  return { prompt, plan, rawJson }
}

function normalizePlan(raw: unknown, trip: TripForPlanning): TripPlanResult {
  const owned = new Set(trip.stops.map((s) => s.id))
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const stopsRaw = Array.isArray(obj.stops) ? obj.stops : []

  const stops: PlannedStop[] = []
  for (const item of stopsRaw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const stopId = String(row.stopId || '')
    if (!owned.has(stopId)) continue

    const activitiesRaw = Array.isArray(row.activities) ? row.activities : []
    const activities: PlannedActivity[] = activitiesRaw
      .filter((a) => a && typeof a === 'object' && String((a as { name?: string }).name || '').trim())
      .map((a) => {
        const act = a as Record<string, unknown>
        return {
          name: String(act.name).trim(),
          category: act.category != null ? String(act.category) : null,
          cost: typeof act.cost === 'number' && Number.isFinite(act.cost) ? act.cost : null,
          startTime: act.startTime != null ? String(act.startTime) : null,
          endTime: act.endTime != null ? String(act.endTime) : null,
          notes: act.notes != null ? String(act.notes) : null,
        }
      })

    let hotelSuggestion: PlannedStop['hotelSuggestion'] = null
    if (row.hotelSuggestion && typeof row.hotelSuggestion === 'object') {
      const h = row.hotelSuggestion as Record<string, unknown>
      if (h.name && String(h.name).trim()) {
        hotelSuggestion = {
          name: String(h.name).trim(),
          estimatedNightlyCost:
            typeof h.estimatedNightlyCost === 'number' && Number.isFinite(h.estimatedNightlyCost)
              ? h.estimatedNightlyCost
              : null,
          notes: h.notes != null ? String(h.notes) : null,
        }
      }
    }

    stops.push({ stopId, hotelSuggestion, activities })
  }

  // Ensure every trip stop appears (even if model omitted one)
  for (const s of trip.stops) {
    if (!stops.some((x) => x.stopId === s.id)) {
      stops.push({ stopId: s.id, hotelSuggestion: null, activities: [] })
    }
  }

  let budgetHint: TripPlanResult['budgetHint'] = null
  if (obj.budgetHint && typeof obj.budgetHint === 'object') {
    const b = obj.budgetHint as Record<string, unknown>
    budgetHint = {
      lodging: typeof b.lodging === 'number' ? b.lodging : null,
      activities: typeof b.activities === 'number' ? b.activities : null,
      food: typeof b.food === 'number' ? b.food : null,
      transport: typeof b.transport === 'number' ? b.transport : null,
      other: typeof b.other === 'number' ? b.other : null,
      notes: b.notes != null ? String(b.notes) : null,
    }
  }

  return { stops, budgetHint }
}
