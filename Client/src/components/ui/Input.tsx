import { InputHTMLAttributes, forwardRef } from 'react'

export type InputProps = InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        className={[
          'h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg',
          'placeholder:text-muted-fg outline-none transition',
          'focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        ].join(' ')}
        {...props}
      />
    )
  },
)
