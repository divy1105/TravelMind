import { FormEvent, useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

interface ProfileData {
  name: string
  bio: string
  travelStyle: string
  preferredCurrency: string
  homeCity: string
}

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileData>({
    name: '',
    bio: '',
    travelStyle: '',
    preferredCurrency: 'USD',
    homeCity: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`${API}/api/users/me`, {
          credentials: 'include',
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
        // ignore
      } finally {
        setLoading(false)
      }
    }
    void fetchProfile()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(`${API}/api/users/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
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

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      <h1 className="mb-6 font-display text-2xl font-semibold">Your profile</h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-soft"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-fg">Name</span>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-fg">Bio</span>
          <textarea
            className="min-h-[5rem] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand focus:ring-2 focus:ring-ring/30"
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-fg">Travel style</span>
          <Select
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
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-fg">Preferred currency</span>
          <Select
            value={form.preferredCurrency}
            onChange={(e) =>
              setForm({ ...form, preferredCurrency: e.target.value })
            }
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="INR">INR</option>
            <option value="JPY">JPY</option>
            <option value="AUD">AUD</option>
            <option value="CAD">CAD</option>
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-fg">Home city</span>
          <Input
            value={form.homeCity}
            onChange={(e) => setForm({ ...form, homeCity: e.target.value })}
          />
        </label>
        <Button type="submit" disabled={saving} className="gap-2 self-start">
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
        {message && <p className="text-sm text-muted-fg">{message}</p>}
      </form>
    </div>
  )
}
