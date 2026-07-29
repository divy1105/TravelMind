import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'
import ImmersiveGlobe from '../components/Immersive/ImmersiveGlobe'
import { FEATURED_CITIES } from '../components/Immersive/featuredCities'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

export default function HomePage() {
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null)
  const selectedCity = FEATURED_CITIES.find((city) => city.id === selectedCityId)

  return (
    <section className="space-y-8">
      <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-brand/10 via-surface to-accent/20 shadow-soft">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(280px,1.1fr)] lg:items-center">
          <div className="space-y-5 p-6 lg:p-8">
            <p className="font-display text-3xl font-semibold tracking-tight text-brand sm:text-4xl dark:text-brand">
              TravelMind
            </p>
            <h1 className="font-display text-2xl font-medium leading-snug text-fg sm:text-3xl">
              Travel the world before you pack a bag
            </h1>
            <p className="max-w-prose text-muted-fg">
              Explore featured destinations on an interactive globe. Click a city to
              highlight it, then open the planner when you are ready to shape your
              itinerary.
            </p>
            {selectedCity && (
              <div className="flex items-center gap-2 rounded-md border border-accent/50 bg-accent/25 px-3 py-2 text-sm text-fg">
                <MapPin className="h-4 w-4 shrink-0 text-brand" />
                <span>
                  Dreaming of <span className="font-medium">{selectedCity.name}</span>?
                  Start planning your route.
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/planner">
                <Button className="gap-2">
                  Open planner
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Badge variant="accent">AI trip drafts</Badge>
            </div>
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
