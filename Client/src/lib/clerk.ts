const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

/** True when a real Clerk publishable key is configured (starts with pk_). */
export const isClerkConfigured = typeof key === 'string' && key.startsWith('pk_')

export const clerkPublishableKey = isClerkConfigured ? key : undefined
