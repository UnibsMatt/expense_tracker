import { colorOf } from './CategoryIcon'
import { daysInMonth, formatEUR, todayISO } from '../utils'

export default function Summary({ month, expenses, categories, filter, onFilter }) {
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const byId = Object.fromEntries(categories.map((c) => [c.id, c]))
  const groups = {}
  for (const e of expenses) {
    const k = e.category_id ?? 'none'
    groups[k] = (groups[k] || 0) + e.amount
  }
  const rows = Object.entries(groups)
    .map(([k, sum]) => ({ id: k === 'none' ? null : Number(k), sum, cat: byId[k] }))
    .sort((a, b) => b.sum - a.sum)

  const today = todayISO()
  const days = month === today.slice(0, 7) ? Number(today.slice(8, 10)) : daysInMonth(month)
  const perDay = total / Math.max(days, 1)

  return (
    <section aria-labelledby="summary-title"
      className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-600/20">
      <h2 id="summary-title" className="text-sm font-medium text-indigo-100">Spent this month</h2>
      <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">{formatEUR(total)}</p>
      <p className="mt-1 text-sm text-indigo-100">
        {expenses.length} expense{expenses.length === 1 ? '' : 's'} · {formatEUR(perDay)} / day
      </p>

      {rows.length > 0 && (
        <>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
            {rows.map((r) => (
              <span key={r.id ?? 'none'} className={`${colorOf(r.cat?.color).dot} border-r border-white/30 last:border-0`}
                style={{ width: `${(r.sum / total) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Filter by category">
            {rows.map((r) => {
              const active = filter === r.id
              return (
                <li key={r.id ?? 'none'}>
                  <button type="button" aria-pressed={active} onClick={() => onFilter(active ? undefined : r.id)}
                    className={`flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                      active ? 'bg-white text-indigo-700' : 'bg-white/15 text-white hover:bg-white/25'}`}>
                    <span className={`size-2 rounded-full ${colorOf(r.cat?.color).dot}`} aria-hidden="true" />
                    {r.cat?.name || 'Uncategorized'}
                    <span className="tabular-nums opacity-80">{Math.round((r.sum / total) * 100)}%</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
