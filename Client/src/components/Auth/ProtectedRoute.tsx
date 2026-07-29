import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../../lib/auth'

export default function ProtectedRoute() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fg/20 border-t-fg" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/sign-in" replace />
  }

  return <Outlet />
}
