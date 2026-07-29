import { useMemo } from 'react'
import * as THREE from 'three'
import type { FeaturedCity } from './featuredCities'
import { GLOBE_RADIUS, latLngToVector3 } from './geo'

/** Pair consecutive featured cities into a soft route ring. */
const ARC_PAIRS: Array<[string, string]> = [
  ['tokyo', 'sydney'],
  ['sydney', 'cairo'],
  ['cairo', 'paris'],
  ['paris', 'new-york'],
  ['new-york', 'tokyo'],
]

function buildArcGeometry(from: FeaturedCity, to: FeaturedCity): THREE.BufferGeometry {
  const start = latLngToVector3(from.lat, from.lng, GLOBE_RADIUS * 1.015)
  const end = latLngToVector3(to.lat, to.lng, GLOBE_RADIUS * 1.015)
  const mid = start.clone().add(end).multiplyScalar(0.5)
  const lift = 1 + Math.min(0.55, start.distanceTo(end) * 0.35)
  mid.normalize().multiplyScalar(GLOBE_RADIUS * lift)
  const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
  return new THREE.BufferGeometry().setFromPoints(curve.getPoints(48))
}

type FlightArcsProps = {
  cities: FeaturedCity[]
  selectedCityId: string | null
}

export default function FlightArcs({ cities, selectedCityId }: FlightArcsProps) {
  const arcs = useMemo(() => {
    const byId = new Map(cities.map((c) => [c.id, c]))
    return ARC_PAIRS.flatMap(([a, b], index) => {
      const from = byId.get(a)
      const to = byId.get(b)
      if (!from || !to) return []
      return [{ key: `${a}-${b}-${index}`, from, to, geometry: buildArcGeometry(from, to) }]
    })
  }, [cities])

  return (
    <group>
      {arcs.map(({ key, from, to, geometry }) => {
        const highlighted =
          selectedCityId !== null &&
          (from.id === selectedCityId || to.id === selectedCityId)
        return (
          <line key={key} geometry={geometry}>
            <lineBasicMaterial
              color={highlighted ? '#E8D5B5' : '#7ec8d4'}
              transparent
              opacity={highlighted ? 0.9 : 0.35}
              depthWrite={false}
            />
          </line>
        )
      })}
    </group>
  )
}
