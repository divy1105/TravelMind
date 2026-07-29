import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useReducedMotion } from '../../hooks/useReducedMotion'

type TransitionPhase = 'idle' | 'enter' | 'exit'

type CinematicRouteTransitionProps = {
  children: ReactNode
}

export default function CinematicRouteTransition({
  children
}: CinematicRouteTransitionProps) {
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const previousPath = useRef(location.pathname)
  const [phase, setPhase] = useState<TransitionPhase>('idle')

  useEffect(() => {
    const from = previousPath.current
    const to = location.pathname
    previousPath.current = to

    if (reducedMotion || (from === '/' && to === '/planner') === false) {
      return
    }

    setPhase('enter')
    const exitTimer = window.setTimeout(() => setPhase('exit'), 40)
    const resetTimer = window.setTimeout(() => setPhase('idle'), 900)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(resetTimer)
    }
  }, [location.pathname, reducedMotion])

  return (
    <>
      {children}
      {phase !== 'idle' && (
        <div
          aria-hidden
          className={`cinematic-route-overlay ${
            phase === 'enter' ? 'cinematic-route-overlay--enter' : 'cinematic-route-overlay--exit'
          }`}
        />
      )}
    </>
  )
}
