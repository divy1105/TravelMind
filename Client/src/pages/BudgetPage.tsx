import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  tripsApi,
  type BudgetCategory,
  type BudgetLine,
  type CreateBudgetLinePayload,
  type TripBudget,
  type UpdateBudgetLinePayload,
} from '../lib/tripsApi'

const CATEGORIES: BudgetCategory[] = [
  'lodging',
  'food',
  'transport',
  'activities',
  'other',
]

const inputClass =
  'rounded-md border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand focus:ring-2 focus:ring-ring/30'
const labelText = 'text-xs font-medium text-muted-fg'

function formatMoney(value: string | number, currency: string) {
  const n = Number(value)
  if (!Number.isFinite(n)) return `${value} ${currency}`
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`
}

function categoryLabel(category: string) {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

export default function BudgetPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const [budget, setBudget] = useState<TripBudget | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const [category, setCategory] = useState<BudgetCategory>('food')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [linkedActivityId, setLinkedActivityId] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCategory, setEditCategory] = useState<BudgetCategory>('food')
  const [editLabel, setEditLabel] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editLinkedActivityId, setEditLinkedActivityId] = useState('')

  const loadBudget = useCallback(async () => {
    if (!tripId) return
    setError('')
    setLoading(true)
    try {
      const data = await tripsApi.getBudget(tripId)
      setBudget(data)
    } catch (err) {
      setBudget(null)
      setError(err instanceof Error ? err.message : 'Failed to load budget')
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    void loadBudget()
  }, [loadBudget])

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!tripId || !label.trim() || amount === '') return
    await withBusy(async () => {
      const payload: CreateBudgetLinePayload = {
        category,
        label: label.trim(),
        amount: Number(amount),
        linkedActivityId: linkedActivityId || null,
      }
      await tripsApi.addBudgetLine(tripId, payload)
      setLabel('')
      setAmount('')
      setLinkedActivityId('')
      setMessage('Budget line added.')
      await loadBudget()
    })
  }

  function startEdit(line: BudgetLine) {
    setEditingId(line.id)
    setEditCategory(
      CATEGORIES.includes(line.category as BudgetCategory)
        ? (line.category as BudgetCategory)
        : 'other',
    )
    setEditLabel(line.label)
    setEditAmount(line.amount)
    setEditLinkedActivityId(line.linkedActivityId ?? '')
  }

  async function handleUpdate(lineId: string) {
    if (!tripId || !editLabel.trim() || editAmount === '') return
    await withBusy(async () => {
      const payload: UpdateBudgetLinePayload = {
        category: editCategory,
        label: editLabel.trim(),
        amount: Number(editAmount),
        linkedActivityId: editLinkedActivityId || null,
      }
      await tripsApi.updateBudgetLine(tripId, lineId, payload)
      setEditingId(null)
      setMessage('Budget line updated.')
      await loadBudget()
    })
  }

  async function handleDelete(lineId: string) {
    if (!tripId) return
    if (!window.confirm('Delete this budget line?')) return
    await withBusy(async () => {
      await tripsApi.removeBudgetLine(tripId, lineId)
      if (editingId === lineId) setEditingId(null)
      setMessage('Budget line deleted.')
      await loadBudget()
    })
  }

  async function addFromActivity(activityId: string, name: string, cost: string) {
    if (!tripId) return
    await withBusy(async () => {
      await tripsApi.addBudgetLine(tripId, {
        category: 'activities',
        label: name,
        amount: Number(cost),
        linkedActivityId: activityId,
      })
      setMessage(`Added “${name}” to budget.`)
      await loadBudget()
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
      </div>
    )
  }

  if (!budget) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-4">
        <Link to="/planner" className="text-sm text-muted-fg underline-offset-2 hover:underline">
          ← Back to planner
        </Link>
        <h1 className="font-display text-2xl font-semibold">Budget manager</h1>
        <p className="text-muted-fg">{error || 'Trip not found.'}</p>
      </div>
    )
  }

  const remainingNum = Number(budget.remaining)
  const linkedIds = new Set(
    budget.lines.map((l) => l.linkedActivityId).filter(Boolean) as string[],
  )
  const totalAllocatedPct =
    Number(budget.totalBudget) > 0
      ? Math.min(100, (Number(budget.allocated) / Number(budget.totalBudget)) * 100)
      : 0

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/planner"
            className="text-sm text-muted-fg underline-offset-2 hover:underline"
          >
            ← Back to planner
          </Link>
          <h1 className="mt-2 font-display text-2xl font-semibold">{budget.title}</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Budget · {formatMoney(budget.totalBudget, budget.currency)}
          </p>
          <p className="mt-1 text-sm text-muted-fg">
            Track spending by category and roll up planned activity costs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/planner/${budget.tripId}/itinerary`}
            className="rounded border border-border px-3 py-1.5 text-sm text-muted-fg hover:border-brand/40"
          >
            Itinerary
          </Link>
          <Link
            to={`/planner/${budget.tripId}/hotels`}
            className="rounded border border-border px-3 py-1.5 text-sm text-muted-fg hover:border-brand/40"
          >
            Hotels
          </Link>
          {busy && <span className="self-center text-xs text-muted-fg">Saving…</span>}
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {message && !error && <p className="text-sm text-muted-fg">{message}</p>}

      <section className="space-y-3 border border-border px-4 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-fg">Overview</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <div className={labelText}>Allocated</div>
            <div className="mt-1 text-lg font-medium">
              {formatMoney(budget.allocated, budget.currency)}
            </div>
          </div>
          <div>
            <div className={labelText}>Remaining</div>
            <div
              className={`mt-1 text-lg font-medium ${
                remainingNum < 0 ? 'text-danger' : ''
              }`}
            >
              {formatMoney(budget.remaining, budget.currency)}
            </div>
          </div>
          <div>
            <div className={labelText}>From activities</div>
            <div className="mt-1 text-lg font-medium">
              {formatMoney(budget.plannedFromActivities, budget.currency)}
            </div>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded bg-fg/10">
          <div
            className={`h-full transition-all ${
              remainingNum < 0 ? 'bg-danger' : 'bg-fg/60'
            }`}
            style={{ width: `${totalAllocatedPct}%` }}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-fg">
          By category
        </h2>
        <ul className="space-y-2">
          {CATEGORIES.map((cat) => {
            const value = budget.totalsByCategory[cat] ?? '0.00'
            const pct =
              Number(budget.totalBudget) > 0
                ? Math.min(100, (Number(value) / Number(budget.totalBudget)) * 100)
                : 0
            return (
              <li key={cat}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="capitalize text-muted-fg">{categoryLabel(cat)}</span>
                  <span className="text-muted-fg">{formatMoney(value, budget.currency)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded bg-fg/10">
                  <div className="h-full bg-fg/40" style={{ width: `${pct}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-fg">
          Add budget line
        </h2>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={labelText}>Category</span>
            <select
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value as BudgetCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelText}>Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              className={inputClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={labelText}>Label</span>
            <input
              type="text"
              required
              className={inputClass}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Hotel deposit, train tickets"
            />
          </label>
          {budget.activityCosts.length > 0 && (
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className={labelText}>Link activity (optional)</span>
              <select
                className={inputClass}
                value={linkedActivityId}
                onChange={(e) => setLinkedActivityId(e.target.value)}
              >
                <option value="">None</option>
                {budget.activityCosts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.stopCity}: {a.name} ({formatMoney(a.cost, budget.currency)})
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition hover:opacity-90 disabled:opacity-50"
            >
              Add line
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-fg">
          Budget lines
        </h2>
        {budget.lines.length === 0 ? (
          <p className="border border-dashed border-border px-4 py-8 text-center text-sm text-muted-fg">
            No budget lines yet. Add one above or pull costs from activities.
          </p>
        ) : (
          <ul className="divide-y divide-border border border-border">
            {budget.lines.map((line) => (
              <li key={line.id} className="px-4 py-3">
                {editingId === line.id ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      className={inputClass}
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as BudgetCategory)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {categoryLabel(c)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                    />
                    <input
                      type="text"
                      className={`${inputClass} sm:col-span-2`}
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                    />
                    {budget.activityCosts.length > 0 && (
                      <select
                        className={`${inputClass} sm:col-span-2`}
                        value={editLinkedActivityId}
                        onChange={(e) => setEditLinkedActivityId(e.target.value)}
                      >
                        <option value="">No linked activity</option>
                        {budget.activityCosts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.stopCity}: {a.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-2 sm:col-span-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleUpdate(line.id)}
                        className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-fg disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded border border-border px-3 py-1.5 text-sm text-muted-fg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{line.label}</div>
                      <div className="mt-0.5 text-sm text-muted-fg">
                        <span className="capitalize">{line.category}</span>
                        {' · '}
                        {formatMoney(line.amount, budget.currency)}
                        {line.linkedActivity && (
                          <>
                            {' · '}
                            linked: {line.linkedActivity.name}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded border border-border px-3 py-1.5 text-sm text-muted-fg hover:border-brand/40"
                        onClick={() => startEdit(line)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded border border-border px-3 py-1.5 text-sm text-muted-fg hover:border-danger/50 hover:text-danger"
                        onClick={() => handleDelete(line.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-fg">
          Activity costs
        </h2>
        {budget.activityCosts.length === 0 ? (
          <p className="text-sm text-muted-fg">
            No priced activities yet. Add costs in the itinerary to roll them up here.
          </p>
        ) : (
          <ul className="divide-y divide-border border border-border">
            {budget.activityCosts.map((activity) => {
              const alreadyLinked = linkedIds.has(activity.id)
              return (
                <li
                  key={activity.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <div className="font-medium">{activity.name}</div>
                    <div className="mt-0.5 text-sm text-muted-fg">
                      {activity.stopCity}
                      {activity.category ? ` · ${activity.category}` : ''}
                      {' · '}
                      {formatMoney(activity.cost, budget.currency)}
                    </div>
                  </div>
                  {alreadyLinked ? (
                    <span className="text-xs text-muted-fg">In budget</span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        addFromActivity(activity.id, activity.name, activity.cost)
                      }
                      className="rounded border border-border px-3 py-1.5 text-sm text-muted-fg hover:border-brand/40 disabled:opacity-50"
                    >
                      Add to budget
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
