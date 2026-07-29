import { Link } from 'react-router-dom'
import { Calendar, MapPin, Wallet } from 'lucide-react'
import type { Trip } from '../../lib/tripsApi'
import { destinationCoverUrl } from '../../lib/destinationCover'
import { Badge } from '../ui/Badge'

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

function formatMoney(value: string | number, currency: string) {
  const n = Number(value)
  if (!Number.isFinite(n)) return `${value} ${currency}`
  return `${n.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })} ${currency}`
}

function statusVariant(status: string): 'default' | 'accent' | 'muted' | 'success' {
  const s = status.toLowerCase()
  if (s === 'active') return 'success'
  if (s === 'planning') return 'default'
  if (s === 'completed') return 'muted'
  return 'accent'
}

export function TripCard({ trip }: { trip: Trip }) {
  const stops = trip.stops ?? []
  const firstCity = [...stops].sort((a, b) => a.order - b.order)[0]?.city
  const cover = destinationCoverUrl(firstCity)
  const cities = [...stops]
    .sort((a, b) => a.order - b.order)
    .map((s) => s.city)
    .filter(Boolean)

  return (
    <Link
      to={`/planner/${trip.id}`}
      className="group block overflow-hidden rounded-lg border border-border bg-surface transition hover:border-brand/40 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={cover}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-fg/55 via-fg/10 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-brand-fg drop-shadow">
            {trip.title}
          </h3>
          <Badge variant={statusVariant(trip.status)} className="capitalize backdrop-blur-sm">
            {trip.status}
          </Badge>
        </div>
      </div>
      <div className="space-y-2 px-4 py-3">
        <p className="flex items-center gap-2 text-sm text-muted-fg">
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
        </p>
        <p className="flex items-center gap-2 text-sm text-muted-fg">
          <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Budget {formatMoney(trip.totalBudget, trip.currency)}
        </p>
        <p className="flex items-start gap-2 text-sm text-muted-fg">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="line-clamp-2">
            {cities.length > 0
              ? cities.join(' → ')
              : 'No stops yet — open to add cities'}
          </span>
        </p>
      </div>
    </Link>
  )
}

export function TripCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="aspect-[16/10] animate-pulse bg-muted" />
      <div className="space-y-2 px-4 py-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
