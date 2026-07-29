import { ReactNode } from 'react'

export type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface/60 px-6 py-12 text-center',
        className,
      ].join(' ')}
    >
      {icon && <div className="text-muted-fg">{icon}</div>}
      <div className="space-y-1">
        <h3 className="font-display text-lg font-semibold text-fg">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-muted-fg">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
