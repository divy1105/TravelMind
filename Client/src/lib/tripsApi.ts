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

async function apiFetch<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`)
  }
  return data as T
}

export const tripsApi = {
  list: (token: string | null) =>
    apiFetch<{ trips: Trip[] }>('/api/trips', token),

  get: (token: string | null, id: string) =>
    apiFetch<{ trip: Trip }>(`/api/trips/${id}`, token),

  create: (token: string | null, payload: CreateTripPayload) =>
    apiFetch<{ trip: Trip }>('/api/trips', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (token: string | null, id: string, payload: UpdateTripPayload) =>
    apiFetch<{ trip: Trip }>(`/api/trips/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  remove: (token: string | null, id: string) =>
    apiFetch<{ ok: boolean }>(`/api/trips/${id}`, token, { method: 'DELETE' }),

  addStop: (
    token: string | null,
    tripId: string,
    payload: { city: string; country?: string; order?: number },
  ) =>
    apiFetch<{ stop: Stop }>(`/api/trips/${tripId}/stops`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateStop: (
    token: string | null,
    tripId: string,
    stopId: string,
    payload: Partial<{ city: string; country: string; order: number }>,
  ) =>
    apiFetch<{ stop: Stop }>(`/api/trips/${tripId}/stops/${stopId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  removeStop: (token: string | null, tripId: string, stopId: string) =>
    apiFetch<{ ok: boolean }>(`/api/trips/${tripId}/stops/${stopId}`, token, {
      method: 'DELETE',
    }),

  reorderStops: (
    token: string | null,
    tripId: string,
    stops: Array<{ id: string; order: number }>,
  ) =>
    apiFetch<{ trip: Trip }>(`/api/trips/${tripId}/stops/reorder`, token, {
      method: 'PATCH',
      body: JSON.stringify({ stops }),
    }),

  generate: (token: string | null, tripId: string) =>
    apiFetch<{ trip: Trip; budgetHint: BudgetHint | null }>(
      `/api/trips/${tripId}/generate`,
      token,
      { method: 'POST' },
    ),

  addActivity: (
    token: string | null,
    tripId: string,
    stopId: string,
    payload: CreateActivityPayload,
  ) =>
    apiFetch<{ activity: Activity }>(
      `/api/trips/${tripId}/stops/${stopId}/activities`,
      token,
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  reorderActivities: (
    token: string | null,
    tripId: string,
    stopId: string,
    activities: Array<{ id: string; order: number }>,
  ) =>
    apiFetch<{ trip: Trip }>(
      `/api/trips/${tripId}/stops/${stopId}/activities/reorder`,
      token,
      { method: 'PATCH', body: JSON.stringify({ activities }) },
    ),

  updateActivity: (
    token: string | null,
    tripId: string,
    activityId: string,
    payload: UpdateActivityPayload,
  ) =>
    apiFetch<{ activity: Activity }>(
      `/api/trips/${tripId}/activities/${activityId}`,
      token,
      { method: 'PATCH', body: JSON.stringify(payload) },
    ),

  removeActivity: (token: string | null, tripId: string, activityId: string) =>
    apiFetch<{ ok: boolean }>(`/api/trips/${tripId}/activities/${activityId}`, token, {
      method: 'DELETE',
    }),
}
