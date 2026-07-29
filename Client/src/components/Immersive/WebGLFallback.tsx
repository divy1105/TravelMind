type WebGLFallbackProps = {
  className?: string
}

export default function WebGLFallback({ className = '' }: WebGLFallbackProps) {
  return (
    <div
      className={`flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-sky-900/40 via-bg to-indigo-900/30 p-6 text-center ${className}`}
      role="img"
      aria-label="Travel globe preview unavailable without WebGL"
    >
      <div className="mb-3 text-4xl" aria-hidden>
        🌍
      </div>
      <p className="text-sm font-medium text-fg">Explore the world with TravelMind</p>
      <p className="mt-1 max-w-xs text-xs text-fg/70">
        WebGL is unavailable on this device. The planner still works with the full
        experience.
      </p>
    </div>
  )
}
