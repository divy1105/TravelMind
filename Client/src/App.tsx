import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import HomePage from './pages/HomePage'
import PlannerPage from './pages/PlannerPage'
import ItineraryPage from './pages/ItineraryPage'
import BudgetPage from './pages/BudgetPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import ProfilePage from './pages/ProfilePage'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import { AuthSync } from './hooks/useAuthSync'

export default function App() {
  return (
    <>
      <AuthSync />
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="sign-in/*" element={<SignInPage />} />
        <Route path="sign-up/*" element={<SignUpPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="planner" element={<PlannerPage />} />
          <Route path="planner/:tripId/itinerary" element={<ItineraryPage />} />
          <Route path="planner/:tripId/budget" element={<BudgetPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
