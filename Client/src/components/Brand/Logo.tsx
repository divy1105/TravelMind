import { HTMLAttributes } from 'react'

type LogoProps = HTMLAttributes<HTMLSpanElement> & {
  size?: number
  showWordmark?: boolean
}

export function Logo({
  size = 28,
  showWordmark = true,
  className = '',
  ...props
}: LogoProps) {
  return (
    <span
      className={['inline-flex items-center gap-2 text-fg', className].join(' ')}
      {...props}
    >
      <img
        src="/logo.svg"
        alt=""
        width={size}
        height={size}
        className="shrink-0 dark:brightness-125 dark:contrast-90"
        aria-hidden
      />
      {showWordmark && (
        <span className="font-display text-lg font-semibold tracking-tight">
          TravelMind
        </span>
      )}
    </span>
  )
}
