import { createAuthClient } from 'better-auth/react'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export const authClient = createAuthClient({
  baseURL,
})

export const { signIn, signUp, signOut, useSession } = authClient
