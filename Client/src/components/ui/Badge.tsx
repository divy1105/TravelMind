import { HTMLAttributes } from 'react'

type BadgeVariant = 'default' | 'accent' | 'muted' | 'success' | 'danger'

const variantClass: Record<BadgeVariant, string> = {
  default: 'bg-brand/10 text-brand',
  accent: 'bg-accent/80 text-accent-fg',
  muted: 'bg-muted text-muted-fg',
  success: 'bg-success/15 text-success',
  danger: 'bg-danger/15 text-danger',
}

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

export function Badge({
  className = '',
  variant = 'default',
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variantClass[variant],
        className,
      ].join(' ')}
      {...props}
    />
  )
}
