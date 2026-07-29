import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, PieChart as PieIcon, Wallet } from 'lucide-react'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import {
  tripsApi,
  type BudgetCategory,
  type BudgetLine,
  type CreateBudgetLinePayload,
  type TripBudget,
  type UpdateBudgetLinePayload,
} from '../lib/tripsApi'
import { TripToolNav } from '../components/trips/TripToolNav'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'

const CATEGORIES: BudgetCategory[] = [
  'lodging',
  'food',
  'transport',
  'activities',
  'other',
]

const CHART_COLORS = [
  'hsl(191 74% 28%)',
  'hsl(38 51% 62%)',
  'hsl(200 25% 35%)',
  'hsl(152 45% 38%)',
  'hsl(200 12% 55%)',
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
  const { toast } = useToast()
  const [budget, setBudget] = useState<TripBudget | null>(null)
  const [loading, setLoading] = useState(true)
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
    setLoading(true)
    try {
      const data = await tripsApi.getBudget(tripId)
      setBudget(data)
    } catch (err) {
      setBudget(null)
      toast({
        title: 'Could not load budget',
        description: err instanceof Error ? err.message : 'Request failed',
        variant: 'danger',
      })
    } finally {
      setLoading(false)
    }
  }, [tripId, toast])

  useEffect(() => {
    void loadBudget()
  }, [loadBudget])

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      toast({
        title: 'Request failed',
        description: err instanceof Error ? err.message : 'Try again',
        variant: 'danger',
      })
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
      toast({ title: 'Budget line added', variant: 'success' })
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
      toast({ title: 'Budget line updated', variant: 'success' })
      await loadBudget()
    })
  }

  async function handleDelete(lineId: string) {
    if (!tripId) return
    if (!window.confirm('Delete this budget line?')) return
    await withBusy(async () => {
      await tripsApi.removeBudgetLine(tripId, lineId)
      if (editingId === lineId) setEditingId(null)
      toast({ title: 'Budget line deleted', variant: 'success' })
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
      toast({ title: `Added “${name}” to budget`, variant: 'success' })
      await loadBudget()
    })
  }

  const chartData = useMemo(() => {
    if (!budget) return []
    return CATEGORIES.map((cat) => ({
      name: categoryLabel(cat),
      value: Number(budget.totalsByCategory[cat] ?? 0),
    })).filter((d) => d.value > 0)
  }, [budget])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 py-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-56 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!budget || !tripId) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-4">
        <Link to="/planner" className="text-sm text-muted-fg underline-offset-2 hover:underline">
          ← Back to trips
        </Link>
        <EmptyState
          icon={<Wallet className="h-8 w-8" />}
          title="Budget unavailable"
          description="Trip not found or budget could not be loaded."
        />
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
    <div className="mx-auto max-w-4xl space-y-6 py-4">
      <div className="space-y-3">
        <Link
          to={`/planner/${budget.tripId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-fg hover:text-fg"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Trip overview
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">{budget.title}</h1>
            <p className="mt-1 text-sm text-muted-fg">
              Budget · {formatMoney(budget.totalBudget, budget.currency)}
            </p>
          </div>
          {busy && <span className="self-center text-xs text-muted-fg">Saving…</span>}
        </div>
        <TripToolNav tripId={budget.tripId} />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-fg">
            Overview
          </h2>
          {Number(budget.allocated) === 0 && (
            <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-fg">
              {formatMoney(budget.totalBudget, budget.currency)} is your trip ceiling from create —
              nothing spent yet. Add lines below, or pull lodging from Hotels and costs from
              Itinerary.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
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
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all ${
                remainingNum < 0 ? 'bg-danger' : 'bg-brand'
              }`}
              style={{ width: `${totalAllocatedPct}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-fg">
            By category
          </h2>
          {chartData.length === 0 ? (
            <EmptyState
              icon={<PieIcon className="h-7 w-7" />}
              title="No spend yet"
              description="Add budget lines to see the category chart."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {chartData.map((_, index) => (
                      <Cell
                        key={chartData[index].name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) =>
                      formatMoney(value, budget.currency)
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-fg">
          Add budget line
        </h2>
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-2"
        >
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
            <Button type="submit" disabled={busy} size="sm">
              Add line
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-fg">
          Budget lines
        </h2>
        {budget.lines.length === 0 ? (
          <EmptyState
            title="No budget lines yet"
            description="Add one above or pull costs from activities."
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
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
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => handleUpdate(line.id)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
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
                      <Button size="sm" variant="secondary" onClick={() => startEdit(line)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        onClick={() => handleDelete(line.id)}
                      >
                        Delete
                      </Button>
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
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
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
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        addFromActivity(activity.id, activity.name, activity.cost)
                      }
                    >
                      Add to budget
                    </Button>
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
