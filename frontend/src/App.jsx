import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Languages, Loader2, LogOut, Mic, Plus, SendHorizontal, Square, Tags, Wallet } from 'lucide-react'
import { api, getToken, setToken } from './api'
import { useSpeech } from './useSpeech'
import { currentMonth, monthLabel, shiftMonth, todayISO } from './utils'
import Login from './components/Login'
import Summary from './components/Summary'
import ExpenseList from './components/ExpenseList'
import ExpenseSheet from './components/ExpenseSheet'
import CategoriesSheet from './components/CategoriesSheet'

const SPEECH_ERRORS = {
  unsupported: 'Voice input is not supported in this browser. Type the expense instead.',
  'not-allowed': 'Microphone access was denied. Allow it in your browser settings.',
  'service-not-allowed': 'Microphone access was denied. Allow it in your browser settings.',
  'no-speech': 'Nothing heard. Try again.',
  network: 'Speech recognition needs an internet connection.',
  'audio-capture': 'No microphone found.',
}

// Voice languages, cycled by the header button. The first one is the default.
const LANGS = [
  { code: 'it-IT', short: 'IT', name: 'Italiano', example: 'spesa 23 euro e 50' },
  { code: 'fr-FR', short: 'FR', name: 'Français', example: 'courses 23 euros 50' },
  { code: 'en-US', short: 'EN', name: 'English', example: 'lunch 12.50' },
]
const LANG_KEY = 'et_voice_lang'

function readPref(key, fallback) {
  try { return localStorage.getItem(key) || fallback } catch { return fallback }
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken())

  useEffect(() => {
    const onLogout = () => setAuthed(false)
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [])

  if (!authed) return <Login onLogin={() => setAuthed(true)} />
  return <Tracker onLogout={() => { setToken(null); setAuthed(false) }} />
}

