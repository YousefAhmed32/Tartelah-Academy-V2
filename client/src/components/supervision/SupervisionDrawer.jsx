import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function SupervisionDrawer({ title, onClose, children }) {
  const panel = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector('button')?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') closeRef.current()
      if (event.key !== 'Tab') return
      const elements = [...panel.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]')]
      if (!elements.length) return
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; previous?.focus?.() }
  }, [])
  return <div className="fixed inset-0 z-50 bg-gray-950/45" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside ref={panel} dir="rtl" role="dialog" aria-modal="true" aria-label={title} className="fixed inset-y-0 right-0 flex h-full w-full max-w-[460px] flex-col bg-white shadow-2xl">
      <header className="flex items-center justify-between gap-3 border-b border-gray-100 p-4 sm:p-5"><h2 className="font-heading text-lg font-extrabold text-gray-950">{title}</h2><button type="button" onClick={onClose} aria-label="إغلاق" className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"><X size={19} aria-hidden="true" /></button></header>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">{children}</div>
    </aside>
  </div>
}
