import { useState } from 'react'
import { Link } from 'react-router-dom'
import ImmersiveGlobe from '../components/Immersive/ImmersiveGlobe'
import { FEATURED_CITIES } from '../components/Immersive/featuredCities'

export default function HomePage() {
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null)
  const selectedCity = FEATURED_CITIES.find((city) => city.id === selectedCityId)

  return (
    <section className="space-y-8">
      <div className="overflow-hidden rounded-2xl border border-fg/10 bg-gradient-to-br from-sky-950/20 via-bg to-indigo-950/10">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(280px,1.1fr)] lg:items-center">
          <div className="space-y-5 p-6 lg:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-400/90">
              Module 3 · 3D Immersion
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-fg sm:text-4xl">
              Travel the world before you pack a bag
            </h1>
            <p className="max-w-prose text-fg/80">
              Explore featured destinations on an interactive globe. Click a city to
              highlight it, then open the planner when you are ready to shape your
              itinerary.
            </p>
            {selectedCity && (
              <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-fg">
                Dreaming of <span className="font-medium">{selectedCity.name}</span>?
                Start planning your route.
              </p>
            )}
            <Link
              to="/planner"
              className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-400"
            >
              Open planner
            </Link>
          </div>

          <div className="h-[320px] lg:h-[460px]">
            <ImmersiveGlobe
              selectedCityId={selectedCityId}
              onCitySelect={setSelectedCityId}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
