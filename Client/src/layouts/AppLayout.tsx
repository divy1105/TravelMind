import { Outlet, useLocation } from 'react-router-dom'
import TopNav from '../components/Navigation/TopNav'
import Footer from '../components/Navigation/Footer'
import CinematicRouteTransition from '../components/Immersive/CinematicRouteTransition'

export default function AppLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <TopNav />
      <main
        className={
          isHome
            ? 'flex-1'
            : 'mx-auto w-full max-w-5xl flex-1 px-4 py-6'
        }
      >
        <CinematicRouteTransition>
          <Outlet />
        </CinematicRouteTransition>
      </main>
      <Footer />
    </div>
  )
}
