import { Link, NavLink } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import { isClerkConfigured } from '../../lib/clerk'

function ClerkAuthLinks() {
  return (
    <>
      <SignedIn>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive ? 'text-fg' : 'text-fg/70 hover:text-fg'
          }
        >
          Profile
        </NavLink>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
      <SignedOut>
        <NavLink
          to="/sign-in"
          className={({ isActive }) =>
            isActive ? 'text-fg' : 'text-fg/70 hover:text-fg'
          }
        >
          Sign In
        </NavLink>
      </SignedOut>
    </>
  )
}

export default function TopNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-fg/10 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold text-fg">
          TravelMind
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? 'text-fg' : 'text-fg/70 hover:text-fg'
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/planner"
            className={({ isActive }) =>
              isActive ? 'text-fg' : 'text-fg/70 hover:text-fg'
            }
          >
            Planner
          </NavLink>
          {isClerkConfigured ? (
            <ClerkAuthLinks />
          ) : (
            <span className="text-fg/40" title="Add VITE_CLERK_PUBLISHABLE_KEY to Client/.env">
              Auth off
            </span>
          )}
        </nav>
      </div>
    </header>
  )
}
