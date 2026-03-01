'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/format'
import type { SavingsGoal, Account } from '@/types/database'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SavingsGoalsViewProps {
  goals: SavingsGoal[]
  accounts: Pick<Account, 'id' | 'name' | 'type' | 'balance'>[]
}

const EMPTY_FORM = {
  name: '',
  goal_amount: '',
  current_amount: '',
  account_id: '',
  target_date: '',
  priority: '1',
}

export default function SavingsGoalsView({ goals: initial, accounts }: SavingsGoalsViewProps) {
  const [goals, setGoals] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmAchieve, setConfirmAchieve] = useState<string | null>(null)
  const [achieving, setAchieving] = useState(false)
  const [celebratingGoal, setCelebratingGoal] = useState<SavingsGoal | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [reversed, setReversed] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)

  const savingsAccounts = accounts.filter((a) => a.type === 'savings' || a.type === 'checking')
  const kofiUrl = process.env.NEXT_PUBLIC_KOFI_URL

  function handleBlur(field: string) {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  function openEdit(goal: SavingsGoal) {
    setEditingGoal(goal)
    setEditForm({
      name: goal.name,
      goal_amount: String(goal.goal_amount),
      current_amount: String(goal.current_amount ?? 0),
      account_id: goal.account_id ?? '',
      target_date: goal.target_date ?? '',
      priority: String(goal.priority),
    })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingGoal) return
    setEditSaving(true)

    const payload: Record<string, unknown> = { id: editingGoal.id }
    if (editForm.name !== editingGoal.name) payload.name = editForm.name
    if (Number(editForm.goal_amount) !== editingGoal.goal_amount) payload.goal_amount = Number(editForm.goal_amount)
    if (Number(editForm.priority) !== editingGoal.priority) payload.priority = Number(editForm.priority)
    if (Number(editForm.current_amount) !== (editingGoal.current_amount ?? 0)) payload.current_amount = Number(editForm.current_amount)
    payload.account_id = editForm.account_id || null
    payload.target_date = editForm.target_date || null

    const res = await fetch('/api/goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setEditSaving(false)
    if (res.ok) {
      const updated = await res.json()
      setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)).sort((a, b) => a.priority - b.priority))
      setEditingGoal(null)
      toast.success('Goal updated.')
    } else {
      toast.error('Could not save. Check your connection and try again.')
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      name: form.name,
      goal_amount: Number(form.goal_amount),
      current_amount: form.current_amount ? Number(form.current_amount) : 0,
      account_id: form.account_id || undefined,
      target_date: form.target_date || undefined,
      priority: Number(form.priority),
    }

    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (res.ok) {
      const newGoal = await res.json()
      setGoals((prev) => [...prev, newGoal].sort((a, b) => a.priority - b.priority))
      setForm(EMPTY_FORM)
      setTouched({})
      setShowForm(false)
      toast.success('Goal added.')
    } else {
      toast.error('Could not save. Check your connection and try again.')
    }
  }

  async function handleAchieve(goal: SavingsGoal) {
    setAchieving(true)
    const res = await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' })
    setAchieving(false)

    if (res.ok) {
      setGoals((prev) => prev.filter((g) => g.id !== goal.id))
      setConfirmAchieve(null)
      setCelebratingGoal(goal)
    } else {
      toast.error('Could not mark goal as achieved. Check your connection and try again.')
      setConfirmAchieve(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--quill-ink)' }}>Savings goals</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReversed((r) => !r)}
            className="text-xs px-2 py-1 rounded-sm transition-colors hover:opacity-70"
            style={{ color: 'var(--quill-muted)' }}
          >
            {reversed ? '↑ Default order' : '↓ Reverse'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs px-3 py-1.5 rounded-sm"
            style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
          >
            + Add goal
          </button>
        </div>
      </div>

      {/* ── Celebration card — shown after a goal is marked achieved ──── */}
      {celebratingGoal && (
        <div
          className="border p-5 mb-6"
          style={{ borderColor: 'var(--quill-green)', background: 'var(--quill-green-bg)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p
                className="text-base font-semibold mb-1"
                style={{ color: 'var(--quill-green)' }}
              >
                ✓ {celebratingGoal.name} achieved.
              </p>
              <p className="text-sm" style={{ color: 'var(--quill-ink)' }}>
                You hit your{' '}
                <span className="font-mono font-semibold">
                  {formatCurrency(celebratingGoal.goal_amount)}
                </span>{' '}
                goal.
              </p>
              {kofiUrl && (
                <p className="text-xs mt-3" style={{ color: 'var(--quill-muted)' }}>
                  OpenQuill helped you stay on track. If it&apos;s been useful,{' '}
                  <a
                    href={kofiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: 'var(--quill-green)' }}
                  >
                    support development on Ko-fi →
                  </a>
                </p>
              )}
            </div>
            <button
              onClick={() => setCelebratingGoal(null)}
              className="text-xs shrink-0"
              style={{ color: 'var(--quill-muted)' }}
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {goals.length === 0 && !showForm && !celebratingGoal && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--quill-muted)' }}>
            Track savings goals here — emergency fund, vacation, down payment, anything. Link a savings account to see your current progress automatically.
          </p>
        )}

        {(reversed ? [...goals].reverse() : goals).map((goal) => {
          const linked = savingsAccounts.find((a) => a.id === goal.account_id)
          const current = linked ? linked.balance : (goal.current_amount ?? 0)
          const pct = Math.min(100, (current / goal.goal_amount) * 100)
          const remaining = Math.max(0, goal.goal_amount - current)
          const isConfirming = confirmAchieve === goal.id

          return (
            <div
              key={goal.id}
              className="border rounded-sm p-5 quill-card-lift cursor-pointer"
              style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
              onClick={() => openEdit(goal)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEdit(goal) } }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--quill-ink)' }}>{goal.name}</p>
                  {linked ? (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--quill-muted)' }}>
                      via {linked.name}
                    </p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--quill-muted)' }}>
                      Manual tracking
                    </p>
                  )}
                  {goal.target_date && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--quill-muted)' }}>
                      Target: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono" style={{ color: 'var(--quill-muted)' }}>
                    {formatCurrency(current)} / {formatCurrency(goal.goal_amount)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--quill-green)' }}>
                    {pct.toFixed(0)}% funded
                  </p>
                </div>
              </div>

              {/* Progress bar with milestone markers */}
              <div
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${goal.name}: ${Math.round(pct)}% funded`}
                className="relative h-1 w-full overflow-hidden"
                style={{ background: 'var(--quill-rule)' }}
              >
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${pct}%`, background: 'var(--quill-green)' }}
                />
                {/* Milestone ticks at 25%, 50%, 75% */}
                {[25, 50, 75].map((milestone) => (
                  <div
                    key={milestone}
                    aria-hidden="true"
                    className="absolute top-0 bottom-0 w-px"
                    style={{
                      left: `${milestone}%`,
                      background: pct >= milestone ? 'var(--quill-cream)' : 'var(--quill-rule)',
                      opacity: pct >= milestone ? 0.6 : 1,
                      zIndex: 1,
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between mt-2">
                <p className="text-xs" style={{ color: 'var(--quill-muted)' }}>
                  {remaining > 0
                    ? `${formatCurrency(remaining)} remaining`
                    : 'Goal reached.'}
                </p>

                {/* Mark achieved action */}
                {!isConfirming ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmAchieve(goal.id) }}
                    className="text-xs hover:underline"
                    style={{ color: 'var(--quill-muted)' }}
                  >
                    Mark achieved
                  </button>
                ) : (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs" style={{ color: 'var(--quill-muted)' }}>
                      Mark {goal.name} as achieved?
                    </span>
                    <button
                      onClick={() => handleAchieve(goal)}
                      disabled={achieving}
                      className="text-xs px-2 py-1 rounded-sm font-medium"
                      style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
                    >
                      {achieving ? '...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setConfirmAchieve(null)}
                      className="text-xs px-2 py-1 rounded-sm border"
                      style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit goal dialog */}
      <Dialog open={!!editingGoal} onOpenChange={(open) => { if (!open) setEditingGoal(null) }}>
        <DialogContent style={{ background: 'var(--quill-cream)', borderColor: 'var(--quill-rule)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--quill-ink)' }}>Edit goal</DialogTitle>
            <DialogDescription>
              Update your savings target, linked account, or target date.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            {[
              { label: 'Goal name', key: 'name', type: 'text', placeholder: 'Emergency fund' },
              { label: 'Target amount', key: 'goal_amount', type: 'number', placeholder: '10000' },
              { label: 'Priority (1 = highest)', key: 'priority', type: 'number', placeholder: '1' },
            ].map(({ label, key, type, placeholder }, idx) => (
              <div key={key}>
                <label
                  htmlFor={`edit-goal-${key}`}
                  className="block text-xs font-medium mb-1 tracking-wide uppercase"
                  style={{ color: 'var(--quill-muted)' }}
                >
                  {label}
                </label>
                <input
                  id={`edit-goal-${key}`}
                  type={type}
                  step={type === 'number' ? '0.01' : undefined}
                  required={key === 'name' || key === 'goal_amount'}
                  autoFocus={idx === 0}
                  value={editForm[key as keyof typeof editForm]}
                  onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 text-sm border rounded-sm focus:outline-none"
                  style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                />
              </div>
            ))}

            {savingsAccounts.length > 0 && (
              <div>
                <label
                  className="block text-xs font-medium mb-1 tracking-wide uppercase"
                  style={{ color: 'var(--quill-muted)' }}
                >
                  Link to account (optional)
                </label>
                <Select
                  value={editForm.account_id || '__none__'}
                  onValueChange={(val) => setEditForm({ ...editForm, account_id: val === '__none__' ? '' : val })}
                >
                  <SelectTrigger
                    className="w-full px-3 py-2 text-sm border rounded-sm"
                    style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: 'var(--quill-cream)', borderColor: 'var(--quill-rule)' }}>
                    <SelectItem value="__none__">None — track manually</SelectItem>
                    {savingsAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!editForm.account_id && (
              <div>
                <label
                  htmlFor="edit-goal-current_amount"
                  className="block text-xs font-medium mb-1 tracking-wide uppercase"
                  style={{ color: 'var(--quill-muted)' }}
                >
                  Amount saved so far
                </label>
                <input
                  id="edit-goal-current_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.current_amount}
                  onChange={(e) => setEditForm({ ...editForm, current_amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border rounded-sm focus:outline-none"
                  style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--quill-muted)' }}>
                  Update this whenever you add to your savings.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="edit-goal-target_date"
                className="block text-xs font-medium mb-1 tracking-wide uppercase"
                style={{ color: 'var(--quill-muted)' }}
              >
                Target date (optional)
              </label>
              <input
                id="edit-goal-target_date"
                type="date"
                value={editForm.target_date}
                onChange={(e) => setEditForm({ ...editForm, target_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-sm focus:outline-none"
                style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={editSaving}
                className="flex-1 py-2.5 text-sm font-medium rounded-sm"
                style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
              >
                {editSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Saving…
                  </span>
                ) : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => setEditingGoal(null)}
                className="px-4 py-2.5 text-sm rounded-sm border"
                style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add goal dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setForm(EMPTY_FORM); setTouched({}) } }}>
        <DialogContent style={{ background: 'var(--quill-cream)', borderColor: 'var(--quill-rule)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--quill-ink)' }}>Add savings goal</DialogTitle>
            <DialogDescription>
              Track your progress toward a savings target. Link a savings account to see current balance automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-2">
            {[
              { label: 'Goal name', key: 'name', type: 'text', placeholder: 'Emergency fund', required: true },
              { label: 'Target amount', key: 'goal_amount', type: 'number', placeholder: '10000', required: true },
              { label: 'Priority (1 = highest)', key: 'priority', type: 'number', placeholder: '1', required: false },
            ].map(({ label, key, type, placeholder, required }, idx) => (
              <div key={key}>
                <label
                  htmlFor={`goal-${key}`}
                  className="block text-xs font-medium mb-1 tracking-wide uppercase"
                  style={{ color: 'var(--quill-muted)' }}
                >
                  {label}
                </label>
                <input
                  id={`goal-${key}`}
                  type={type}
                  step={type === 'number' ? '0.01' : undefined}
                  required={required || ['name', 'goal_amount'].includes(key)}
                  autoFocus={idx === 0}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  onBlur={['name', 'goal_amount'].includes(key) ? () => handleBlur(key) : undefined}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 text-sm border rounded-sm focus:outline-none"
                  style={{
                    borderColor: ['name', 'goal_amount'].includes(key) && touched[key] && !form[key as keyof typeof form]
                      ? 'var(--quill-red)'
                      : 'var(--quill-rule)',
                    background: 'var(--quill-cream)',
                    color: 'var(--quill-ink)',
                  }}
                />
                {['name', 'goal_amount'].includes(key) && touched[key] && !form[key as keyof typeof form] && (
                  <p className="text-xs mt-1" style={{ color: 'var(--quill-red)' }}>Required</p>
                )}
              </div>
            ))}

            {savingsAccounts.length > 0 && (
              <div>
                <label
                  className="block text-xs font-medium mb-1 tracking-wide uppercase"
                  style={{ color: 'var(--quill-muted)' }}
                >
                  Link to account (optional)
                </label>
                <Select
                  value={form.account_id || '__none__'}
                  onValueChange={(val) => setForm({ ...form, account_id: val === '__none__' ? '' : val })}
                >
                  <SelectTrigger
                    className="w-full px-3 py-2 text-sm border rounded-sm"
                    style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: 'var(--quill-cream)', borderColor: 'var(--quill-rule)' }}>
                    <SelectItem value="__none__">None — track manually</SelectItem>
                    {savingsAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!form.account_id && (
              <div>
                <label
                  htmlFor="goal-current_amount"
                  className="block text-xs font-medium mb-1 tracking-wide uppercase"
                  style={{ color: 'var(--quill-muted)' }}
                >
                  Amount saved so far (optional)
                </label>
                <input
                  id="goal-current_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.current_amount}
                  onChange={(e) => setForm({ ...form, current_amount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border rounded-sm focus:outline-none"
                  style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                />
              </div>
            )}

            <div>
              <label
                htmlFor="goal-target_date"
                className="block text-xs font-medium mb-1 tracking-wide uppercase"
                style={{ color: 'var(--quill-muted)' }}
              >
                Target date (optional)
              </label>
              <input
                id="goal-target_date"
                type="date"
                value={form.target_date}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-sm focus:outline-none"
                style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-medium rounded-sm"
                style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Saving…
                  </span>
                ) : 'Add goal'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setTouched({}) }}
                className="px-4 py-2.5 text-sm rounded-sm border"
                style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
