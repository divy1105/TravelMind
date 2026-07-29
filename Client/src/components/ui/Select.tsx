import { SelectHTMLAttributes, forwardRef } from 'react'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className = '', children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={[
          'h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg',
          'outline-none transition focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
    )
  },
)
