import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { FEATURED_CITIES } from './featuredCities'
import CityMarkers from './CityMarkers'
import FlightArcs from './FlightArcs'
import { GLOBE_RADIUS } from './geo'

/** Public domain–style blue marble hosted on jsDelivr (no API key). */
const EARTH_TEXTURE_URL =
  'https://cdn.jsdelivr.net/npm/three-globe@2.44.1/example/img/earth-blue-marble.jpg'

type GlobeSceneProps = {
  reducedMotion: boolean
  selectedCityId: string | null
  onSelectCity: (cityId: string) => void
}

function Atmosphere() {
  return (
    <mesh scale={1.12}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshBasicMaterial
        color="#5ec8d8"
        transparent
        opacity={0.14}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function SoftHalo() {
  return (
    <mesh scale={1.22}>
      <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
      <meshBasicMaterial
        color="#0B3D4A"
        transparent
        opacity={0.08}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function GlobeScene({
  reducedMotion,
  selectedCityId,
  onSelectCity,
}: GlobeSceneProps) {
  const globeRef = useRef<THREE.Group>(null)
  const earthMap = useTexture(EARTH_TEXTURE_URL)

  useEffect(() => {
    earthMap.colorSpace = THREE.SRGBColorSpace
    earthMap.anisotropy = 8
  }, [earthMap])

  useFrame((_, delta) => {
    if (!globeRef.current || reducedMotion) return
    globeRef.current.rotation.y += delta * 0.08
  })

  return (
    <>
      <color attach="background" args={['#061820']} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 2.5, 4]} intensity={1.35} color="#fff6e8" />
      <directionalLight position={[-4, -1, -3]} intensity={0.35} color="#7ec8d4" />
      <pointLight position={[0, 0, 3.2]} intensity={0.25} color="#9fd4de" />

      <group ref={globeRef}>
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <meshStandardMaterial
            map={earthMap}
            roughness={0.82}
            metalness={0.08}
          />
        </mesh>

        <Atmosphere />
        <SoftHalo />

        <FlightArcs cities={FEATURED_CITIES} selectedCityId={selectedCityId} />
        <CityMarkers
          cities={FEATURED_CITIES}
          selectedCityId={selectedCityId}
          onSelectCity={onSelectCity}
        />
      </group>
    </>
  )
}
