import { useAuth } from '@clerk/clerk-react'
import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute() {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fg/20 border-t-fg" />
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }

  return <Outlet />
}
