import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { signIn } from '../lib/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function SignInPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message || 'Sign in failed')
        return
      }
      navigate('/planner')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
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
          <h1 className="font-display text-2xl font-semibold">Sign in</h1>
          <p className="text-sm text-muted-fg">
            New here?{' '}
            <Link to="/sign-up" className="text-brand underline-offset-2 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full gap-2">
          <LogIn className="h-4 w-4" />
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
