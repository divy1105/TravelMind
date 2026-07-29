import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Brain,
  Hotel,
  Map,
  Sparkles,
  Wallet,
} from 'lucide-react'
import ImmersiveGlobe from '../components/Immersive/ImmersiveGlobe'
import { FEATURED_CITIES } from '../components/Immersive/featuredCities'
import { Button } from '../components/ui/Button'

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
}

const steps = [
  {
    title: 'Sketch the trip',
    body: 'Name your cities, dates, and budget. TravelMind holds the multi-stop shell.',
  },
  {
    title: 'Let AI draft the days',
    body: 'Gemini fills activities from your interests — then you drag, drop, and refine.',
  },
  {
    title: 'Balance stay and spend',
    body: 'Hotels and budget lines stay linked so the plan stays honest before you go.',
  },
]

const features = [
  {
    icon: Brain,
    title: 'AI itineraries',
    body: 'One generate action drafts a full multi-city day plan you can edit.',
  },
  {
    icon: Map,
    title: 'Stop-by-stop board',
    body: 'Drag activities between days and cities without losing the thread.',
  },
  {
    icon: Wallet,
    title: 'Live budget sense',
    body: 'Category totals against your trip ceiling — know what is left.',
  },
  {
    icon: Hotel,
    title: 'Hotels that count',
    body: 'Log stays per stop and push lodging into the budget in one tap.',
  },
]

export default function HomePage() {
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null)
  const reduceMotion = useReducedMotion()
  const selectedCity = FEATURED_CITIES.find((city) => city.id === selectedCityId)

  const sectionMotion = reduceMotion
    ? {}
    : {
        initial: 'hidden' as const,
        whileInView: 'show' as const,
        viewport: { once: true, amount: 0.25 },
        variants: fadeUp,
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
      }

  return (
    <div className="bg-bg text-fg">
      {/* Hero — brand + one headline + one line + CTAs + full-bleed globe */}
      <section className="relative isolate min-h-[calc(100svh-3.75rem)] overflow-hidden bg-[#061820] text-white">
        <div className="absolute inset-0">
          <ImmersiveGlobe
            selectedCityId={selectedCityId}
            onCitySelect={setSelectedCityId}
            showCaption={false}
            className="h-full min-h-[calc(100svh-3.75rem)]"
          />
        </div>

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#041018]/92 via-[#061820]/55 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#061820] to-transparent"
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-3.75rem)] w-full max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
          <motion.div
            className="pointer-events-auto max-w-xl space-y-6"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="font-display text-5xl font-semibold tracking-tight text-[#E8D5B5] sm:text-6xl lg:text-7xl">
              TravelMind
            </p>
            <h1 className="font-display text-2xl font-medium leading-snug text-white/95 sm:text-3xl">
              Travel the world before you pack a bag
            </h1>
            <p className="max-w-md text-base text-white/70 sm:text-lg">
              Plan multi-city trips with AI drafts, drag-and-drop days, hotels, and a
              budget that stays honest.
            </p>
            {selectedCity && (
              <p className="text-sm text-[#E8D5B5]/90">
                Dreaming of {selectedCity.name}? Start shaping the route.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link to="/planner">
                <Button size="lg" className="gap-2 bg-[#E8D5B5] text-[#0B3D4A] hover:opacity-95">
                  Open planner
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/sign-up">
                <Button
                  size="lg"
                  variant="ghost"
                  className="border border-white/25 text-white hover:bg-white/10"
                >
                  Create account
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/60 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div {...sectionMotion} className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand">
              How it works
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              Three moves from idea to itinerary
            </h2>
            <p className="mt-3 text-muted-fg">
              Keep the shell simple. Let the AI fill days. You stay in control of every stop.
            </p>
          </motion.div>

          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {steps.map((step, index) => (
              <motion.li
                key={step.title}
                {...sectionMotion}
                transition={{
                  duration: 0.5,
                  delay: reduceMotion ? 0 : index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative"
              >
                <span className="font-display text-4xl font-semibold text-brand/25">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 font-display text-xl font-semibold text-fg">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-fg">{step.body}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/60 bg-bg">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div {...sectionMotion} className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand">
              Features
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              A travel workspace, not a form dump
            </h2>
            <p className="mt-3 text-muted-fg">
              Everything you need for a serious multi-city plan — without another dashboard
              of clutter.
            </p>
          </motion.div>

          <ul className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2">
            {features.map((feature, index) => (
              <motion.li
                key={feature.title}
                {...sectionMotion}
                transition={{
                  duration: 0.5,
                  delay: reduceMotion ? 0 : index * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="flex gap-4"
              >
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
                  <feature.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-fg">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-fg">
                    {feature.body}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* Destination mosaic */}
      <section className="border-t border-border/60 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div {...sectionMotion} className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand">
              Destinations
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              Places the globe already knows
            </h2>
            <p className="mt-3 text-muted-fg">
              Click a city on the globe above, or start from one of these anchors.
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:grid-rows-2 lg:gap-4">
            {FEATURED_CITIES.map((city, index) => {
              const span =
                index === 0
                  ? 'lg:col-span-3 lg:row-span-2 min-h-[280px] lg:min-h-0'
                  : index === 1
                    ? 'lg:col-span-3 min-h-[200px]'
                    : 'lg:col-span-2 min-h-[180px]'
              return (
                <motion.button
                  key={city.id}
                  type="button"
                  {...sectionMotion}
                  transition={{
                    duration: 0.5,
                    delay: reduceMotion ? 0 : index * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  onClick={() => {
                    setSelectedCityId(city.id)
                    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
                  }}
                  className={`group relative overflow-hidden text-left ${span}`}
                >
                  <img
                    src={city.imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#041018]/90 via-[#041018]/25 to-transparent" />
                  <div className="relative flex h-full flex-col justify-end p-5 text-white">
                    <p className="font-display text-xl font-semibold sm:text-2xl">
                      {city.name}
                    </p>
                    <p className="mt-1 text-sm text-white/75">{city.blurb}</p>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-border/60 bg-brand text-brand-fg">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 20% 0%, hsl(38 51% 81% / 0.25), transparent 50%), radial-gradient(ellipse at 90% 100%, hsl(186 40% 40% / 0.35), transparent 45%)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <motion.div {...sectionMotion} className="max-w-xl">
            <Sparkles className="mb-4 h-6 w-6 text-accent" aria-hidden />
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Your next route starts here
            </h2>
            <p className="mt-3 text-brand-fg/80">
              Sign in, create a trip, and let TravelMind draft the days while you keep the
              taste.
            </p>
          </motion.div>
          <motion.div
            {...sectionMotion}
            className="flex flex-wrap gap-3"
            transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.1 }}
          >
            <Link to="/sign-up">
              <Button
                size="lg"
                className="gap-2 bg-accent text-accent-fg hover:opacity-95"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/planner">
              <Button
                size="lg"
                variant="ghost"
                className="border border-brand-fg/30 text-brand-fg hover:bg-brand-fg/10"
              >
                Go to planner
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
