import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'
type Size = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-brand text-brand-fg hover:opacity-90 focus-visible:ring-ring shadow-soft',
  secondary:
    'bg-muted text-fg hover:bg-border/60 focus-visible:ring-ring',
  ghost: 'bg-transparent text-fg hover:bg-muted focus-visible:ring-ring',
  danger: 'bg-danger text-danger-fg hover:opacity-90 focus-visible:ring-danger',
  accent:
    'bg-accent text-accent-fg hover:opacity-90 focus-visible:ring-ring shadow-soft',
}

const sizeClass: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className = '', variant = 'primary', size = 'md', type = 'button', disabled, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={[
          'inline-flex items-center justify-center rounded-md font-medium transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          'disabled:pointer-events-none disabled:opacity-50',
          variantClass[variant],
          sizeClass[size],
          className,
        ].join(' ')}
        {...props}
      />
    )
  },
)
