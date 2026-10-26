const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
export const formatEUR = (n) => eur.format(n || 0)

export function todayISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export const currentMonth = () => todayISO().slice(0, 7)

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number)
  const s = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

export function dayLabel(iso) {
  const today = todayISO()
  const d = new Date(`${iso}T00:00:00`)
  const y = new Date(`${today}T00:00:00`)
  y.setDate(y.getDate() - 1)
  if (iso === today) return 'Today'
  if (d.getTime() === y.getTime()) return 'Yesterday'
  const s = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function parseAmount(str) {
  const n = parseFloat(String(str).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}
