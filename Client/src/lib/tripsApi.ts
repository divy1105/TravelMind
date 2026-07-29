const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export type TripStatus = 'draft' | 'planning' | 'active' | 'completed'

export interface Activity {
  id: string
  stopId: string
  name: string
  category: string | null
  cost: string | null
  startTime: string | null
  endTime: string | null
  notes: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface Hotel {
  id: string
  stopId: string
  name: string
  address: string | null
  checkIn: string | null
  checkOut: string | null
  nightlyRate: string | null
  nights: number | null
  notes: string | null
  bookingUrl: string | null
  createdAt: string
  updatedAt: string
  stopCity?: string
  stopCountry?: string | null
  stopOrder?: number
}

export interface Stop {
  id: string
  tripId: string
  city: string
  country: string | null
  order: number
  arrivalDate: string | null
  departureDate: string | null
  createdAt: string
  updatedAt: string
  activities?: Activity[]
  hotels?: Hotel[]
}

export interface Trip {
  id: string
  userId: string
  title: string
  startDate: string
  endDate: string
  totalBudget: string
  currency: string
  interests: string[]
  status: TripStatus | string
  createdAt: string
  updatedAt: string
  stops: Stop[]
}

export interface BudgetHint {
  lodging?: number | null
  activities?: number | null
  food?: number | null
  transport?: number | null
  other?: number | null
  notes?: string | null
}

export interface CreateTripPayload {
  title: string
  startDate: string
  endDate: string
  totalBudget: number | string
  currency?: string
  interests?: string[]
  status?: string
  stops?: Array<{
    city: string
    country?: string
    order?: number
    arrivalDate?: string
    departureDate?: string
  }>
}

export interface UpdateTripPayload {
  title?: string
  startDate?: string
  endDate?: string
  totalBudget?: number | string
  currency?: string
  interests?: string[]
  status?: string
}

export interface CreateActivityPayload {
  name: string
  category?: string | null
  cost?: number | string | null
  startTime?: string | null
  endTime?: string | null
  notes?: string | null
  order?: number
}

export interface UpdateActivityPayload {
  name?: string
  category?: string | null
  cost?: number | string | null
  startTime?: string | null
  endTime?: string | null
  notes?: string | null
  order?: number
}

export type BudgetCategory = 'lodging' | 'food' | 'transport' | 'activities' | 'other'

export interface BudgetLine {
  id: string
  tripId: string
  category: BudgetCategory | string
  label: string
  amount: string
  linkedActivityId: string | null
  createdAt: string
  updatedAt: string
  linkedActivity: {
    id: string
    name: string
    cost: string | null
    category: string | null
  } | null
}

export interface BudgetActivityCost {
  id: string
  stopId: string
  stopCity: string
  name: string
  category: string | null
  cost: string
}

export interface TripBudget {
  tripId: string
  title: string
  currency: string
  totalBudget: string
  allocated: string
  remaining: string
  totalsByCategory: Record<BudgetCategory | string, string>
  plannedFromActivities: string
  lines: BudgetLine[]
  activityCosts: BudgetActivityCost[]
}

export interface CreateBudgetLinePayload {
  category: BudgetCategory | string
  label: string
  amount: number | string
  linkedActivityId?: string | null
}

export interface UpdateBudgetLinePayload {
  category?: BudgetCategory | string
  label?: string
  amount?: number | string
  linkedActivityId?: string | null
}

export interface CreateHotelPayload {
  name: string
  address?: string | null
  checkIn?: string | null
  checkOut?: string | null
  nightlyRate?: number | string | null
  nights?: number | string | null
  notes?: string | null
  bookingUrl?: string | null
}

export interface UpdateHotelPayload {
  name?: string
  address?: string | null
  checkIn?: string | null
  checkOut?: string | null
  nightlyRate?: number | string | null
  nights?: number | string | null
  notes?: string | null
  bookingUrl?: string | null
}

export interface TripHotels {
  tripId: string
  title: string
  currency: string
  hotels: Hotel[]
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  }
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`)
  }
  return data as T
}

export const tripsApi = {
  list: () => apiFetch<{ trips: Trip[] }>('/api/trips'),

  get: (id: string) => apiFetch<{ trip: Trip }>(`/api/trips/${id}`),

  create: (payload: CreateTripPayload) =>
    apiFetch<{ trip: Trip }>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateTripPayload) =>
    apiFetch<{ trip: Trip }>(`/api/trips/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  remove: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/trips/${id}`, { method: 'DELETE' }),

  addStop: (tripId: string, payload: { city: string; country?: string; order?: number }) =>
    apiFetch<{ stop: Stop }>(`/api/trips/${tripId}/stops`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateStop: (
    tripId: string,
    stopId: string,
    payload: Partial<{ city: string; country: string; order: number }>,
  ) =>
    apiFetch<{ stop: Stop }>(`/api/trips/${tripId}/stops/${stopId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  removeStop: (tripId: string, stopId: string) =>
    apiFetch<{ ok: boolean }>(`/api/trips/${tripId}/stops/${stopId}`, {
      method: 'DELETE',
    }),

  reorderStops: (tripId: string, stops: Array<{ id: string; order: number }>) =>
    apiFetch<{ trip: Trip }>(`/api/trips/${tripId}/stops/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ stops }),
    }),

  generate: (tripId: string) =>
    apiFetch<{ trip: Trip; budgetHint: BudgetHint | null }>(
      `/api/trips/${tripId}/generate`,
      { method: 'POST' },
    ),

  addActivity: (tripId: string, stopId: string, payload: CreateActivityPayload) =>
    apiFetch<{ activity: Activity }>(
      `/api/trips/${tripId}/stops/${stopId}/activities`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  reorderActivities: (
    tripId: string,
    stopId: string,
    activities: Array<{ id: string; order: number }>,
  ) =>
    apiFetch<{ trip: Trip }>(
      `/api/trips/${tripId}/stops/${stopId}/activities/reorder`,
      { method: 'PATCH', body: JSON.stringify({ activities }) },
    ),

  updateActivity: (tripId: string, activityId: string, payload: UpdateActivityPayload) =>
    apiFetch<{ activity: Activity }>(`/api/trips/${tripId}/activities/${activityId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  removeActivity: (tripId: string, activityId: string) =>
    apiFetch<{ ok: boolean }>(`/api/trips/${tripId}/activities/${activityId}`, {
      method: 'DELETE',
    }),

  getBudget: (tripId: string) => apiFetch<TripBudget>(`/api/trips/${tripId}/budget`),

  addBudgetLine: (tripId: string, payload: CreateBudgetLinePayload) =>
    apiFetch<{ line: BudgetLine }>(`/api/trips/${tripId}/budget-lines`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateBudgetLine: (tripId: string, lineId: string, payload: UpdateBudgetLinePayload) =>
    apiFetch<{ line: BudgetLine }>(`/api/trips/${tripId}/budget-lines/${lineId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  removeBudgetLine: (tripId: string, lineId: string) =>
    apiFetch<{ ok: boolean }>(`/api/trips/${tripId}/budget-lines/${lineId}`, {
      method: 'DELETE',
    }),

  getHotels: (tripId: string) => apiFetch<TripHotels>(`/api/trips/${tripId}/hotels`),

  addHotel: (tripId: string, stopId: string, payload: CreateHotelPayload) =>
    apiFetch<{ hotel: Hotel }>(`/api/trips/${tripId}/stops/${stopId}/hotels`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateHotel: (tripId: string, hotelId: string, payload: UpdateHotelPayload) =>
    apiFetch<{ hotel: Hotel }>(`/api/trips/${tripId}/hotels/${hotelId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  removeHotel: (tripId: string, hotelId: string) =>
    apiFetch<{ ok: boolean }>(`/api/trips/${tripId}/hotels/${hotelId}`, {
      method: 'DELETE',
    }),

  addHotelToBudget: (tripId: string, hotelId: string) =>
    apiFetch<{ line: BudgetLine }>(
      `/api/trips/${tripId}/hotels/${hotelId}/add-to-budget`,
      { method: 'POST' },
    ),
}
