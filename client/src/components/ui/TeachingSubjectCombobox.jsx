import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTeachingSubjects, useCreateTeachingSubject } from '../../hooks/useTeachingSubjects.js'
import { useAuthStore } from '../../store/authStore.js'

let uid = 0
function useStableId(prefix) {
  const ref = useRef(null)
  if (!ref.current) ref.current = `${prefix}-${++uid}`
  return ref.current
}

/**
 * Searchable, creatable single-select combobox for the dynamic
 * teaching-subject/curriculum catalog (replaces every static curriculum
 * dropdown — see hooks/useTeachingSubjects.js). Data always comes from the
 * live backend catalog, never a duplicated frontend constant.
 *
 * Flow: search existing subjects → type a name with no exact match → a
 * "إضافة ... كمنهج جديد" action appears → Enter/click creates it exactly
 * once (never on every keystroke) → the new subject is selected immediately
 * and available everywhere else after the query cache is invalidated.
 */
export default function TeachingSubjectCombobox({
  value, onChange, label = 'المنهج/التخصص', required = false, placeholder = 'ابحث أو اختر منهجًا...',
  allowCreate, disabled = false, error,
}) {
  const { hasPermission } = useAuthStore()
  const canCreate = allowCreate !== undefined ? allowCreate : hasPermission('curricula.manage')
  const { data: subjects = [], isLoading } = useTeachingSubjects()
  const createMutation = useCreateTeachingSubject()

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const listboxId = useStableId('subject-listbox')
  const inputId = useStableId('subject-input')

  const selected = subjects.find((s) => s.key === value) || null

  // Reflect the selected subject's label in the input while closed/idle;
  // once the user starts typing, `query` becomes the live search term.
  // Deliberately depends on selected's fields, not the object itself —
  // `.find()` returns a new reference every render, which would re-fire this
  // effect on every render and fight the user's typing.
  useEffect(() => {
    if (!open) setQuery(selected ? selected.nameAr : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.key, selected?.nameAr, open])

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const trimmedQuery = query.trim()
  const filtered = useMemo(() => {
    if (!trimmedQuery) return subjects
    const q = trimmedQuery.toLowerCase()
    return subjects.filter((s) => s.nameAr?.includes(trimmedQuery) || s.nameEn?.toLowerCase().includes(q))
  }, [subjects, trimmedQuery])

  const hasExactMatch = subjects.some((s) => s.nameAr === trimmedQuery || s.nameEn?.toLowerCase() === trimmedQuery.toLowerCase())
  const showCreateRow = canCreate && trimmedQuery.length > 0 && !hasExactMatch && !createMutation.isPending
  // Combined list of selectable rows for keyboard navigation: existing
  // subjects first, the "create new" affordance last.
  const rowCount = filtered.length + (showCreateRow ? 1 : 0)

  function selectSubject(subject) {
    onChange(subject.key)
    setQuery(subject.nameAr)
    setOpen(false)
    inputRef.current?.blur()
  }

  async function handleCreate() {
    if (!trimmedQuery || createMutation.isPending) return
    try {
      const res = await createMutation.mutateAsync({ nameAr: trimmedQuery })
      onChange(res.data.key)
      setQuery(res.data.nameAr)
      setOpen(false)
      toast.success(res.message || 'تم إنشاء المنهج')
    } catch (err) {
      // Preserve the typed text on a recoverable error (e.g. a race where
      // someone else just created the same name) so the admin doesn't lose
      // their input and can just press Enter again.
      toast.error(err?.response?.data?.message || 'تعذّر إنشاء المنهج')
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setHighlighted((h) => Math.min(h + 1, rowCount - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      if (highlighted < filtered.length) {
        const subject = filtered[highlighted]
        if (subject) selectSubject(subject)
      } else if (showCreateRow) {
        handleCreate()
      }
    }
  }

  useEffect(() => { setHighlighted(0) }, [trimmedQuery, open])

  const activeDescendant = open && rowCount > 0
    ? (highlighted < filtered.length ? `${listboxId}-opt-${filtered[highlighted]?.key}` : `${listboxId}-create`)
    : undefined

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <label htmlFor={inputId} className="text-xs font-bold text-gray-500 mb-1 block">
          {label}{required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <div className="relative">
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeDescendant}
          aria-required={required}
          aria-invalid={!!error}
          disabled={disabled || isLoading}
          className={`w-full min-h-[44px] bg-gray-50 border rounded-xl ps-9 pe-9 text-sm outline-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
            error ? 'border-red-400' : 'border-gray-200 focus:border-violet-400'
          }`}
          placeholder={isLoading ? 'جارٍ التحميل...' : placeholder}
          value={query}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onKeyDown={handleKeyDown}
        />
        <ChevronDown size={15} className={`absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {error && <p className="text-xs text-red-600 font-semibold mt-1">{error}</p>}

      {open && !disabled && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-1.5 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1.5"
        >
          {isLoading && (
            <li className="px-3.5 py-3 text-sm text-gray-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> جارٍ التحميل...</li>
          )}
          {!isLoading && !filtered.length && !showCreateRow && (
            <li className="px-3.5 py-3 text-sm text-gray-400">لا توجد نتائج مطابقة</li>
          )}
          {filtered.map((subject, i) => (
            <li
              key={subject.key}
              id={`${listboxId}-opt-${subject.key}`}
              role="option"
              aria-selected={subject.key === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectSubject(subject)}
              onMouseEnter={() => setHighlighted(i)}
              className={`min-h-[44px] px-3.5 flex items-center justify-between gap-2 text-sm cursor-pointer ${
                i === highlighted ? 'bg-violet-50 text-violet-700' : 'text-gray-700'
              }`}
            >
              <span className="truncate">{subject.nameAr}{subject.nameEn ? ` (${subject.nameEn})` : ''}</span>
              {subject.key === value && <Check size={14} className="text-violet-600 flex-none" />}
            </li>
          ))}
          {showCreateRow && (
            <li
              id={`${listboxId}-create`}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCreate}
              onMouseEnter={() => setHighlighted(filtered.length)}
              className={`min-h-[44px] px-3.5 flex items-center gap-2 text-sm font-bold cursor-pointer border-t border-gray-50 ${
                highlighted === filtered.length ? 'bg-violet-50 text-violet-700' : 'text-violet-600'
              }`}
            >
              {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              إضافة &quot;{trimmedQuery}&quot; كمنهج جديد
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