function Tracker({ onLogout }) {
  const [month, setMonth] = useState(currentMonth())
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(undefined) // undefined = all, null = uncategorized
  const [draft, setDraft] = useState(null)
  const [showCats, setShowCats] = useState(false)
  const [quick, setQuick] = useState('')
  const [parsing, setParsing] = useState(false)
  const [toast, setToast] = useState('')
  const [lang, setLang] = useState(() => {
    const saved = readPref(LANG_KEY, LANGS[0].code)
    return LANGS.some((l) => l.code === saved) ? saved : LANGS[0].code
  })
  const langInfo = LANGS.find((l) => l.code === lang)
  const speech = useSpeech(lang)
  const toastTimer = useRef()

  const notify = useCallback((msg) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 4000)
  }, [])

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    try { setExpenses(await api(`/expenses?month=${month}`)) }
    catch (e) { notify(e.message) }
    finally { setLoading(false) }
  }, [month, notify])

  useEffect(() => { loadExpenses() }, [loadExpenses])
  useEffect(() => { api('/categories').then(setCategories).catch((e) => notify(e.message)) }, [notify])
  useEffect(() => { setFilter(undefined) }, [month])

  function toggleLang() {
    const next = LANGS[(LANGS.findIndex((l) => l.code === lang) + 1) % LANGS.length].code
    setLang(next)
    try { localStorage.setItem(LANG_KEY, next) } catch { /* ignore */ }
  }

  function defaultDate() {
    return month === currentMonth() ? todayISO() : `${month}-01`
  }

  function openNew(fields = {}) {
    setDraft({ key: Date.now(), date: defaultDate(), ...fields })
  }

  async function handleText(text) {
    setParsing(true)
    try {
      const r = await api('/parse', { method: 'POST', body: { text, lang } })
      openNew({ amount: r.amount, description: r.description, category_id: r.category_id, transcript: text })
    } catch (e) {
      notify(e.message)
    } finally {
      setParsing(false)
    }
  }

  function toggleMic() {
    if (speech.listening) return speech.stop()
    if (!speech.supported) return notify(SPEECH_ERRORS.unsupported)
    speech.start({
      onResult: handleText,
      onError: (err) => notify(SPEECH_ERRORS[err] || `Voice error: ${err}`),
    })
  }

  function submitQuick(e) {
    e.preventDefault()
    const text = quick.trim()
    if (!text) return
    setQuick('')
    handleText(text)
  }

  async function saveExpense({ id, ...body }) {
    await api(id ? `/expenses/${id}` : '/expenses', { method: id ? 'PUT' : 'POST', body })
    setDraft(null)
    if (body.date.slice(0, 7) !== month) setMonth(body.date.slice(0, 7))
    else await loadExpenses()
    notify(id ? 'Expense updated' : 'Expense added')
  }

  async function deleteExpense(id) {
    await api(`/expenses/${id}`, { method: 'DELETE' })
    setDraft(null)
    setExpenses((list) => list.filter((e) => e.id !== id))
    notify('Expense deleted')
  }

  async function saveCategory({ id, ...body }) {
    const saved = await api(id ? `/categories/${id}` : '/categories', { method: id ? 'PUT' : 'POST', body })
    setCategories((list) => (id ? list.map((c) => (c.id === id ? saved : c)) : [...list, saved]))
  }

  async function deleteCategory(id) {
    await api(`/categories/${id}`, { method: 'DELETE' })
    setCategories((list) => list.filter((c) => c.id !== id))
    setExpenses((list) => list.map((e) => (e.category_id === id ? { ...e, category_id: null } : e)))
  }

  const visible = filter === undefined ? expenses : expenses.filter((e) => (e.category_id ?? null) === filter)
  const iconBtn = 'grid size-11 place-items-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'

  return (
    <div className="min-h-dvh pb-36">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>

      <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-zinc-50/85 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/85">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
          <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white">
            <Wallet className="size-5" aria-hidden="true" />
          </span>
          <h1 className="flex-1 text-lg font-bold tracking-tight">Expenses</h1>
          <button type="button" onClick={toggleLang} className="flex h-11 items-center gap-1 rounded-full px-3 text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label={`Voice language: ${langInfo.name}. Tap to switch.`}>
            <Languages className="size-4" aria-hidden="true" />{langInfo.short}
          </button>
          <button type="button" onClick={() => setShowCats(true)} className={iconBtn} aria-label="Manage categories">
            <Tags className="size-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={onLogout} className={iconBtn} aria-label="Sign out">
            <LogOut className="size-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-lg space-y-5 px-4 pt-4">
        <nav aria-label="Month" className="flex items-center justify-between">
          <button type="button" onClick={() => setMonth((m) => shiftMonth(m, -1))} className={iconBtn} aria-label="Previous month">
            <ChevronLeft className="size-6" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setMonth(currentMonth())} className="rounded-full px-4 py-2 text-base font-semibold"
            aria-live="polite" title="Go to current month">
            {monthLabel(month)}
          </button>
          <button type="button" onClick={() => setMonth((m) => shiftMonth(m, 1))} className={iconBtn} aria-label="Next month">
            <ChevronRight className="size-6" aria-hidden="true" />
          </button>
        </nav>

        <Summary month={month} expenses={expenses} categories={categories} filter={filter} onFilter={setFilter} />
        <ExpenseList expenses={visible} categories={categories} loading={loading}
          onSelect={(e) => setDraft({ ...e, key: e.id })} />
      </main>

      {/* Voice / quick-add bar */}
      <form onSubmit={submitQuick}
        className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/90 px-4 pt-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button type="button" onClick={() => openNew()} aria-label="Add expense manually"
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <Plus className="size-6" aria-hidden="true" />
          </button>
          <label htmlFor="quick" className="sr-only">Describe an expense, for example lunch 12,50</label>
          <input id="quick" value={quick} onChange={(e) => setQuick(e.target.value)} enterKeyHint="send"
            autoComplete="off" placeholder={`“${langInfo.example}” or tap the mic`}
            className="h-12 min-w-0 flex-1 rounded-2xl border border-zinc-300 bg-white px-4 text-base dark:border-zinc-700 dark:bg-zinc-950" />
          {quick.trim() ? (
            <button type="submit" aria-label="Add expense from text" disabled={parsing}
              className="grid size-14 shrink-0 place-items-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
              {parsing ? <Loader2 className="size-6 animate-spin" aria-hidden="true" /> : <SendHorizontal className="size-6" aria-hidden="true" />}
            </button>
          ) : (
            <button type="button" onClick={toggleMic} disabled={parsing}
              aria-label={speech.listening ? 'Stop listening' : 'Add expense by voice'} aria-pressed={speech.listening}
              className={`relative grid size-14 shrink-0 place-items-center rounded-full text-white shadow-lg transition ${
                speech.listening ? 'bg-red-500 shadow-red-500/30' : 'bg-indigo-600 shadow-indigo-600/30'}`}>
              {speech.listening && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/60" aria-hidden="true" />}
              {parsing ? <Loader2 className="relative size-6 animate-spin" aria-hidden="true" />
                : speech.listening ? <Square className="relative size-5 fill-current" aria-hidden="true" />
                  : <Mic className="relative size-6" aria-hidden="true" />}
            </button>
          )}
        </div>
      </form>

      {/* Listening overlay */}
      {speech.listening && (
        <div className="fixed inset-x-0 bottom-28 z-30 flex justify-center px-4" role="status" aria-live="polite">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 px-5 py-4 text-white shadow-2xl dark:bg-white dark:text-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-400 dark:text-red-500">
              Listening ({langInfo.name})…
            </p>
            <p className="mt-1 min-h-6 text-lg">{speech.interim || `Say e.g. “${langInfo.example}”`}</p>
          </div>
        </div>
      )}

      {/* Toast */}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4rem)] z-40 flex justify-center px-4">
        {toast && (
          <p className="rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-zinc-900">{toast}</p>
        )}
      </div>

      <ExpenseSheet draft={draft} categories={categories} onClose={() => setDraft(null)}
        onSave={saveExpense} onDelete={deleteExpense} />
      <CategoriesSheet open={showCats} onClose={() => setShowCats(false)} categories={categories}
        onSave={saveCategory} onDelete={deleteCategory} />
    </div>
  )
}
