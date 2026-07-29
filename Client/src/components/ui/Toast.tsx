import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'

type ToastVariant = 'default' | 'success' | 'danger'

type ToastItem = {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

type ToastInput = Omit<ToastItem, 'id'>

type ToastContextValue = {
  toast: (input: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const variantClass: Record<ToastVariant, string> = {
  default: 'border-border bg-surface text-fg',
  success: 'border-success/30 bg-surface text-fg',
  danger: 'border-danger/40 bg-surface text-fg',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (input: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setItems((prev) => [...prev, { ...input, id }])
      window.setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={[
              'pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lift',
              variantClass[item.variant ?? 'default'],
            ].join(' ')}
            role="status"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-xs text-muted-fg">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="rounded p-0.5 text-muted-fg hover:text-fg"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
