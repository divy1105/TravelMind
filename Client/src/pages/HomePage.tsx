import React from 'react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">TravelMind</h1>
      <p className="text-fg/80">
        Plan trips with a calm, focused workflow. Planner tools will be added next.
      </p>
      <Link
        to="/planner"
        className="inline-flex items-center rounded bg-fg/10 px-4 py-2 text-fg hover:bg-fg/15"
      >
        Open planner (coming soon)
      </Link>
    </section>
  )
}

