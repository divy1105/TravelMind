import { useMemo } from 'react'
import * as THREE from 'three'
import { GLOBE_RADIUS, latLngToVector3 } from './geo'

const LAT_STEP = 20
const LNG_STEP = 20
const SEGMENTS = 64

function createLatLine(lat: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= SEGMENTS; i += 1) {
    const lng = (i / SEGMENTS) * 360 - 180
    points.push(latLngToVector3(lat, lng, GLOBE_RADIUS * 1.001))
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function createLngLine(lng: number): THREE.BufferGeometry {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= SEGMENTS; i += 1) {
    const lat = (i / SEGMENTS) * 180 - 90
    points.push(latLngToVector3(lat, lng, GLOBE_RADIUS * 1.001))
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

export default function GlobeGrid() {
  const geometries = useMemo(() => {
    const latLines: THREE.BufferGeometry[] = []
    const lngLines: THREE.BufferGeometry[] = []

    for (let lat = -80; lat <= 80; lat += LAT_STEP) {
      latLines.push(createLatLine(lat))
    }

    for (let lng = -180; lng < 180; lng += LNG_STEP) {
      lngLines.push(createLngLine(lng))
    }

    return { latLines, lngLines }
  }, [])

  return (
    <group>
      {geometries.latLines.map((geometry, index) => (
        <line key={`lat-${index}`} geometry={geometry}>
          <lineBasicMaterial color="#7dd3fc" transparent opacity={0.35} />
        </line>
      ))}
      {geometries.lngLines.map((geometry, index) => (
        <line key={`lng-${index}`} geometry={geometry}>
          <lineBasicMaterial color="#93c5fd" transparent opacity={0.28} />
        </line>
      ))}
    </group>
  )
}
