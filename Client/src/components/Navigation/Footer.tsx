import { Link } from 'react-router-dom'
import { Logo } from '../Brand/Logo'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-muted/40">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Logo size={24} />
          <p className="max-w-xs text-sm text-muted-fg">
            AI-guided multi-city trip planning — itineraries, hotels, and budgets
            in one place.
          </p>
        </div>
        <div className="flex gap-10 text-sm">
          <div className="space-y-2">
            <p className="font-medium text-fg">Product</p>
            <ul className="space-y-1.5 text-muted-fg">
              <li>
                <Link to="/planner" className="hover:text-fg">
                  Planner
                </Link>
              </li>
              <li>
                <Link to="/sign-up" className="hover:text-fg">
                  Create account
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-fg">Account</p>
            <ul className="space-y-1.5 text-muted-fg">
              <li>
                <Link to="/sign-in" className="hover:text-fg">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-fg">
                  Profile
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border/70">
        <p className="mx-auto max-w-5xl px-4 py-4 text-xs text-muted-fg">
          © {year} TravelMind
        </p>
      </div>
    </footer>
  )
}
