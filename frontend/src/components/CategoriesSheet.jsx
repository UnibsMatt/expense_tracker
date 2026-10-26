import { useState } from 'react'
import { ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'
import Sheet from './Sheet'
import CategoryIcon, { COLORS, ICONS } from './CategoryIcon'

export default function CategoriesSheet({ open, onClose, categories, onSave, onDelete }) {
  const [editing, setEditing] = useState(null) // category object, {} for new, or null for list

  function close() {
    setEditing(null)
    onClose()
  }

  return (
    <Sheet open={open} onClose={close} title={editing ? (editing.id ? 'Edit category' : 'New category') : 'Categories'}>
      {editing ? (
        <CategoryForm key={editing.id ?? 'new'} category={editing} onCancel={() => setEditing(null)}
          onSave={async (c) => { await onSave(c); setEditing(null) }}
          onDelete={async (id) => { await onDelete(id); setEditing(null) }} />
      ) : (
        <div className="space-y-2">
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {categories.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setEditing(c)}
                  className="flex min-h-14 w-full items-center gap-3 py-2 text-left">
                  <CategoryIcon category={c} />
                  <span className="flex-1 font-medium">{c.name}</span>
                  <ChevronRight className="size-5 text-zinc-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setEditing({})}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            <Plus className="size-5" aria-hidden="true" /> Add category
          </button>
        </div>
      )}
    </Sheet>
  )
}

function CategoryForm({ category, onCancel, onSave, onDelete }) {
  const [name, setName] = useState(category.name || '')
  const [icon, setIcon] = useState(category.icon || 'tag')
  const [color, setColor] = useState(category.color || 'indigo')
  const [keywords, setKeywords] = useState(category.keywords || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(fn) {
    setBusy(true)
    setError('')
    try { await fn() } catch (err) { setError(err.message); setBusy(false) }
  }

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required')
    run(() => onSave({ id: category.id, name: name.trim(), icon, color, keywords }))
  }

  const remove = () => {
    if (window.confirm(`Delete “${category.name}”? Its expenses will become uncategorized.`)) run(() => onDelete(category.id))
  }

  const field = 'h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base dark:border-zinc-700 dark:bg-zinc-950'

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-3">
        <CategoryIcon category={{ icon, color }} />
        <div className="flex-1">
          <label htmlFor="cat-name" className="sr-only">Name</label>
          <input id="cat-name" className={field} value={name} maxLength={50} placeholder="Category name"
            onChange={(e) => setName(e.target.value)} autoFocus={!category.id} />
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Icon</legend>
        <div className="grid grid-cols-6 gap-2" role="radiogroup">
          {Object.entries(ICONS).map(([key, Icon]) => (
            <button key={key} type="button" role="radio" aria-checked={icon === key} aria-label={key.replace(/-/g, ' ')}
              onClick={() => setIcon(key)}
              className={`grid aspect-square place-items-center rounded-xl border-2 ${
                icon === key ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'border-transparent bg-zinc-100 dark:bg-zinc-800'}`}>
              <Icon className="size-5" aria-hidden="true" />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {Object.entries(COLORS).map(([key, c]) => (
            <button key={key} type="button" role="radio" aria-checked={color === key} aria-label={key}
              onClick={() => setColor(key)}
              className={`size-11 rounded-full ${c.dot} ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 ${color === key ? 'ring-3 ring-zinc-900 dark:ring-white' : ''}`} />
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="cat-kw" className="mb-1.5 block text-sm font-medium">Voice keywords</label>
        <textarea id="cat-kw" rows={2} value={keywords} onChange={(e) => setKeywords(e.target.value)}
          aria-describedby="cat-kw-help" placeholder="restaurant, pizza, lunch"
          className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-950" />
        <p id="cat-kw-help" className="mt-1 text-xs text-zinc-500">Comma-separated words that pick this category when you speak.</p>
      </div>

      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3">
        {category.id && (
          <button type="button" onClick={remove} disabled={busy} aria-label="Delete category"
            className="grid h-12 w-14 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <Trash2 className="size-5" aria-hidden="true" />
          </button>
        )}
        <button type="button" onClick={onCancel}
          className="h-12 flex-1 rounded-xl bg-zinc-100 font-medium dark:bg-zinc-800">Back</button>
        <button type="submit" disabled={busy}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white disabled:opacity-60">
          {busy && <Loader2 className="size-5 animate-spin" aria-hidden="true" />} Save
        </button>
      </div>
    </form>
  )
}
