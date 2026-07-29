import { useUser } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

interface ProfileData {
  name: string
  bio: string
  travelStyle: string
  preferredCurrency: string
  homeCity: string
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const [form, setForm] = useState<ProfileData>({
    name: '',
    bio: '',
    travelStyle: '',
    preferredCurrency: 'USD',
    homeCity: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!isLoaded || !user) return

    async function fetchProfile() {
      try {
        const token = await (window as any).Clerk?.session?.getToken()
        const res = await fetch(`${API}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const { user: u } = await res.json()
          setForm({
            name: u.name || '',
            bio: u.profile?.bio || '',
            travelStyle: u.profile?.travelStyle || '',
            preferredCurrency: u.profile?.preferredCurrency || 'USD',
            homeCity: u.profile?.homeCity || '',
          })
        }
      } catch {
        // Profile not synced yet
      }
    }
    fetchProfile()
  }, [isLoaded, user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const token = await (window as any).Clerk?.session?.getToken()
      const res = await fetch(`${API}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setMessage('Profile updated!')
      } else {
        setMessage('Failed to save.')
      }
    } catch {
      setMessage('Network error.')
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fg/20 border-t-fg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      <h1 className="mb-6 text-2xl font-bold">Your Profile</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-fg/70">Name</span>
          <input
            className="rounded border border-fg/20 bg-bg px-3 py-2 text-fg"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-fg/70">Bio</span>
          <textarea
            className="rounded border border-fg/20 bg-bg px-3 py-2 text-fg"
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-fg/70">Travel Style</span>
          <select
            className="rounded border border-fg/20 bg-bg px-3 py-2 text-fg"
            value={form.travelStyle}
            onChange={(e) => setForm({ ...form, travelStyle: e.target.value })}
          >
            <option value="">Select...</option>
            <option value="backpacker">Backpacker</option>
            <option value="luxury">Luxury</option>
            <option value="adventure">Adventure</option>
            <option value="cultural">Cultural</option>
            <option value="relaxation">Relaxation</option>
            <option value="business">Business</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-fg/70">Preferred Currency</span>
          <select
            className="rounded border border-fg/20 bg-bg px-3 py-2 text-fg"
            value={form.preferredCurrency}
            onChange={(e) => setForm({ ...form, preferredCurrency: e.target.value })}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="INR">INR</option>
            <option value="JPY">JPY</option>
            <option value="AUD">AUD</option>
            <option value="CAD">CAD</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-fg/70">Home City</span>
          <input
            className="rounded border border-fg/20 bg-bg px-3 py-2 text-fg"
            value={form.homeCity}
            onChange={(e) => setForm({ ...form, homeCity: e.target.value })}
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-fg px-4 py-2 font-medium text-bg transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
        {message && (
          <p className="text-sm text-fg/70">{message}</p>
        )}
      </form>
    </div>
  )
}
