import React from 'react'
import { Outlet } from 'react-router-dom'
import TopNav from '../components/Navigation/TopNav'
import ImmersivePlaceholder from '../components/Immersive/ImmersivePlaceholder'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 pb-8 text-sm text-fg/70">
        <ImmersivePlaceholder />
      </footer>
    </div>
  )
}

