import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import HomePage from './pages/HomePage'
import PlannerPage from './pages/PlannerPage'
import TripOverviewPage from './pages/TripOverviewPage'
import ItineraryPage from './pages/ItineraryPage'
import BudgetPage from './pages/BudgetPage'
import HotelsPage from './pages/HotelsPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import ProfilePage from './pages/ProfilePage'
import ProtectedRoute from './components/Auth/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="sign-in" element={<SignInPage />} />
        <Route path="sign-up" element={<SignUpPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="planner" element={<PlannerPage />} />
          <Route path="planner/:tripId" element={<TripOverviewPage />} />
          <Route path="planner/:tripId/itinerary" element={<ItineraryPage />} />
          <Route path="planner/:tripId/budget" element={<BudgetPage />} />
          <Route path="planner/:tripId/hotels" element={<HotelsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
