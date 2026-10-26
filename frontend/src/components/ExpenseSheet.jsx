import { useState } from 'react'
import { Check, Loader2, Mic, Trash2 } from 'lucide-react'
import Sheet from './Sheet'
import CategoryIcon from './CategoryIcon'
import { parseAmount } from '../utils'

/** Add / edit an expense. `draft` is null when closed. */
export default function ExpenseSheet({ draft, categories, onClose, onSave, onDelete }) {
  return (
    <Sheet open={!!draft} onClose={onClose} title={draft?.id ? 'Edit expense' : 'New expense'}>
      {draft && (
        <ExpenseForm key={draft.key} draft={draft} categories={categories} onSave={onSave} onDelete={onDelete} />
      )}
    </Sheet>
  )
}

function ExpenseForm({ draft, categories, onSave, onDelete }) {
  const [amount, setAmount] = useState(draft.amount != null ? draft.amount.toFixed(2).replace('.', ',') : '')
  const [description, setDescription] = useState(draft.description || '')
  const [categoryId, setCategoryId] = useState(draft.category_id ?? null)
  const [date, setDate] = useState(draft.date)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (!(value > 0)) {
      setError('Enter an amount greater than 0')
      return
    }
    setBusy(true)
    try {
      await onSave({ id: draft.id, amount: Math.round(value * 100) / 100, description, category_id: categoryId, date })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm('Delete this expense?')) return
    setBusy(true)
    try { await onDelete(draft.id) } catch (err) { setError(err.message); setBusy(false) }
  }

  const field = 'h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base dark:border-zinc-700 dark:bg-zinc-950'

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {draft.transcript && (
        <p className="flex items-start gap-2 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200">
          <Mic className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span><span className="sr-only">Heard: </span>“{draft.transcript}”</span>
        </p>
      )}

      <div>
        <label htmlFor="amount" className="mb-1.5 block text-sm font-medium">Amount</label>
        <div className="relative">
          <input id="amount" inputMode="decimal" autoComplete="off" value={amount}
            onChange={(e) => { setAmount(e.target.value.replace(/[^\d.,]/g, '')); setError('') }}
            placeholder="0,00" aria-invalid={!!error} aria-describedby={error ? 'amount-error' : undefined}
            autoFocus={draft.amount == null}
            className="h-16 w-full rounded-2xl border border-zinc-300 bg-white pr-12 pl-4 text-3xl font-bold tabular-nums dark:border-zinc-700 dark:bg-zinc-950" />
          <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-2xl font-semibold text-zinc-400" aria-hidden="true">€</span>
        </div>
        {error && <p id="amount-error" role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium">Description</label>
        <input id="description" className={field} value={description} maxLength={200}
          onChange={(e) => setDescription(e.target.value)} placeholder="What was it for?" />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Category</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {categories.map((c) => {
            const selected = categoryId === c.id
            return (
              <button key={c.id} type="button" role="radio" aria-checked={selected}
                onClick={() => setCategoryId(selected ? null : c.id)}
                className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-2 text-xs font-medium transition ${
                  selected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'border-transparent bg-zinc-100 dark:bg-zinc-800'}`}>
                <CategoryIcon category={c} size="sm" />
                <span className="line-clamp-1 break-all">{c.name}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="date" className="mb-1.5 block text-sm font-medium">Date</label>
        <input id="date" type="date" className={field} value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>

      <div className="flex gap-3 pt-1">
        {draft.id && (
          <button type="button" onClick={remove} disabled={busy} aria-label="Delete expense"
            className="grid h-12 w-14 place-items-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400">
            <Trash2 className="size-5" aria-hidden="true" />
          </button>
        )}
        <button type="submit" disabled={busy}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Check className="size-5" aria-hidden="true" />}
          Save
        </button>
      </div>
    </form>
  )
}
