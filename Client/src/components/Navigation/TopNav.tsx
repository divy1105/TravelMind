import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, Moon, Sun, X, Compass } from 'lucide-react'
import { Logo } from '../Brand/Logo'
import { Button } from '../ui/Button'
import { useTheme } from '../Theme/ThemeProvider'
import { signOut, useSession } from '../../lib/auth'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-2 py-1.5 text-sm transition',
    isActive ? 'bg-muted text-fg font-medium' : 'text-muted-fg hover:text-fg',
  ].join(' ')

export default function TopNav() {
  const { data: session, isPending } = useSession()
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  async function handleSignOut() {
    await signOut()
    setOpen(false)
  }

  const navLinks = (
    <>
      <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>
        Home
      </NavLink>
      <NavLink to="/planner" className={linkClass} onClick={() => setOpen(false)}>
        Planner
      </NavLink>
      {session && (
        <NavLink
          to="/profile"
          className={linkClass}
          onClick={() => setOpen(false)}
        >
          Profile
        </NavLink>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="shrink-0" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">{navLinks}</nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-fg transition hover:bg-muted hover:text-fg"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          <div className="hidden items-center gap-2 md:flex">
            {isPending ? (
              <span className="text-sm text-muted-fg">…</span>
            ) : session ? (
              <Button variant="ghost" size="sm" onClick={() => void handleSignOut()}>
                Sign out
              </Button>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  className="text-sm text-muted-fg transition hover:text-fg"
                >
                  Sign in
                </Link>
                <Link to="/sign-up">
                  <Button size="sm" className="gap-1.5">
                    <Compass className="h-3.5 w-3.5" />
                    Start planning
                  </Button>
                </Link>
              </>
            )}
            {session && (
              <Link to="/planner">
                <Button size="sm" className="gap-1.5">
                  <Compass className="h-3.5 w-3.5" />
                  Plan a trip
                </Button>
              </Link>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg hover:bg-muted md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-bg md:hidden">
          <nav className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-4">
            {navLinks}
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              {isPending ? null : session ? (
                <>
                  <Link to="/planner" onClick={() => setOpen(false)}>
                    <Button className="w-full gap-1.5">
                      <Compass className="h-4 w-4" />
                      Plan a trip
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => void handleSignOut()}
                  >
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/sign-up" onClick={() => setOpen(false)}>
                    <Button className="w-full gap-1.5">
                      <Compass className="h-4 w-4" />
                      Start planning
                    </Button>
                  </Link>
                  <Link to="/sign-in" onClick={() => setOpen(false)}>
                    <Button variant="secondary" className="w-full">
                      Sign in
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
