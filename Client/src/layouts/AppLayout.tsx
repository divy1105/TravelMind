import { Outlet } from 'react-router-dom'
import TopNav from '../components/Navigation/TopNav'
import Footer from '../components/Navigation/Footer'
import CinematicRouteTransition from '../components/Immersive/CinematicRouteTransition'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <CinematicRouteTransition>
          <Outlet />
        </CinematicRouteTransition>
      </main>
      <Footer />
    </div>
  )
}
