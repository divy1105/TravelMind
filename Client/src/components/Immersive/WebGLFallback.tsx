type WebGLFallbackProps = {
  className?: string
}

export default function WebGLFallback({ className = '' }: WebGLFallbackProps) {
  return (
    <div
      className={`relative flex h-full min-h-[280px] flex-col items-center justify-center overflow-hidden bg-[#061820] p-6 text-center ${className}`}
      role="img"
      aria-label="Travel globe preview unavailable without WebGL"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at 55% 40%, rgba(94,200,216,0.28), transparent 55%), radial-gradient(ellipse at 30% 70%, rgba(11,61,74,0.9), #061820 70%)',
        }}
        aria-hidden
      />
      <div
        className="relative mb-4 h-28 w-28 rounded-full border border-[#7ec8d4]/35 bg-gradient-to-br from-[#0B3D4A] to-[#163a44] shadow-[0_0_40px_rgba(94,200,216,0.25)]"
        aria-hidden
      />
      <p className="relative text-sm font-medium text-[#E8D5B5]">
        Explore the world with TravelMind
      </p>
      <p className="relative mt-1 max-w-xs text-xs text-white/65">
        WebGL is unavailable on this device. The planner still works with the full
        experience.
      </p>
    </div>
  )
}
