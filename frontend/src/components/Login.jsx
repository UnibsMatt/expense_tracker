import { useState } from 'react'
import { Eye, EyeOff, Loader2, LogIn, Wallet } from 'lucide-react'
import { api, setToken } from '../api'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { access_token } = await api('/auth/login', { method: 'POST', body: { username, password } })
      setToken(access_token)
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const input = 'h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base dark:border-zinc-700 dark:bg-zinc-950'

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
            <Wallet className="size-8" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Expense Tracker</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Sign in to track your monthly spending</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-medium">Username</label>
            <input id="username" className={input} value={username} onChange={(e) => setUsername(e.target.value)}
              autoComplete="username" autoCapitalize="none" autoCorrect="off" required />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
            <div className="relative">
              <input id="password" type={show ? 'text' : 'password'} className={`${input} pr-12`} value={password}
                onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              <button type="button" onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center text-zinc-500">
                {show ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>
          )}
          <button type="submit" disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
            {loading ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <LogIn className="size-5" aria-hidden="true" />}
            Sign in
          </button>
        </form>
      </div>
    </main>
  )
}
