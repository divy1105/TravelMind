import { useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { FeaturedCity } from './featuredCities'
import { latLngToVector3 } from './geo'

type CityMarkersProps = {
  cities: FeaturedCity[]
  selectedCityId: string | null
  onSelectCity: (cityId: string) => void
}

function CityMarker({
  city,
  selected,
  onSelect
}: {
  city: FeaturedCity
  selected: boolean
  onSelect: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const position = latLngToVector3(city.lat, city.lng, 1.22)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const targetScale = selected ? 1.6 : 1
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      Math.min(1, delta * 8)
    )
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(event) => {
          event.stopPropagation()
          onSelect()
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial
          color={selected ? '#fbbf24' : '#38bdf8'}
          emissive={selected ? '#f59e0b' : '#0284c7'}
          emissiveIntensity={selected ? 1.2 : 0.6}
        />
      </mesh>
      {selected && (
        <Html
          distanceFactor={6}
          position={[0, 0.12, 0]}
          style={{
            pointerEvents: 'none',
            transform: 'translate(-50%, -120%)',
            whiteSpace: 'nowrap'
          }}
        >
          <div className="rounded-md border border-fg/15 bg-bg/90 px-2 py-1 text-xs text-fg shadow-sm backdrop-blur">
            {city.name}, {city.country}
          </div>
        </Html>
      )}
    </group>
  )
}

export default function CityMarkers({
  cities,
  selectedCityId,
  onSelectCity
}: CityMarkersProps) {
  return (
    <group>
      {cities.map((city) => (
        <CityMarker
          key={city.id}
          city={city}
          selected={selectedCityId === city.id}
          onSelect={() => onSelectCity(city.id)}
        />
      ))}
    </group>
  )
}
