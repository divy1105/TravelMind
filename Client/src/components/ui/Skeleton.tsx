import { HTMLAttributes } from 'react'

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

const roundedClass = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
}

export function Skeleton({
  className = '',
  rounded = 'md',
  ...props
}: SkeletonProps) {
  return (
    <div
      className={[
        'animate-pulse bg-muted',
        roundedClass[rounded],
        className,
      ].join(' ')}
      aria-hidden
      {...props}
    />
  )
}
