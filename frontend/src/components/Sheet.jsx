import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

/** Accessible bottom sheet (phone) / centered modal (desktop) built on native <dialog>. */
export default function Sheet({ open, onClose, title, children, footer }) {
  const ref = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      className="mx-0 mt-auto mb-0 w-full max-w-none rounded-t-3xl bg-white p-0 text-zinc-900 shadow-2xl dark:bg-zinc-900 dark:text-zinc-100 sm:m-auto sm:max-w-md sm:rounded-3xl"
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700 sm:hidden" aria-hidden="true" />
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 grid size-11 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 pb-4">{children}</div>
          {footer && (
            <div className="pb-safe border-t border-zinc-200 px-5 pt-3 dark:border-zinc-800">{footer}</div>
          )}
        </div>
      )}
    </dialog>
  )
}
