import { Mic } from 'lucide-react'
import CategoryIcon from './CategoryIcon'
import { dayLabel, formatEUR } from '../utils'

export default function ExpenseList({ expenses, categories, onSelect, loading, example }) {
  const byId = Object.fromEntries(categories.map((c) => [c.id, c]))

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading expenses">
        {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />)}
      </div>
    )
  }

  if (!expenses.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-zinc-200 px-6 py-12 text-center dark:border-zinc-800">
        <span className="grid size-14 place-items-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
          <Mic className="size-6" aria-hidden="true" />
        </span>
        <p className="font-medium">No expenses yet</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Tap the microphone and say<br />“{example}”</p>
      </div>
    )
  }

  const days = []
  for (const e of expenses) {
    const last = days[days.length - 1]
    if (last && last.date === e.date) last.items.push(e)
    else days.push({ date: e.date, items: [e] })
  }

  return (
    <div className="space-y-5">
      {days.map((d) => (
        <section key={d.date} aria-labelledby={`day-${d.date}`}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h3 id={`day-${d.date}`} className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{dayLabel(d.date)}</h3>
            <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
              {formatEUR(d.items.reduce((s, e) => s + e.amount, 0))}
            </span>
          </div>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200 dark:divide-zinc-800 dark:bg-zinc-900 dark:ring-zinc-800">
            {d.items.map((e) => {
              const cat = byId[e.category_id]
              return (
                <li key={e.id}>
                  <button type="button" onClick={() => onSelect(e)}
                    className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <CategoryIcon category={cat} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.description || cat?.name || 'Expense'}</span>
                      <span className="block truncate text-sm text-zinc-500 dark:text-zinc-400">{cat?.name || 'Uncategorized'}</span>
                    </span>
                    <span className="font-semibold tabular-nums">−{formatEUR(e.amount)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
