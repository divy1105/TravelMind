import { Suspense, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useWebGLSupport } from '../../hooks/useWebGLSupport'
import GlobeScene from './GlobeScene'
import WebGLFallback from './WebGLFallback'
import { FEATURED_CITIES } from './featuredCities'

const MAX_DPR = 1.5

type ImmersiveGlobeProps = {
  className?: string
  selectedCityId?: string | null
  onCitySelect?: (cityId: string | null) => void
  /** Hide the bottom caption (e.g. marketing hero). */
  showCaption?: boolean
}

export default function ImmersiveGlobe({
  className = '',
  selectedCityId: controlledSelectedCityId,
  onCitySelect,
  showCaption = true,
}: ImmersiveGlobeProps) {
  const webglSupported = useWebGLSupport()
  const reducedMotion = useReducedMotion()
  const [internalSelectedCityId, setInternalSelectedCityId] = useState<string | null>(
    null,
  )

  const selectedCityId = controlledSelectedCityId ?? internalSelectedCityId

  const dpr = useMemo(() => {
    if (typeof window === 'undefined') return 1
    return Math.min(window.devicePixelRatio, MAX_DPR)
  }, [])

  const handleSelectCity = (cityId: string) => {
    const next = selectedCityId === cityId ? null : cityId
    if (onCitySelect) {
      onCitySelect(next)
    } else {
      setInternalSelectedCityId(next)
    }
  }

  if (!webglSupported) {
    return <WebGLFallback className={className} />
  }

  return (
    <div className={`relative h-full min-h-[280px] w-full ${className}`}>
      <Canvas
        dpr={[1, dpr]}
        camera={{ position: [0, 0.15, 3.15], fov: 40 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onPointerMissed={() => {
          if (onCitySelect) {
            onCitySelect(null)
          } else {
            setInternalSelectedCityId(null)
          }
        }}
      >
        <Suspense fallback={null}>
          <GlobeScene
            reducedMotion={reducedMotion}
            selectedCityId={selectedCityId}
            onSelectCity={handleSelectCity}
          />
        </Suspense>
      </Canvas>

      {showCaption && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/80 to-transparent p-3">
          <p className="text-center text-xs text-fg/70">
            {selectedCityId
              ? `Selected: ${
                  FEATURED_CITIES.find((city) => city.id === selectedCityId)?.name
                }`
              : 'Click a glowing city to highlight it'}
          </p>
        </div>
      )}
    </div>
  )
}
