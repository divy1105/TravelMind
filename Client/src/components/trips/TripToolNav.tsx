import { Link, useLocation } from 'react-router-dom'
import { BedDouble, LayoutDashboard, ListOrdered, Wallet } from 'lucide-react'

const tools = [
  { suffix: '', label: 'Overview', icon: LayoutDashboard, end: true },
  { suffix: '/itinerary', label: 'Itinerary', icon: ListOrdered },
  { suffix: '/budget', label: 'Budget', icon: Wallet },
  { suffix: '/hotels', label: 'Hotels', icon: BedDouble },
] as const

export function TripToolNav({ tripId }: { tripId: string }) {
  const { pathname } = useLocation()
  const base = `/planner/${tripId}`

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1"
      aria-label="Trip tools"
    >
      {tools.map(({ suffix, label, icon: Icon, end }) => {
        const to = `${base}${suffix}`
        const active = end
          ? pathname === base || pathname === `${base}/`
          : pathname.startsWith(to)
        return (
          <Link
            key={to}
            to={to}
            className={[
              'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition',
              active
                ? 'bg-brand text-brand-fg shadow-soft'
                : 'text-muted-fg hover:bg-muted hover:text-fg',
            ].join(' ')}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
