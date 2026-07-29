import { useAuth, useUser } from '@clerk/clerk-react'
import { useEffect, useRef } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export function useAuthSync() {
  const { isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const synced = useRef(false)

  useEffect(() => {
    if (!isSignedIn || !user || synced.current) return
    synced.current = true

    async function sync() {
      try {
        const token = await getToken()
        await fetch(`${API}/api/auth/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: user!.primaryEmailAddress?.emailAddress,
            name: user!.fullName,
            avatarUrl: user!.imageUrl,
          }),
        })
      } catch {
        synced.current = false
      }
    }
    sync()
  }, [isSignedIn, user, getToken])
}
