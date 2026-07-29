import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FEATURED_CITIES } from './featuredCities'
import GlobeGrid from './GlobeGrid'
import CityMarkers from './CityMarkers'
import { GLOBE_RADIUS } from './geo'

type GlobeSceneProps = {
  reducedMotion: boolean
  selectedCityId: string | null
  onSelectCity: (cityId: string) => void
}

export default function GlobeScene({
  reducedMotion,
  selectedCityId,
  onSelectCity
}: GlobeSceneProps) {
  const globeRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!globeRef.current || reducedMotion) return
    globeRef.current.rotation.y += delta * 0.12
  })

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 2, 5]} intensity={1.1} />
      <directionalLight position={[-3, -1, -2]} intensity={0.35} />

      <group ref={globeRef}>
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <meshStandardMaterial
            color="#0c4a6e"
            roughness={0.85}
            metalness={0.15}
            transparent
            opacity={0.92}
          />
        </mesh>

        <GlobeGrid />
        <CityMarkers
          cities={FEATURED_CITIES}
          selectedCityId={selectedCityId}
          onSelectCity={onSelectCity}
        />
      </group>
    </>
  )
}
