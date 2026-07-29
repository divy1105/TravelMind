import { Outlet } from 'react-router-dom'
import TopNav from '../components/Navigation/TopNav'
import CinematicRouteTransition from '../components/Immersive/CinematicRouteTransition'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <CinematicRouteTransition>
          <Outlet />
        </CinematicRouteTransition>
      </main>
    </div>
  )
}
