import { useEffect, useState } from 'react'

function detectWebGL(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    const context =
      canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    return context !== null
  } catch {
    return false
  }
}

export function useWebGLSupport(): boolean {
  const [supported, setSupported] = useState(() => detectWebGL())

  useEffect(() => {
    setSupported(detectWebGL())
  }, [])

  return supported
}
