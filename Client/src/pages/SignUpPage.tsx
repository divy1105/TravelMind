import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { signUp } from '../lib/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function SignUpPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await signUp.email({ name, email, password })
      if (result.error) {
        setError(result.error.message || 'Sign up failed')
        return
      }
      navigate('/planner')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-6 shadow-soft"
      >
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">Create account</h1>
          <p className="text-sm text-muted-fg">
            Already have an account?{' '}
            <Link to="/sign-in" className="text-brand underline-offset-2 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-fg">Name</span>
          <Input
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-fg">Email</span>
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-fg">Password</span>
          <Input
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full gap-2">
          <UserPlus className="h-4 w-4" />
          {busy ? 'Creating…' : 'Create account'}
        </Button>
      </form>
    </div>
  )
}
